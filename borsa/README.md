# Borsa Tahtası

BIST hisse takibi sayfası: kişiye özel hisse listesi, klasik göstergelerden hesaplanan teknik sinyaller, hisse grafiği ve günlük gündem. Site: https://tahirdogan.online/borsa/

Sayfa kullanıcı adı ve şifreyle açılır. Kullanıcı hesabını giriş ekranındaki "Hesap oluştur" ile kendisi açar, Hesap bölümündeki "Hesabımı sil" ile kendisi siler; e-posta adresi istenmez. Sinyaller kural tabanlıdır, yatırım tavsiyesi değildir.

## Dosyalar

| Dosya | İşi |
| --- | --- |
| `index.html` | Sayfanın tamamı: biçim, hesaplamalar, giriş ve veri bağlantıları tek dosyada |
| `gizlilik/index.html` | Gizlilik politikası (Android uygulaması ve bu site için); arama motorlarına açık tek sayfa |
| `kurulum/1-tablolar.sql` | Supabase tabloları ve satır düzeyinde güvenlik kuralları |
| `kurulum/2-borsa-fonksiyonu.ts` | Borsa MCP aktarıcısı, ortak fiyat deposu ve cihaz özeti (Supabase Edge Function, adı `borsa`; "Verify JWT" kapalı yayınlanır, kimliği kendisi denetler) |
| `kurulum/3-gundem-yazma.sql` | Günlük gündemi dışarıdan yazma yolu (anahtarın özeti yer tutucudur) |
| `kurulum/4-kayit-ve-hesap-silme.sql` | Kullanıcının kendi hesabını silmesi için işlev ve kayıt için gereken panel ayarları |
| `kurulum/5-fiyat-deposu-ve-cihaz.sql` | Ortak fiyat deposu, istek sayacı ve Android uygulamasının cihaz anahtarları |

## Nasıl çalışır

- **Hesaplar ve listeler** Supabase'de durur. Her kullanıcı yalnızca kendi hisse listesini ve işlem günlüğünü görür (satır düzeyinde güvenlik).
- **Fiyat verisi** Borsa MCP sunucusundan gelir. Sunucu web sayfalarından doğrudan çağrılamadığı için istekler `borsa` fonksiyonu üzerinden, yalnızca giriş yapmış kullanıcılar için iletilir.
- **Günlük geçmiş** ortak bir depoda tutulur: `borsa` işlevi veriyi kaynaktan 28 günlük parçalarla alır (sunucu bir aydan uzun aralıkları haftalık ya da aylık veriye çevirir) ve veritabanına yazar; sonraki isteyen hazır veriyi tek istekte alır. Bir hisseyi ilk isteyen yarım dakika kadar bekler. Son fiyatlar da aynı yoldan, bir dakikalık önbellekle gelir. Kullanıcı başına dakikada 240 istek sınırı vardır.
- **Android uygulaması** uygulama kapalıyken bildirim denetimi ve ana ekran bileşeni için özeti cihaz anahtarıyla ister; anahtarın yalnızca özeti saklanır.
- **Gündem** her sabah ayrı bir görevle yazılır; sayfa yalnızca okur.

## Kurallar

- Depo herkese açıktır: şifre, gizli anahtar ya da kişisel veri konmaz. `index.html` içindeki proje adresi ve "publishable" anahtar herkese açık bilgilerdir; "secret" anahtar hiçbir dosyaya yazılmaz.
- Supabase'de kayıt açıktır ve e-posta onayı kapalıdır: kullanıcı adları kimlik sunucusuna e-posta biçiminde verilir ama bu adreslere posta gönderilmez. Şifresini unutan kullanıcının şifresi panelden sıfırlanır (Authentication, Users).
- Sayfanın kaynağı Claude'daki sürümle ortaktır; aynı dosya Claude içinde girişsiz, burada girişle çalışır.
