# ShapeBazaar Mobile — Claude için Yönergeler

Bu dosya, `apps/mobile/` içinde çalışan herhangi bir Claude (Code) oturumunun
ilk okuması gereken dosyadır. Amacı: web uygulamasıyla tutarlı, tekrar
üretmeyen, mağaza onayına hazır bir mobil uygulama inşa etmek.

## 📍 Güncel durum (bkz. `docs/mobile/ROADMAP.md` için tam detay)
Faz 0-3 tamamlandı ve gerçek cihazda test edildi. Faz 4 (sepet) ve **Faz 5
(ödeme: `app/checkout.tsx` WebView akışı, success/failed ekranları)** kod olarak
hazır; cihazda uçtan uca test bekliyor. Faz 5.1 düzeltmeleri (Google girişi, sekmeler, Ara ekranı) uygulandı. Sıradaki iş: web deploy +
ödeme testi, sonra **Faz 6 (Siparişler & Takip)**. Devam eden bir
Claude oturumu önce `ROADMAP.md`'yi okumalı.

## Proje bağlamı
ShapeBazaar, Türkiye merkezli bir 3D baskı pazaryeri. Tasarımcılar model
yüklüyor, alıcılar seçip sipariş veriyor, yazıcı ortakları basıp kargoluyor.
Bu mobil app **sadece alıcı akışını** kapsıyor (v1). Detaylar için:
- `../../docs/mobile/ARCHITECTURE.md` — mimari kararlar ve gerekçeleri
- `../../docs/mobile/ROADMAP.md` — hangi fazda neyin yapıldığı/yapılacağı
- `../web/` — referans alınacak mevcut web implementasyonu

## Altın kural: Web'i referans al, kopyalama
Bir ekran/akış üzerinde çalışırken önce `apps/web/src/components/` içinde
karşılığını bul ve iş mantığını oradan anla. Ama:
- UI kodu **birebir port edilmez** — RN'in kendi bileşen/layout mantığı kullanılır.
- İş mantığı (fiyat hesabı, validasyon kuralları) **kopyalanmaz**,
  `packages/shared`'dan import edilir.

## ⚠️ Bu projede zor yoldan öğrenilenler (tekrar keşfetme)

### 1. Native 3D viewer — paket sürümleri kırılgan
- `three` sürümü **`0.162.0`'a sabitli kalmalı** (üstüne çıkma). r163+
  `WebGLRenderer`'dan WebGL1 desteğini kaldırdı, `expo-gl`'in verdiği context
  ise (şu anki `expo-three@8.0.0` ile) WebGL1 varsayıyor. `npm ls three`
  "invalid" peer uyarısı verecek (`expo-three` `^0.166.0` istiyor) — bu
  **beklenen ve zararsız**, göz ardı edin.
- `nativewind` **tam `4.1.23`'e sabitli kalmalı** (caret `^` kullanmayın).
  `4.2.x` sürümleri `react-native-worklets/plugin` bulunamadı hatasıyla
  bundling'i tamamen durduruyor.
- `app.json`'da `icon`/`splash`/`adaptiveIcon` alanları YOK — gerçek görsel
  dosyaları eklenene kadar (Faz 8) böyle kalmalı, yoksa bundling asset
  hatasıyla çöküyor.

### 2. Three.js loader'ları `.load()` değil `.parse()` ile kullanılmalı
`STLLoader`/`OBJLoader`'ın `.load(url, ...)` metodu, tarayıcıya özgü
`FileLoader`/`XMLHttpRequest`/`ProgressEvent` altyapısını kullanıyor — RN'de
bunlar yok, "ProgressEvent doesn't exist" hatası verir. Doğru desen: dosyayı
RN'in kendi `fetch()`'i ile indirip (`arrayBuffer()` veya `text()`), loader'ın
`.parse(data)` metoduna vermek. `ModelViewer3D.tsx`'teki `loadModelFile()`
fonksiyonu bu deseni uyguluyor, yeni bir loader eklerken aynı yaklaşımı takip
edin.

