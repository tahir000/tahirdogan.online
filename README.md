# tahirdogan.online

Birbirinden bağımsız projelerin durduğu site. Her proje kendi klasöründedir; ana sayfa yalnızca projeleri listeler.

| Proje | Klasör | Adres | Ne yapar |
| --- | --- | --- | --- |
| Türkçe Soru Atölyesi | `turkce/` | https://tahirdogan.online/turkce/ | Ortaokul Türkçe öğretmenleri için bağlam temelli sınav yönergesi hazırlar |
| Borsa Tahtası | `borsa/` | https://tahirdogan.online/borsa/ | Hisse takibi, teknik sinyaller ve günlük gündem; kullanıcı adı ve şifreyle girilir |

Her klasörün kendi `README.md` dosyası o projeyi anlatır.

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
