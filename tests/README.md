# Testler

`regression.js`, uygulamayı gerçek bir tarayıcıda açıp 81 kontrol yapar.
Buradaki her kontrol, bir zamanlar gerçekten bozuk olan bir şeyi koruyor:
kodun içindeki yorumlar hangi hatanın nöbetini tuttuklarını anlatıyor.

Uygulamayı günlük kullanmak için bunlara **ihtiyacınız yok**. Bunlar
yalnızca uygulamada değişiklik yapıldığında eski hataların geri gelip
gelmediğini anlamak içindir.

## Çalıştırmak

Bilgisayarınızda Node.js ve Playwright varsa:

```
npm i -D playwright
npx playwright install chromium
node tests/regression.js
```

Sonuç şöyle biter:

```
81/81 checks passed
```

Bir satır `✗` ile başlıyorsa o kontrol düşmüştür; komut da hata koduyla
biter, yani otomatik bir kurulumda fark edilir.

Testler her bölümün başında verileri sıfırlar ve bitince tohum (seed)
verisine geri döner; kendi kelimelerinizi bozmaz. Yine de gerçek verinizle
aynı tarayıcıda çalıştırmak yerine önce **Settings → Backup** almanız iyi olur.

## Neyi kapsıyor

| Bölüm | Ne koruyor |
|---|---|
| boot and navigation | Yedi sayfanın da hatasız açılması |
| spaced repetition | Erken tekrarların aralığı şişirmemesi, 21 gün eşiği, unutma (lapse) |
| levels versus scheduling | "Bilgi düzeyi" ile "sırası geldi mi" ayrımının karışmaması |
| study ahead | "Study ahead" düğmesinin gerçekten kart vermesi |
| undo | Geri almanın kartı, istatistiği, günlüğü ve sayaçları birlikte geri alması |
| reset progress | Sıfırlamanın geçmişi de temizlemesi, günlük hakkın tam kalması |
| phrase matching | 66 örnek cümlenin hepsinde kelimenin doğru vurgulanması |
| card validation | Eksik alanla kayıt ve sessiz mükerrer kayıt engelleri |
| practice rounds | Şık sayısı ayarı, tur uzunluğu, eşleştirmedeki fazladan kutucuk |
| themes, fonts and sizes | Sekiz tema, beş font, dört yazı boyutunun birbirinden farklı olması |
| scroll architecture | Sayfanın aşağı inebilmesi ve yukarı dön düğmesi |
| hints | İpucu açılınca kutunun boyunun değişmemesi |
| persistence, backup and CSV | Yenilemede veri kaybı olmaması, yedek ve CSV gidiş-gelişi |
