-- Borsa Tahtası: ortak fiyat deposu, istek sınırı ve cihaz anahtarları.
-- Supabase panelinde SQL Editor'e yapıştırıp bir kez çalıştırılır. Yeniden çalıştırmak zarar vermez.
--
-- Buradaki tablolara sayfa doğrudan erişemez (kural yoktur); yalnızca "borsa" işlevi sunucu yetkisiyle okur ve yazar.

-- Günlük fiyat geçmişi: her hisse için tek satır. b alanı tarih -> [açılış, yüksek, düşük, kapanış, hacim].
-- ilk ile son arasındaki dönem kesintisiz kapsanmıştır; dip, daha eski veri olmadığını söyler (ör. yeni halka arz).
create table if not exists public.gecmis (
  sembol text        primary key check (sembol ~ '^[A-Z0-9]{2,6}$'),
  ilk    date        not null,
  son    date        not null,
  dip    boolean     not null default false,
  taze   timestamptz not null default 'epoch',
  b      jsonb       not null default '{}'::jsonb
);

-- Son fiyatlar: kısa süreli önbellek.
create table if not exists public.kotasyon (
  sembol text        primary key check (sembol ~ '^[A-Z0-9]{2,6}$'),
  veri   jsonb       not null,
  zaman  timestamptz not null default now()
);

-- İstek sayacı: kullanıcı ya da cihaz başına dakikalık sayım.
create table if not exists public.istek_sayac (
  kim    text        not null,
  dakika timestamptz not null,
  adet   integer     not null default 0,
  primary key (kim, dakika)
);

-- Cihaz anahtarları: bildirim ve ana ekran bileşeni, uygulama kapalıyken bu anahtarla özet ister.
-- Anahtarın kendisi saklanmaz, yalnızca özeti (SHA-256) durur. Hesap silinince satırlar da silinir.
create table if not exists public.cihazlar (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users (id) on delete cascade,
  ozet        text        not null unique,
  olusturma   timestamptz not null default now(),
  son_gorulme timestamptz
);
create index if not exists cihazlar_kullanici on public.cihazlar (user_id, olusturma desc);

alter table public.gecmis      enable row level security;
alter table public.kotasyon    enable row level security;
alter table public.istek_sayac enable row level security;
alter table public.cihazlar    enable row level security;
revoke all on public.gecmis, public.kotasyon, public.istek_sayac, public.cihazlar from anon, authenticated;

-- Fiyat geçmişini birleştirerek yazar: aynı anda iki istek aynı hisseyi doldursa da veri kaybolmaz.
create or replace function public.gecmis_yaz(satirlar jsonb)
returns void
language sql
set search_path = ''
as $$
  insert into public.gecmis (sembol, ilk, son, dip, taze, b)
  select x.sembol, x.ilk, x.son, coalesce(x.dip, false), coalesce(x.taze, 'epoch'::timestamptz), coalesce(x.b, '{}'::jsonb)
  from jsonb_to_recordset(satirlar) as x(sembol text, ilk date, son date, dip boolean, taze timestamptz, b jsonb)
  on conflict (sembol) do update set
    b    = public.gecmis.b || excluded.b,
    ilk  = least(public.gecmis.ilk, excluded.ilk),
    son  = greatest(public.gecmis.son, excluded.son),
    dip  = public.gecmis.dip or excluded.dip,
    taze = greatest(public.gecmis.taze, excluded.taze);
$$;

-- Çok eskimiş bir kaydı baştan başlatmak için (araya boşluk girmesin diye) satırı siler.
create or replace function public.gecmis_sifirla(p_semboller text[])
returns void
language sql
set search_path = ''
as $$
  delete from public.gecmis where sembol = any (p_semboller);
$$;

-- Dakikalık sayacı artırır; sınır aşılmadıysa true döner.
create or replace function public.istek_say(p_kim text, p_sinir integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  n integer;
begin
  insert into public.istek_sayac (kim, dakika, adet)
  values (p_kim, date_trunc('minute', now()), 1)
  on conflict (kim, dakika) do update set adet = public.istek_sayac.adet + 1
  returning adet into n;
  if random() < 0.02 then
    delete from public.istek_sayac where dakika < now() - interval '2 hours';
  end if;
  return n <= p_sinir;
end;
$$;

revoke all on function public.gecmis_yaz(jsonb), public.gecmis_sifirla(text[]), public.istek_say(text, integer) from public, anon, authenticated;
grant execute on function public.gecmis_yaz(jsonb), public.gecmis_sifirla(text[]), public.istek_say(text, integer) to service_role;

-- Giriş yapan kullanıcı, kullandığı telefon için bir cihaz anahtarı alır. Anahtar yalnızca bu yanıtta görünür.
-- Kullanıcı başına en çok beş cihaz tutulur; eskiler silinir.
create or replace function public.cihaz_kaydet()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  kim     uuid := auth.uid();
  anahtar text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  if kim is null then
    raise exception 'giris gerekli' using errcode = '28000';
  end if;
  insert into public.cihazlar (user_id, ozet)
  values (kim, encode(sha256(convert_to(anahtar, 'UTF8')), 'hex'));
  delete from public.cihazlar
  where user_id = kim
    and id not in (select id from public.cihazlar where user_id = kim order by olusturma desc limit 5);
  return anahtar;
end;
$$;

-- Çıkış yapılırken telefonun anahtarı silinir.
create or replace function public.cihaz_sil(p_anahtar text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.cihazlar
  where user_id = auth.uid()
    and ozet = encode(sha256(convert_to(p_anahtar, 'UTF8')), 'hex');
$$;

revoke all on function public.cihaz_kaydet(), public.cihaz_sil(text) from public, anon;
grant execute on function public.cihaz_kaydet(), public.cihaz_sil(text) to authenticated;