### 3. 3MF formatı desteklenmiyor (bilinçli karar)
`ThreeMFLoader`, three.js'in tarayıcıya özgü DOM/XML API'lerine (muhtemelen
`querySelector`) dayanıyor. İki farklı düzeltme denendi (DOMParser polyfill
dahil), ikisi de "Cannot read property 'mesh' of undefined" hatasını
çözemedi. **Bu formatı mobile'da desteklemeye çalışmayın** — `ModelViewer3D`
zaten 3mf dosyalarını yüklemeden "desteklenmiyor" mesajı gösteriyor. Eğer
ileride tekrar denenecekse: three.js'in kullandığı DOM API'lerini tam
destekleyen ağır bir XML/DOM kütüphanesi (`@xmldom/xmldom` yetersiz kaldı)
veya 3MF'in XML içeriğini elle (regex/manuel string parsing ile,
DOMParser'a hiç dokunmadan) ayrıştıran özel bir mini-parser gerekebilir —
ciddi bir efor, düşük öncelik.

### 4. PanResponder + ScrollView çakışması
Bir jest alanı (3D viewer gibi) bir `ScrollView` içindeyse:
- PanResponder'da **capture-fazı** handler'ları (`onStartShouldSetPanResponderCapture`,
  `onMoveShouldSetPanResponderCapture`) ve `onPanResponderTerminationRequest: () => false`
  şart, ama tek başına iOS'ta yeterli olmayabiliyor.
- En güvenilir çözüm: `onTouchStart`/`onTouchEnd` ile üst ekrana bir
  "kullanıcı şu an viewer'a dokunuyor" sinyali gönderip, o sırada
  `ScrollView`'ı `scrollEnabled={false}` ile **native seviyede** kapatmak.
  `ModelViewer3D`'nin `onInteractionChange` prop'u bunun için var.
- PanResponder'da `gesture.dx`/`gesture.dy` **jestin başından beri kümülatif**
  değerlerdir, frame-başı delta değil — her `onPanResponderMove`'da doğrudan
  toplamaya eklemeyin, bir önceki değerden farkını (delta) alın
  (`onPanResponderGrant`'te sıfırlayıp izleyin).

### 5. `models.file_url` tam URL değil, storage path'tir
Supabase Storage'dan bir model dosyasını çekmeden önce MUTLAKA
`getModelPublicUrl(supabase, model.file_url)` (`@shapebazaar/shared`) ile
tam URL'e çevirin. Ham path'i doğrudan `fetch()`'e vermek 404 verir.

## Stil ve bileşen kuralları
- NativeWind kullan (Tailwind sınıfları), web'deki renk token'larıyla birebir
  aynı hex değerleri — `tailwind.config.js`'de tema olarak tanımlı.
- Component dosya adlandırması web ile aynı desende: `PascalCase.tsx`.

## i18n kuralları
- Çeviri anahtarları **web'deki `messages/en.json`/`tr.json` ile aynı isim ve
  yapıda** olmalı. Sadece alıcı akışında kullanılan namespace'leri taşı.
- next-intl'in `t.rich()` kalıpları i18next'te `Trans` component'i + `{{degisken}}`
  (çift süslü parantez) interpolasyon sözdizimiyle karşılanıyor.

## Asla yapılmaması gerekenler
- **Fiyat hesaplama mantığını mobile'da yeniden yazma.** `packages/shared`'dan import et.
- **İyzico'yu native bir SDK ile entegre etmeye çalışma.** Ödeme, mevcut
  `/api/payment/*` route'ları + WebView üzerinden yürütülüyor (bkz.
  ARCHITECTURE.md). Route'lar Bearer token (`createRequestClient`) destekliyor.
- **Yeni bir Supabase projesi/tablosu oluşturma.** Aynı backend, aynı şema.
- **RLS politikalarını mobile tarafında "bypass etmek" için service-role key kullanma.**
- **`three` veya `nativewind` sürümünü yukarı çekme** (bkz. yukarıdaki "zor
  yoldan öğrenilenler") — özellikle `npx expo install --fix` bu sürümleri
  "düzeltmeye" çalışabilir, çalıştırdıktan sonra `package.json`'da bu iki
  paketin sürümünü tekrar kontrol edin.

## Bir özellik eklerken izlenecek sıra
1. `ROADMAP.md`'de hangi fazda olduğunu kontrol et, sırayı atlama.
2. Web'deki karşılığını oku.
3. Paylaşılması gereken bir iş mantığı varsa, önce `packages/shared`'a taşı/ekle.
4. Mobile ekranını/bileşenini yaz.
5. TR ve EN'de test et.
