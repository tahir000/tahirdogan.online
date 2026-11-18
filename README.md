# tahirdogan.online

Birbirinden bağımsız projelerin durduğu site. Her proje kendi klasöründedir; ana sayfa yalnızca projeleri listeler.

| Proje | Klasör | Adres | Ne yapar |
| --- | --- | --- | --- |
| Türkçe Soru Atölyesi | `turkce/` | https://tahirdogan.online/turkce/ | Ortaokul Türkçe öğretmenleri için bağlam temelli sınav ve soru bankası yönergesi hazırlar, hazır soru bankası sunar |
| Türkü Defteri | `turku-defteri/` | https://tahirdogan.online/turku-defteri/ | Uzun sap bağlama için türkü çalışma defteri: nota adları, perde numaraları, dinleme, hız ve döngü |
| Borsa Tahtası | `borsa/` | https://tahirdogan.online/borsa/ | Hisse takibi, teknik sinyaller ve günlük gündem; kullanıcı adı ve şifreyle girilir |

Her klasörün kendi `README.md` dosyası o projeyi anlatır.

`ozunde/gizlilik/` klasöründe yalnızca Özünde adlı Android uygulamasının gizlilik metni durur (https://tahirdogan.online/ozunde/gizlilik/). Uygulamanın sitesi olmadığı için ana sayfada listelenmez.

## Yeni proje eklemek

1. Kök dizinde projeye kısa, küçük harfli bir klasör açın ve sayfayı `index.html` adıyla içine koyun.
2. Sayfadaki dosya yollarını göreli yazın (`veri.js`, `../` gibi); `/` ile başlayan yol başka projeye taşar.
3. Ana sayfadaki (`index.html`) listeye ve yukarıdaki tabloya bir satır ekleyin.

## Kurallar

- Depo herkese açıktır: kişisel veri, şifre ya da gizli anahtar konmaz.
- Site arama motorlarına kapalıdır (`robots.txt` ve her sayfada `noindex`).
- Projeler birbirinin dosyasını kullanmaz; ortak dosya yoktur.

## Alan adı

tahirdogan.online Turkticaret'te kayıtlıdır ve GitHub Pages'e yönlendirilir. DNS: `@` için A kayıtları 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153; `www` için `tahir000.github.io` CNAME kaydı.
