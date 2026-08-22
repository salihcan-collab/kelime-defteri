# Lexio — Kelime Öğrenme Uygulaması

Bilgisayarında çalışan, kurulum gerektirmeyen bir İngilizce kelime çalışma uygulaması.
Aralıklı tekrar (spaced repetition), deste sistemi, sekiz farklı alıştırma modu ve
özelleştirilebilir arayüz içerir. İlerlemen bilgisayarında saklanır; hiçbir yere gönderilmez.

> Uygulamanın arayüzü tamamen İngilizcedir. Bu kılavuz Türkçedir.

![Lexio ekran görüntüsü](ekran-goruntusu.png)

---

## 1. Nasıl çalıştırılır

Kod bilgisi, kurulum, hesap veya internet gerekmez.

1. Bu klasörü bilgisayarına indir (GitHub'da yeşil **Code** düğmesi → **Download ZIP**) ve ZIP'i çıkar.
2. Klasördeki **`index.html`** dosyasına çift tıkla.
3. Uygulama varsayılan tarayıcında açılır. Hepsi bu.

Sık kullanmak için tarayıcıda sayfayı yer imlerine ekleyebilirsin.

**Tarayıcı önerisi:** Chrome, Edge veya Firefox. Safari'de dosyaya çift tıklayarak açmak
bazı sürümlerde kaydetmeyi engelleyebilir; bu durumda aşağıdaki *Sorun giderme* bölümüne bak.

---

## 2. İlerlemen nasıl saklanır

Çalıştığın her kelime, tarih ve istatistik **tarayıcının kendi deposunda** (localStorage)
otomatik kaydedilir. Uygulamayı kapatıp açtığında kaldığın yerden devam edersin.

Bunun iki sınırı var, ikisi de kolayca çözülür:

- Tarayıcı geçmişini/site verilerini temizlersen kayıt da silinir.
- Başka bir bilgisayara geçersen kayıt taşınmaz.

Bu yüzden **ara sıra yedek al**: sol alttaki **Save backup file** düğmesi ya da
**Settings → Your data → Download backup (.json)**. Bu bir `.json` dosyası indirir.
Geri yüklemek için: **Settings → Restore from backup** (birleştirme veya tamamen değiştirme
seçeneğiyle). Aynı dosyayı başka bir bilgisayarda içe aktararak ilerlemeni taşıyabilirsin.

---

## 3. Ekranlar

| Ekran | Ne işe yarar |
|---|---|
| **Dashboard** | Bugün kaç kart var, seri (streak), doğruluk oranı, deste ilerlemeleri, 12 haftalık aktivite haritası |
| **Decks** | Desteleri oluştur, düzenle, sil; içindeki kelimeleri gör |
| **Study** | Aralıklı tekrar seansı — asıl öğrenmenin olduğu yer |
| **Practice** | 8 farklı test/alıştırma modu |
| **Browse** | Tüm kelimeler; arama, filtre, sıralama, toplu içe/dışa aktarma |
| **Progress** | Hatırlama oranı, 14 günlük geçmiş, gelecek 14 günün tahmini, en çok zorlandığın kelimeler |
| **Settings** | Tema, font, renk, çalışma kuralları, AI, veri yönetimi |

---

## 4. Aralıklı tekrar (spaced repetition) nasıl çalışır

Her kartı gördüğünde dört seçenekten birini işaretlersin:

| Düğme | Anlamı | Sonuç |
|---|---|---|
| **Again** (1) | Hatırlamadım | Kart aynı seansta birkaç dakika sonra tekrar gelir |
| **Hard** (2) | Zor hatırladım | Aralık kısa tutulur |
| **Good** (3) | Hatırladım | Aralık normal şekilde uzar |
| **Easy** (4) | Çok kolaydı | Aralık belirgin şekilde uzar |

Düğmelerin altında bir sonraki tekrarın ne zaman olacağı yazar (`10m`, `1d`, `2mo` gibi).
Sistem SM-2 algoritmasının Anki'de kullanılan sürümüne dayanır: yeni kartlar 1 dakika →
10 dakika → 1 gün adımlarıyla başlar, sonra her başarılı tekrarda aralık kendi
"kolaylık katsayısı" kadar çarpılarak uzar. Unuttuğun kart otomatik olarak başa döner.

**Günlük limitler** (Settings → Study rules) birikmeyi önler: varsayılan olarak günde
15 yeni kelime ve en fazla 120 tekrar. Kendine göre ayarlayabilirsin — günde 10–20 yeni
kelime sürdürülebilir bir tempodur.

---

## 5. Bir kelime kartında neler var

- **Word** — kelime veya kalıp
- **Part of speech** — sözcük türü (noun, verb, adjective, phrasal verb, idiom…)
- **Meaning** — İngilizce tanım
- **Example sentence** — kelimeyi içeren doğal bir örnek cümle
- **Translation** — Türkçe karşılığı
- **Category** — konu etiketi (Work, Feelings, Travel…)
- **Personal note** — kendi hatırlatıcı notun (isteğe bağlı)

Örnek cümlenin kelimeyi **içermesi** önemlidir: "Fill in the blank" alıştırması cümledeki
kelimeyi boşluğa çevirerek soru üretir.

Yeni kelime eklemek için herhangi bir ekranda **N** tuşuna basman yeterli.

---

## 6. Alıştırma modları (Practice)

| Mod | Ne yapar |
|---|---|
| **Word → Meaning** | Kelimeyi görürsün, doğru anlamı seçersin |
| **Meaning → Word** | Anlamı görürsün, doğru kelimeyi seçersin |
| **Type the word** | Anlamdan yola çıkıp kelimeyi yazarsın (tek harflik yazım hatası affedilir) |
| **Fill in the blank** | Örnek cümledeki boşluğu doldurursun |
| **Matching pairs** | Kelimelerle karşılıklarını eşleştirirsin |
| **Listening** | Kelime sesli okunur, duyduğunu yazarsın |
| **AI quiz** | Yapay zekâ o kelimeler için yepyeni bağlam soruları yazar |
| **Writing coach** | Kendi cümleni yazarsın, yapay zekâ puanlar ve düzeltir |

"Which words" seçeneğiyle sadece zamanı gelenleri, en zorlandıklarını ya da hiç
başlamadıklarını çalışabilirsin. **Count towards scheduling** açıkken testte kaçırdığın
kelime tekrar programında öne alınır.

Seslendirme, bilgisayarında zaten yüklü olan sesleri kullanır — internet gerekmez, ücretsizdir.

---

## 7. Görünüm

**Settings → Appearance** altında:

- **8 tema:** Dark, Light, Midnight, Nord, Forest, Sepia, Rose, Mono
- **8 vurgu rengi:** Indigo, Blue, Teal, Emerald, Amber, Rose, Violet, Slate
- **5 yazı tipi:** Sans, Rounded, Serif, Humanist, Mono
- **3 yazı boyutu**

Üst çubuktaki ay simgesiyle aydınlık/karanlık arasında hızlıca geçiş yapabilirsin.
Seçimlerin kaydedilir.

---

## 8. Yapay zekâ (isteğe bağlı — sorunun cevabı)

**Evet, mümkün ve ücretsiz seçenekler var.** Uygulama AI olmadan da eksiksiz çalışır;
AI yalnızca dört yerde devreye girer:

1. **Kart otomatik doldurma** — sadece kelimeyi yaz, tanım/örnek/çeviri/kategori dolsun
2. **Deste üretme** — "job interviews, B2, 15 kelime" de, hazır deste gelsin
3. **AI quiz** — her seferinde yeni bağlam cümleleriyle sorular + açıklamalar
4. **Writing coach** — yazdığın cümleyi puanlar, düzeltir, Türkçe kısa not verir

### Kurulum

**Settings → AI assistant → Enable AI features** → bir sağlayıcı düğmesine bas
(ayarlar otomatik dolar) → anahtarını yapıştır → **Test the connection**.

| Sağlayıcı | Maliyet | Anahtar nereden |
|---|---|---|
| **Google Gemini** | **Ücretsiz katman var** — başlamak için en iyisi | aistudio.google.com/apikey |
| **Groq** | **Ücretsiz katman**, çok hızlı | console.groq.com/keys |
| **OpenRouter** | `:free` etiketli modeller ücretsiz | openrouter.ai/keys |
| **OpenAI** | Ücretli ama çok ucuz (`gpt-4o-mini`) | platform.openai.com/api-keys |
| **DeepSeek** | Ücretli, çok ucuz | platform.deepseek.com |
| **Ollama** | **Tamamen ücretsiz**, kendi bilgisayarında, internetsiz | ollama.com |

### Elindeki OpenAI anahtarıyla maliyet

Bir kart doldurma veya bir quiz sorusu yaklaşık 500–1.500 token eder.
`gpt-4o-mini` ile bu **sentin küçük bir kesri** demektir: her gün yoğun kullansan bile
aylık maliyet genelde **1 doların altında** kalır. Pahalı modellere ihtiyaç yok —
bu iş için küçük modeller fazlasıyla yeterli.

### Anahtarın güvenliği

Anahtarın yalnızca **senin tarayıcında** saklanır ve sadece seçtiğin sağlayıcıya gider.
Ne bize ne başka bir sunucuya iletilir — zaten uygulamanın bir sunucusu yok.
Yine de bu dosyaları başkasıyla paylaşacaksan anahtarını önce Settings'ten sil.

> **Not:** Gemini, dosyaya çift tıklayarak açtığın halde bile çalışacak şekilde
> test edildi. Bir sağlayıcıda "Could not reach the AI provider" hatası alırsan
> aşağıdaki *Sorun giderme* adımını uygula — bu tarayıcının güvenlik kuralıyla ilgilidir,
> anahtarınla değil.

---

## 9. Kelime aktarma

- **CSV içe aktarma:** Browse → **Import**. Sütun sırası:
  `term, part of speech, definition, example, translation, category`.
  Başlık satırı varsa otomatik algılanır. Dosya seçebilir veya satırları yapıştırabilirsin.
- **CSV dışa aktarma:** Browse → **Export CSV** (Excel'de açılır).
- **Tam yedek:** Settings → **Download backup (.json)** — istatistikler dahil her şey.

---

## 10. Klavye kısayolları

| Tuş | İşlev |
|---|---|
| `Space` | Cevabı göster / devam et |
| `1` `2` `3` `4` | Kartı değerlendir veya test şıkkını seç |
| `S` | Kelimeyi sesli oku |
| `U` | Son cevabı geri al |
| `N` | Yeni kelime ekle |
| `Esc` | Pencereyi kapat / seansı bitir |
| `D` `K` `S` `P` `B` `G` | Ekranlar arası geçiş |

---

## 11. Sorun giderme

**"Bu tarayıcı yerel depolamayı engelliyor" uyarısı alıyorum / ilerleme kaydedilmiyor**
Tarayıcı, dosyadan açılan sayfalara veri yazmayı engelliyordur (çoğunlukla Safari veya
gizli sekme). Çözüm: klasördeki **`sunucu-baslat.command`** (Mac) veya
**`sunucu-baslat.bat`** (Windows) dosyasına çift tıkla, sonra tarayıcıda
`http://localhost:8000` adresini aç. Aynı uygulama, bu kez normal bir web sayfası gibi
çalışır ve kaydetme sorunsuz olur. (Bu dosyalar bilgisayarında Python gerektirir;
yoksa Chrome veya Firefox kullanmak da sorunu çözer.)

**AI "Could not reach the AI provider" diyor**
Aynı çözüm: yukarıdaki yerel sunucu dosyasını kullan. Tarayıcılar, dosyadan açılan
sayfaların bazı sunuculara istek atmasını engelleyebiliyor; sayfa `http://localhost`
üzerinden açıldığında bu kısıt kalkar.

**Sesli okuma çalışmıyor**
İşletim sisteminde İngilizce ses paketi yüklü olmayabilir. Windows'ta
Ayarlar → Saat ve Dil → Konuşma bölümünden İngilizce ses eklenebilir.

**Kartlarım kayboldu**
Tarayıcı verileri temizlenmiş olabilir. Settings → **Restore from backup** ile
son `.json` yedeğini geri yükle.

---

## 12. Dosyalar

```
index.html   arayüz iskeleti — açılacak dosya budur
styles.css   tasarım, temalar, renkler
data.js      başlangıç desteleri (66 kelime) ve tema/font listeleri
srs.js       aralıklı tekrar algoritması
storage.js   kaydetme, yedekleme, içe/dışa aktarma, istatistik hesapları
ai.js        isteğe bağlı yapay zekâ katmanı
app.js       ekranlar, çalışma seansı, test motoru
```

Hiçbir dış kütüphane, derleme adımı veya paket kurulumu yoktur.
