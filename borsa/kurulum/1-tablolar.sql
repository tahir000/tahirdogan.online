-- Borsa Tahtası: Supabase tabloları ve erişim kuralları.
-- Supabase panelinde SQL Editor'e yapıştırıp bir kez çalıştırılır. Yeniden çalıştırmak zarar vermez.

-- Her kullanıcının kendi hisse listesi
create table if not exists public.hisseler (
  user_id   uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  sembol    text        not null check (sembol ~ '^[A-Z0-9]{2,6}$'),
  adet      numeric     check (adet is null or adet >= 0),
  maliyet   numeric     check (maliyet is null or maliyet >= 0),
  alarm_ust numeric     check (alarm_ust is null or alarm_ust >= 0),
  alarm_alt numeric     check (alarm_alt is null or alarm_alt >= 0),
  eklenme   timestamptz not null default now(),
  primary key (user_id, sembol)
);

-- Her kullanıcının kendi işlem günlüğü
create table if not exists public.islemler (
  id        uuid        primary key default gen_random_uuid(),
  user_id   uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  sembol    text        not null check (sembol ~ '^[A-Z0-9]{2,6}$'),
  tur       text        not null check (tur in ('al', 'sat')),
  adet      numeric     not null check (adet > 0),
  fiyat     numeric     not null check (fiyat > 0),
  tarih     date        not null,
  kz        numeric,
  olusturma timestamptz not null default now()
);
create index if not exists islemler_kullanici on public.islemler (user_id, tarih desc);

-- Herkesin okuduğu ortak içerik: günlük gündem ve haftalık değerlendirme
create table if not exists public.gunluk (
  tarih date  primary key,
  veri  jsonb not null default '{}'::jsonb
);
create table if not exists public.haftalik (
  tarih date  primary key,
  veri  jsonb not null default '{}'::jsonb
);

-- Satır düzeyinde güvenlik: kurallar olmadan hiçbir satır okunamaz ve yazılamaz
alter table public.hisseler enable row level security;
alter table public.islemler enable row level security;
alter table public.gunluk   enable row level security;
alter table public.haftalik enable row level security;

-- Kullanıcı yalnızca kendi satırlarını görür ve değiştirir
drop policy if exists "kendi hisseleri" on public.hisseler;
create policy "kendi hisseleri" on public.hisseler
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "kendi islemleri" on public.islemler;
create policy "kendi islemleri" on public.islemler
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Ortak içeriği giriş yapan herkes okur; yazma kuralı yoktur, yani sayfadan yazılamaz
drop policy if exists "gundemi oku" on public.gunluk;
create policy "gundemi oku" on public.gunluk for select to authenticated using (true);

drop policy if exists "haftaligi oku" on public.haftalik;
create policy "haftaligi oku" on public.haftalik for select to authenticated using (true);

-- Giriş yapmamış ziyaretçi hiçbir tabloya erişemez
revoke all on public.hisseler, public.islemler, public.gunluk, public.haftalik from anon;
revoke all on public.hisseler, public.islemler, public.gunluk, public.haftalik from authenticated;
grant select, insert, update, delete on public.hisseler, public.islemler to authenticated;
grant select on public.gunluk, public.haftalik to authenticated;
