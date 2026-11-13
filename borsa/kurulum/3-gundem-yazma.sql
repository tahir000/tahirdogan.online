-- Borsa Tahtası: günlük gündemi dışarıdan yazma yolu.
-- Sabah görevi bu Mac'teki yazma anahtarıyla yalnızca bu iki fonksiyonu çağırabilir. Veritabanında anahtarın kendisi değil,
-- SHA-256 özeti durur; özetten anahtar geri çıkarılamaz. Anahtar değişirse aşağıdaki özet satırı yeniden çalıştırılır.

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.ayar (
  ad    text primary key,
  deger text not null
);
alter table private.ayar enable row level security;   -- kural yok: yalnızca aşağıdaki fonksiyonlar okuyabilir
revoke all on private.ayar from anon, authenticated;

insert into private.ayar (ad, deger) values ('gundem_anahtar_ozeti', '<ANAHTARIN_SHA256_OZETI>')
  on conflict (ad) do update set deger = excluded.deger;

create or replace function private.gundem_yetki(p_anahtar text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.ayar
    where ad = 'gundem_anahtar_ozeti'
      and deger = encode(sha256(convert_to(p_anahtar, 'UTF8')), 'hex')
  );
$$;

-- Bir günün gündemini yazar ya da günceller
create or replace function public.gundem_yaz(p_anahtar text, p_tarih date, p_veri jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce(private.gundem_yetki(p_anahtar), false) then
    raise exception 'yetkisiz' using errcode = '42501';
  end if;
  if p_tarih is null or p_tarih < current_date - 7 or p_tarih > current_date + 1 then
    raise exception 'tarih aralik disi' using errcode = '22023';
  end if;
  if p_veri is null or jsonb_typeof(p_veri) <> 'object' or length(p_veri::text) > 300000 then
    raise exception 'veri gecersiz' using errcode = '22023';
  end if;
  insert into public.gunluk as g (tarih, veri) values (p_tarih, p_veri)
    on conflict (tarih) do update set veri = excluded.veri;
  return 'tamam';
end;
$$;

-- Kullanıcıların listelerindeki sembolleri kimin olduğunu göstermeden döndürür (haber taraması için)
create or replace function public.gundem_semboller(p_anahtar text)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce(private.gundem_yetki(p_anahtar), false) then
    raise exception 'yetkisiz' using errcode = '42501';
  end if;
  return coalesce((select array_agg(q.sembol order by q.sembol) from (select distinct h.sembol from public.hisseler h order by h.sembol limit 60) q), '{}'::text[]);
end;
$$;

revoke all on function private.gundem_yetki(text) from public, anon, authenticated;
revoke all on function public.gundem_yaz(text, date, jsonb) from public, anon, authenticated;
revoke all on function public.gundem_semboller(text) from public, anon, authenticated;
grant execute on function public.gundem_yaz(text, date, jsonb) to anon;
grant execute on function public.gundem_semboller(text) to anon;
