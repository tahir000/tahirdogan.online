-- Borsa Tahtası: kullanıcının kendi hesabını açması ve silmesi.
-- Supabase panelinde SQL Editor'e yapıştırıp bir kez çalıştırılır. Yeniden çalıştırmak zarar vermez.
--
-- Bu dosyanın yanında panelde iki ayar gerekir (Authentication, Sign In / Providers):
--   1. "Allow new users to sign up" açık
--   2. Email sağlayıcısında "Confirm email" kapalı
-- Kullanıcı adları kimlik sunucusuna "ad@tahirdogan.com" biçiminde verilir; bu adreslere posta gönderilmez,
-- o yüzden e-posta onayı kapalı olmalıdır. Onay açık kalırsa kayıt oturum döndürmez ve sayfa "Hesap şu an açılamıyor" der.

-- Giriş yapan kullanıcı kendi hesabını siler. hisseler ve islemler tablolarındaki satırları
-- "on delete cascade" kuralıyla birlikte silinir. İşlev yalnızca çağıranın kendi kaydına dokunur.
create or replace function public.hesabimi_sil()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kim uuid := auth.uid();
begin
  if kim is null then
    raise exception 'giris gerekli' using errcode = '28000';
  end if;
  delete from auth.users where id = kim;
end;
$$;

revoke all on function public.hesabimi_sil() from public;
revoke all on function public.hesabimi_sil() from anon;
grant execute on function public.hesabimi_sil() to authenticated;

comment on function public.hesabimi_sil() is 'Giriş yapan kullanıcının kendi hesabını ve verilerini siler (uygulamadaki "Hesabımı sil").';
