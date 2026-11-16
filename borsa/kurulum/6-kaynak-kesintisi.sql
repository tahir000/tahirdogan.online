-- Borsa Tahtası: veri kaynağı kesintisine dayanıklılık.
-- Supabase panelinde SQL Editor'e yapıştırıp bir kez çalıştırılır. Yeniden çalıştırmak zarar vermez.
--
-- Borsa MCP sunucusu yoğun saatlerde yanıt vermeyebiliyor. Bu dosya iki şey ekler:
--   1. Kaynağın durumu: kaynak yanıt vermediğinde kısa bir süre "kapalı" sayılır; o sürede kimse bekletilmez,
--      eldeki son veri verilir. Süre her başarısız denemede uzar (20 saniyeden 5 dakikaya), ilk başarıda sıfırlanır.
--   2. Yanıt önbelleği: temel oranlar, takvim, analist ve tarama yanıtları saklanır; kaynak kapalıyken eskisi verilir.
-- Tablolara sayfa doğrudan erişemez; yalnızca "borsa" işlevi sunucu yetkisiyle okur ve yazar.

create table if not exists public.kaynak_durum (
  id           smallint    primary key default 1 check (id = 1),
  ardisik      integer     not null default 0,
  kapali_kadar timestamptz not null default 'epoch',
  son_hata     timestamptz,
  son_basari   timestamptz
);
insert into public.kaynak_durum (id) values (1) on conflict (id) do nothing;

create table if not exists public.onbellek (
  anahtar text        primary key,
  arac    text        not null,
  yanit   jsonb       not null,
  zaman   timestamptz not null default now()
);

alter table public.kaynak_durum enable row level security;
alter table public.onbellek     enable row level security;
revoke all on public.kaynak_durum, public.onbellek from anon, authenticated;

-- Her istekte bir kez çağrılır: dakikalık sayacı artırır, kaynağın kapalı kalacağı süreyi (saniye) ve
-- ardışık hata sayısını da aynı yanıtta verir.
create or replace function public.istek_kapisi(p_kim text, p_sinir integer)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  n integer;
  d record;
begin
  insert into public.istek_sayac (kim, dakika, adet)
  values (p_kim, date_trunc('minute', now()), 1)
  on conflict (kim, dakika) do update set adet = public.istek_sayac.adet + 1
  returning adet into n;
  if random() < 0.02 then
    delete from public.istek_sayac where dakika < now() - interval '2 hours';
    delete from public.onbellek where zaman < now() - interval '14 days';
  end if;
  select ardisik, kapali_kadar into d from public.kaynak_durum where id = 1;
  return jsonb_build_object(
    'izin', n <= p_sinir,
    'kapali', greatest(0, ceil(extract(epoch from (coalesce(d.kapali_kadar, 'epoch'::timestamptz) - now()))))::integer,
    'ariza', coalesce(d.ardisik, 0)
  );
end;
$$;

-- Kaynağa yapılan çağrının sonucunu bildirir. Başarısızsa kaynağın kapalı sayılacağı süreyi (saniye) döndürür.
-- Kaynak zaten kapalıyken gelen hata bildirimleri süreyi uzatmaz (aynı anda biten istekler süreyi katlamasın).
create or replace function public.kaynak_bildir(p_tamam boolean)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  k timestamptz;
begin
  if p_tamam then
    update public.kaynak_durum set ardisik = 0, kapali_kadar = 'epoch', son_basari = now() where id = 1;
    return 0;
  end if;
  update public.kaynak_durum
  set son_hata     = now(),
      kapali_kadar = case when kapali_kadar > now() then kapali_kadar
                          else now() + make_interval(secs => least(300, 20 * power(2, least(ardisik, 4)))) end,
      ardisik      = case when kapali_kadar > now() then ardisik else ardisik + 1 end
  where id = 1
  returning kapali_kadar into k;
  return greatest(0, ceil(extract(epoch from (k - now()))))::integer;
end;
$$;

revoke all on function public.istek_kapisi(text, integer), public.kaynak_bildir(boolean) from public, anon, authenticated;
grant execute on function public.istek_kapisi(text, integer), public.kaynak_bildir(boolean) to service_role;
