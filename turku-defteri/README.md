# Türkü Defteri

Uzun sap bağlamada yeni türkü çalışmak için site: https://tahirdogan.online/turku-defteri/

Her türkü nota adları (do re mi) ve perde numaralarıyla yazılıdır. Sayfa türküyü çalar, hızı ayarlanır, seçilen ölçüler döngüye alınır, ekranın altındaki sap şeması basılacak perdeyi gösterir. Sayfa hiçbir yere veri göndermez; ayarlar yalnızca cihazda saklanır.

## Saz

- Uzun sap bağlama, bozuk düzen: alt tel la (220 Hz), orta tel re, üst tel sol.
- Sap 23 perdeli sayılır. Yarım ses perdeleri: si bemol, si, do, do diyez, re, mi bemol, mi, fa, fa diyez, sol, la bemol, la, si bemol, si, do, do diyez, re. Koma perdeleri iki yarım ses perdesinin ortasındadır: si bemol 2, do diyez 3, mi bemol 2, fa diyez 3, sol diyez 3 ve tizde si bemol 2. Kaynak: MEB "Bağlama Ailesi Perde ve Genel Ayarları" modülü (yarım ses perdelerinin sırası, koma perdelerinin yeri, düzen tablosu). Koma perdelerinin hangileri olduğu modüldeki şekilden okunamadı; yaygın 23 perdeli düzen esas alındı ve çalanlarla teyit edilecek.
- Perde tablosu tek yerdedir: `perde.js` içindeki `PERDELER`. Sazın perde düzeni farklı çıkarsa yalnızca o liste değişir.

## Dosyalar

| Dosya | İş |
| --- | --- |
| `index.html` | Sayfa ve görünüm |
| `perde.js` | Perde tablosu, nota adından tel ve perde bulma, frekans |
| `ses.js` | Tel sesi üretimi (Karplus-Strong), çalıcı, döngü, metronom |
| `arayuz.js` | Liste, türkü sayfası, sap şeması, düğmeler |
| `kaynak/*.txt` | Türkülerin elle düzeltilebilir kaynağı (her türkü bir dosya) |
| `veri/*.js` | Sitenin okuduğu veri; `araclar/derle.py` üretir, elle düzenlenmez |
| `araclar/derle.py` | `kaynak/` dosyalarını denetler ve `veri/` dosyalarını üretir; kaynak biçimi bu dosyanın başında anlatılır |
| `araclar/symbtr_al.py` | Tek bir SymbTr dosyasını kaynak biçimine çevirir |
| `araclar/symbtr_toplu.py` | SymbTr'deki bütün türküleri toplu çevirir; sonucu `araclar/toplu_rapor.txt` dosyasına yazar |
| `test/test.html`, `test/yukle.js` | Testler (tarayıcıda); bütün türkü dosyalarını yükler |
| `araclar/test_calistir.js` | Testleri tarayıcısız çalıştırır |

## Bir notayı düzeltmek

1. `kaynak/<türkü>.txt` dosyasında ilgili ölçü satırını düzelt (ör. `Do5:8` yerine `Re5:8`).
2. `turku-defteri` klasöründe: `python3 -I araclar/derle.py`
3. Testler: `osascript -l JavaScript araclar/test_calistir.js .`

Bir çalan türküyü baştan sona denetleyince kaynak dosyasındaki `durum: taslak` satırı `durum: onayli` yapılır; sayfadaki taslak uyarısı kalkar.

## Türküler

240 türkü var: beşi elle seçilip çevrildi (listede "Önce bunları deneyin"), 235'i SymbTr'den toplu çevrildi (kaynak dosyasında `ceviri: toplu`). SymbTr'deki 300 türküden alınmayanlar ve nedenleri `araclar/toplu_rapor.txt` dosyasında:

- bestecisi ya da söz yazarı yazan eserler alınmadı (yalnız anonim türküler);
- bir sesi 23 perdeli sapta, bozuk düzende bulunmayan türküler alınmadı (ör. re bemol 2, mi diyez 3).

Zorluk etiketi kaba bir tahmindir (`symbtr_toplu.py` içinde `zorluk_bul`): notaların hızına, ses aralığına ve çarpma sayısına bakar.

## Yeni türkü eklemek

- Toplu çeviriyi yenilemek: `python3 -I araclar/symbtr_toplu.py --txt <SymbTr txt klasörü> --mu2 <SymbTr mu2 klasörü>`, sonra derle ve test et. Betik yalnız `ceviri: toplu` yazan dosyaların üzerine yazar. Bir dosyayı elle düzelttiysen o satırı `ceviri: elle` yap.
- SymbTr'den tek türkü: `python3 -I araclar/symbtr_al.py <symbtr.txt> kaynak/<kimlik>.txt --ad "Türkü Adı" --yore Yöre --dizi Makam`, sonra derle ve test et.
- Nota kağıdından: `kaynak/` altına yeni bir dosya açıp ölçüleri `derle.py` başındaki biçimle elle yaz.

## Kaynak ve lisans

Nota verisi SymbTr 2.4.3 veri setinden alınıp bağlama perdelerine uyarlanmıştır:

> M. Kemal Karaosmanoğlu. A Turkish makam music symbolic database for music information retrieval: SymbTr. ISMIR 2012. https://github.com/MTG/SymbTr

SymbTr CC BY-NC-SA 4.0 ile lisanslıdır. Bu klasördeki türkü verileri (`kaynak/` ve `veri/`) aynı lisansla paylaşılır: ticari olmayan kullanım, kaynak gösterme, aynı lisansla paylaşma. Yapılan değişiklikler: nota adları bağlamanın 17 perdeli düzenine çevrildi, notalar ölçülere bölündü, yinelenen kıtalar tek ezgide toplandı, eksik kalan son ölçüler susla tamamlandı. Türkü adları ve makam adları veri setindeki başlıklardan alındı (şapkalı harfler sadeleştirildi).

Türküler taslaktır: bilgisayarla çevrildi, bir çalan tarafından baştan sona denetlenmedi.
