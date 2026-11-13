# Türkçe Soru Atölyesi

Ortaokul Türkçe öğretmenleri için üç araç sunan sayfa. Site: https://tahirdogan.online/turkce/

| Sekme | Ne yapar |
| --- | --- |
| Sınav hazırla | MEB'in konu soru dağılım tablosuna göre bağlam temelli sınav yönergesi kurar |
| Soru bankası | Her sınıf için 8 bağlam ve 40 soruluk hazır banka: cevaplar, puanlama notları, yazdırma ve kopyalama |
| Soru bankası hazırla | Seçilen sınıf ve konular için yeni bir soru bankası yönergesi kurar; istenirse hazır bankadaki bağlamlardan farklı olmasını ister |

Sınav sekmesinde öğretmen sınıfı, sınavı ve senaryoyu seçer. Sayfa, MEB'in konu soru dağılım tablosundaki çıktıları ve öğretim programındaki süreç bileşenlerini soru yazım kurallarıyla birleştirip tek bir yönerge üretir. Öğretmen yönergeyi kullandığı yapay zeka sohbetine yapıştırır; sınav, eşleştirme tablosu ve puanlama anahtarı oradan gelir. Sayfanın kendisi yapay zeka çalıştırmaz, hiçbir yere istek göndermez.

## Dosyalar

| Dosya | İşi |
| --- | --- |
| `index.html` | Sayfa, üç sekme ve biçim |
| `veri.js` | Senaryolar, çıktılar (tablodakiler ve yıllık liste), süreç bileşenleri, temalar. Betikle üretilir, elle düzenlenmez |
| `banka.js` | Hazır soru bankası. Betikle üretilir, elle düzenlenmez |
| `banka-kaynak/` | Hazır bankanın elle yazılan kaynak dosyaları (`sinif-5.txt` ... `sinif-8.txt`) |
| `yonerge.js` | Sınav yönergesini kuran işlevler, kontrol listesi, hazır düzeltme istekleri |
| `banka-yonerge.js` | Konu grupları, hazır bankanın süzülmesi ve düz metne çevrilmesi, soru bankası yönergesi |
| `ortak.js` | Sekmelerin ortak kullandığı sayfa yardımcıları (sekme geçişi, kopyalama) |
| `arayuz.js` | "Sınav hazırla" sekmesinin arayüzü |
| `banka-arayuz.js` | "Soru bankası" ve "Soru bankası hazırla" sekmelerinin arayüzü |
| `test/test.html` | Veriyi, yönerge kurucuları ve hazır bankayı denetleyen testler; tarayıcıda açılınca çalışır |
| `araclar/` | Veriyi MEB belgelerinden çıkaran ve bankayı üreten betikler |
| `bilgi-paketi/` | Betiklerin ürettiği ara veriler (JSON) |

## Veri nereden geliyor

| Veri | Kaynak |
| --- | --- |
| Senaryolar, soru sayıları, çıktı kodları ve adları | MEB 2026-2027 1. dönem konu soru dağılım tablosu (Türkçe) |
| Süreç bileşenleri, temalar | Türkçe Dersi Öğretim Programı: 5. sınıf için 2026 sürümü, 6 ve 7. sınıf için 2024 sürümü |
| 8. sınıf | 2019 programının kazanımları; süreç bileşeni yoktur |
| Soru yazım kuralları | MEB Bağlam Temelli Çoktan Seçmeli Soru Yazım Kılavuzu (Mart 2026) ve açık uçlu sorular için eklenen kurallar |

Hangi sınıfın programın hangi sürümünü kullandığı, tablodaki kodların ve adların iki sürümle karşılaştırılmasıyla bulundu. Aynı kod iki sürümde farklı çıktıyı gösterebildiği için kodlar hafızadan yazılmaz, tablodan alınır.

Süreç bileşenleri programın tablosundan betikle çıkarılır (`araclar/surec_json.py`). Bir çıktının bileşenleri yalnız maddelerden önceki ad tabloyla tutuyorsa ve tek aday varsa kabul edilir. 5 ila 7. sınıfın yıl boyunca işlediği 138 okuma ve yazma çıktısının 131'i böyle doğrulandı; kalan yedisinde programda harfli bileşen yok ya da metin güvenle ayrıştırılamadı. Bu çıktılarda yönerge yalnız çıktının adını verir.

## Hazır soru bankası

Bankadaki metinler ve sorular bu site için yazıldı; ders kitabından, MEB'in ya da bir yayınevinin sorularından alınmadı. Her soru, sınıfın programındaki bir okuma ya da yazma çıktısına (8. sınıfta kazanıma) bağlıdır. Programa göre 5 ila 7. sınıfta dil yapıları ayrı ölçülmediği için bu sınıflarda terim sorusu yoktur.

Konu başlıkları (`banka-yonerge.js`) bu sitenin gruplamasıdır: 5 ila 7. sınıfta çıktı adı kalıba göre bir konuya düşer, 8. sınıfta kazanımlar numarasıyla sayılır. Testler her çıktının tam bir konuda olduğunu ve her konudan soru bulunduğunu denetler.

Soru eklemek ya da düzeltmek için:

1. `banka-kaynak/sinif-N.txt` dosyasını düzenleyin. Biçim `araclar/banka_js.py` dosyasının başında anlatılır. Her bağlamda beş soru bulunur.
2. Bankayı üretin: `python3 -I araclar/banka_js.py`. Betik kodları, seçenekleri, cevap harflerinin dengesini ve yazımı (şapkalı harf, uzun çizgi) denetler; hata varsa dosyayı yazmaz, uyarıları listeler.
3. Testleri çalıştırın ve sayfada "Soru bankası" sekmesine bakın.

## Veriyi yenilemek

MEB yeni tablo yayımladığında (örneğin 2. dönem):

1. Tabloyu `kaynaklar/` klasörüne indirin. Program PDF'leri de aynı klasörde durur. Bu klasör depoya girmez.
2. PDF metnini çıkarın (macOS): `swift araclar/pdfmetin.swift kaynaklar/program.pdf metin/program.txt`
3. Tabloyu veriye çevirin: `python3 -I araclar/senaryo_json.py kaynaklar/tablo.xlsx bilgi-paketi/senaryolar.json`
4. Süreç bileşenlerini çıkarın: `python3 -I araclar/surec_json.py`
5. Sitenin verisini üretin: `python3 -I araclar/veri_js.py`, ardından bankayı yeniden üretin: `python3 -I araclar/banka_js.py`
6. `test/test.html` sayfasını açıp testlerin geçtiğini görün (macOS'ta tarayıcısız: bu klasörde `osascript -l JavaScript araclar/test_calistir.js .`), sonra `main` dalına gönderin.

Betikler yalnız Python 3 ve macOS ile çalışır, ek kurulum istemez.

## Kurallar

- Depo herkese açıktır: kişisel veri, öğrenci bilgisi, şifre ya da anahtar konmaz.
- MEB'in PDF ve Excel dosyaları depoya konmaz; yalnız onlardan çıkarılan kodlar, adlar ve süreç bileşenleri yer alır.
- Hazır bankaya yalnız özgün metin ve soru girer; başkasına ait metin ya da soru konmaz.
- Sayfa dış kaynaktan betik ya da yazı tipi yüklemez; güvenlik politikası dışarıya bağlantıyı kapatır.
- Site arama motorlarına kapalıdır (`robots.txt` ve `noindex`).
- Bu site MEB'e ait ya da bağlı değildir.
