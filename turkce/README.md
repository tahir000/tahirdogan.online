# Türkçe Soru Atölyesi

Ortaokul Türkçe öğretmenleri için bağlam temelli sınav yönergesi hazırlayan sayfa. Site: https://tahirdogan.online/turkce/

Öğretmen sınıfı, sınavı ve senaryoyu seçer. Sayfa, MEB'in konu soru dağılım tablosundaki çıktıları ve öğretim programındaki süreç bileşenlerini soru yazım kurallarıyla birleştirip tek bir yönerge üretir. Öğretmen yönergeyi kullandığı yapay zeka sohbetine yapıştırır; sınav, eşleştirme tablosu ve puanlama anahtarı oradan gelir. Sayfanın kendisi yapay zeka çalıştırmaz, hiçbir yere istek göndermez.

## Dosyalar

| Dosya | İşi |
| --- | --- |
| `index.html` | Sayfa ve biçimi |
| `veri.js` | Senaryolar, çıktılar, süreç bileşenleri, temalar. Betikle üretilir, elle düzenlenmez |
| `yonerge.js` | Seçimlerden yönerge metnini kuran işlevler, kontrol listesi, hazır düzeltme istekleri |
| `arayuz.js` | Sayfadaki seçimleri okur, yönergeyi gösterir, panoya kopyalar |
| `test/test.html` | Veriyi ve yönerge kurucuyu denetleyen testler; tarayıcıda açılınca çalışır |
| `araclar/` | Veriyi MEB belgelerinden çıkaran betikler |
| `bilgi-paketi/` | Betiklerin ürettiği ara veriler (JSON) |

## Veri nereden geliyor

| Veri | Kaynak |
| --- | --- |
| Senaryolar, soru sayıları, çıktı kodları ve adları | MEB 2026-2027 1. dönem konu soru dağılım tablosu (Türkçe) |
| Süreç bileşenleri, temalar | Türkçe Dersi Öğretim Programı: 5. sınıf için 2026 sürümü, 6 ve 7. sınıf için 2024 sürümü |
| 8. sınıf | 2019 programının kazanımları; süreç bileşeni yoktur |
| Soru yazım kuralları | MEB Bağlam Temelli Çoktan Seçmeli Soru Yazım Kılavuzu (Mart 2026) ve açık uçlu sorular için eklenen kurallar |

Hangi sınıfın programın hangi sürümünü kullandığı, tablodaki kodların ve adların iki sürümle karşılaştırılmasıyla bulundu. Aynı kod iki sürümde farklı çıktıyı gösterebildiği için kodlar hafızadan yazılmaz, tablodan alınır.

Süreç bileşenleri programın tablosundan betikle çıkarılır (`araclar/surec_json.py`). Bir çıktının bileşenleri yalnız maddelerden önceki ad tabloyla tutuyorsa ve tek aday varsa kabul edilir. 5 ila 7. sınıf tablolarındaki 76 çıktının 71'i böyle doğrulandı; kalan beşinde programda harfli bileşen yok ya da metin güvenle ayrıştırılamadı. Bu çıktılarda yönerge yalnız çıktının adını verir.

## Veriyi yenilemek

MEB yeni tablo yayımladığında (örneğin 2. dönem):

1. Tabloyu `kaynaklar/` klasörüne indirin. Program PDF'leri de aynı klasörde durur. Bu klasör depoya girmez.
2. PDF metnini çıkarın (macOS): `swift araclar/pdfmetin.swift kaynaklar/program.pdf metin/program.txt`
3. Tabloyu veriye çevirin: `python3 -I araclar/senaryo_json.py kaynaklar/tablo.xlsx bilgi-paketi/senaryolar.json`
4. Süreç bileşenlerini çıkarın: `python3 -I araclar/surec_json.py`
5. Sitenin verisini üretin: `python3 -I araclar/veri_js.py`
6. `test/test.html` sayfasını açıp testlerin geçtiğini görün, sonra `main` dalına gönderin.

Betikler yalnız Python 3 ve macOS ile çalışır, ek kurulum istemez.

## Kurallar

- Depo herkese açıktır: kişisel veri, öğrenci bilgisi, şifre ya da anahtar konmaz.
- MEB'in PDF ve Excel dosyaları depoya konmaz; yalnız onlardan çıkarılan kodlar, adlar ve süreç bileşenleri yer alır.
- Sayfa dış kaynaktan betik ya da yazı tipi yüklemez; güvenlik politikası dışarıya bağlantıyı kapatır.
- Site arama motorlarına kapalıdır (`robots.txt` ve `noindex`).
- Bu site MEB'e ait ya da bağlı değildir.
