# ShapeBazaar Mobile — Mimari Kararlar

> Bu doküman, ShapeBazaar'ın React Native/Expo mobil uygulamasına geçişi için
> alınan mimari kararları ve gerekçelerini kayıt altına alır.
>
> **Durum:** Faz 0-3 tamamlandı ve test edildi. Faz 4 kod olarak hazır. Faz 5
> (ödeme) devam ediyor. Detaylı ilerleme için `ROADMAP.md`.
> **Kapsam (v1):** Sadece alıcı (buyer) akışı.

---

## 1. Teknoloji Yığını

| Katman | Seçim | Gerekçe / Not |
|---|---|---|
| Framework | React Native + Expo (SDK 57) | — |
| Backend | Aynı Supabase projesi | Web ile birebir aynı DB, RLS, Storage. |
| Sunucu tarafı işlemler | Mevcut Next.js API route'ları (`apps/web/src/app/api/*`) | Mobil, `createRequestClient()` ile hem Bearer token (mobile) hem cookie (web) destekleyen route'ları çağırır — bkz. Bölüm 4. |
| State yönetimi | Zustand (`packages/shared/src/cart/`) | `createCartStore(storage?)` — web `localStorage`, mobile `AsyncStorage`. |
| Stil | NativeWind (`4.1.23` — **caret kullanmayın**, `4.2.x` bozuk) | Web'deki Tailwind alışkanlığını korur. |
| 3D Viewer | `expo-gl` + `expo-three` (saf Three.js, react-three-fiber DEĞİL) | Bkz. Bölüm 2 — bu karar birkaç kez revize edildi. |
| Navigasyon | Expo Router | Next.js App Router'a kavramsal olarak yakın. |
| i18n | i18next + react-i18next + expo-localization | `nav`/`auth` namespace'leri web'den taşındı. |
| Ödeme (mobile) | `react-native-webview` | Bkz. Bölüm 4 — bir URL değil, ham HTML/JS render ediliyor. |

---

## 2. 3D Viewer — Kararın Evrimi (önemli, tekrar keşfetmeyin)

**İlk plan:** `react-three-fiber`. **Terk edildi:** Expo SDK 57 ile r3f'in
`expo-gl` peer sürüm bağımlılığı arasında bilinen bir uyumsuzluk (gerçek
cihazda çökme riski) bulundu.

**İkinci plan (uygulanan):** `expo-gl` + `expo-three`, web'deki
`ModelViewer.tsx` ile aynı yaklaşım (saf Three.js sahne yönetimi, GLView
üzerinde). Bu yolda karşılaşılan ve çözülen sorunlar:

1. **`THREE.WebGLRenderer: WebGL 1 is not supported since r163`** — three.js
   r163'ten itibaren WebGL1 desteğini kaldırdı, ama `expo-gl`'in verdiği
   context (mevcut `expo-three@8.0.0` ile birlikte kullanıldığında) WebGL1
   varsayıyor. **Çözüm:** `three` sürümünü `0.162.0`'a sabitledik. `npm ls`
   bir "invalid peer" uyarısı verecek (expo-three `^0.166.0` istiyor) — bu
   zararsız, three.js'in WebGL1 kaldırma sınırı (r163) expo-three'nin beyan
   ettiği peer aralığından daha kritik.

2. **`ProgressEvent doesn't exist` / `Cannot convert null value to object`** —
   `loader.load(url, ...)` metodu tarayıcıya özgü `FileLoader`/`XMLHttpRequest`
   altyapısını kullanıyor, RN'de yok. **Çözüm:** dosyayı RN'in `fetch()`'i ile
   indirip loader'ın `.parse(data)` metoduna vermek (`.load()` hiç
   kullanılmıyor).

3. **3MF formatı: "Cannot read property 'mesh' of undefined"** —
   `ThreeMFLoader`'ın kendisi three.js'in tarayıcıya özgü DOM/XML API'lerine
   dayanıyor. Bir DOMParser polyfill'i (`@xmldom/xmldom`) denendi, muhtemelen
   `querySelector` desteklemediği için başarısız oldu. **Karar: 3MF formatı
   mobile v1'den bilinçli olarak kapsam dışı bırakıldı.** STL ve OBJ test
   edildi ve çalışıyor; 3MF modelleri mobile'da "desteklenmiyor, web'de
   görüntüleyin" mesajı gösteriyor, web'de sorunsuz çalışmaya devam ediyor.

4. **Rotasyon jesti aşırı hassastı** (küçük dokunuşta model birkaç tur
   dönüyordu) — `PanResponder`'ın `gesture.dx`/`gesture.dy` değerleri jestin
   BAŞINDAN BERİ kümülatiftir, her `onPanResponderMove` çağrısında bunu
   doğrudan rotasyona eklemek üstel bir birikime yol açıyordu. **Çözüm:** bir
   önceki değerden farkı (delta) alıp eklemek.

5. **ScrollView, viewer'ın dokunma jestini çalıyordu** (sayfa kayıyordu) —
   capture-fazı `PanResponder` handler'ları tek başına yeterli olmadı.
   **Çözüm:** `ModelViewer3D`'ye bir `onInteractionChange(active: boolean)`
   prop'u eklendi; üst ekran, kullanıcı viewer'a dokunduğu sürece kendi
   `ScrollView`'ını `scrollEnabled={false}` ile native seviyede kapatıyor.

---

## 3. Repo Yapısı (Monorepo)

```
shapebazaar/
├── apps/
│   ├── web/          ← Next.js (Vercel Root Directory: apps/web)
│   └── mobile/        ← Expo Router
├── packages/
│   └── shared/
│       ├── src/pricing/       ← calcPrintCost, calcTotalPrice
│       ├── src/types/          ← Model, Order (CartItem BURADA DEĞİL, cart/'ta)
│       ├── src/constants/       ← CATEGORIES, MATERIALS, COLORS, SCALES, INFILLS
│       ├── src/queries/models.ts ← fetchModels, fetchModel, canRateModel, fetchRatings, submitRating
│       ├── src/storage/          ← getModelPublicUrl, getModelSignedUrl
│       └── src/cart/              ← createCartStore (CartItem tipi burada, tek kaynak)
├── supabase/           ← değişmez, kökte
└── .github/workflows/    ← değişmez, kökte
```

**Dikkat:** `CartItem` tipi SADECE `cart/index.ts`'te tanımlı olmalı. Daha
önce `types/index.ts`'te de bir kopyası vardı, `index.ts`'in "ambiguous
export" hatası vermesine yol açmıştı — silindi.

---

## 4. Ödeme Stratejisi — Gerçek Akış (ilk taslaktan revize edildi)

**Önemli düzeltme:** `/api/payment/init` bir **yönlendirme URL'i döndürmüyor**.
İyzico'nun "Checkout Form" API'sinden gelen ham `checkoutFormContent` (HTML +
`<script>` içeren bir string) döndürüyor — web'de `CartDrawer.tsx` bunu bir
`<div>`'in `innerHTML`'ine yazıp tarayıcı DOM'unda çalıştırıyor. Bu, mobilde
`expo-web-browser`'ın `openAuthSessionAsync`'i ile AÇILAMAZ (bir URL değil).

**Doğru akış:**
1. Mobile, `POST /api/payment/init`'e `Authorization: Bearer <access_token>`
   header'ıyla istek atar (`createRequestClient()` bunu destekliyor).
2. Dönen `checkoutFormContent`, basit bir HTML doküman şablonuna sarılıp
   `react-native-webview`'a `source={{ html: ... }}` olarak verilir. İçerik
   `innerHTML` ile değil, statik HTML olarak `<body>`'ye gömülür; böylece
   WebView'in parser'ı `<script>`'leri kendisi çalıştırır. Sunucu tarafında
   hiçbir değişiklik gerekmez.
3. Ödeme tamamlanınca İyzico, mevcut `/api/payment/callback` route'una
   server-side post eder (değişmedi) ve `${SITE_URL}/tr/payment/success?orderId=...`
   veya `/tr/payment/failed`'e redirect eder.
4. Mobile, WebView'ın `onNavigationStateChange`'ini izleyip URL bu pattern'e
   uyunca WebView'i kapatıp native bir "Sipariş Alındı" ekranına geçer.

**Kimlik doğrulama:** `/api/payment/init` (ve mobile'ın çağıracağı diğer
route'lar) `apps/web/src/lib/supabase/requestClient.ts`'teki
`createRequestClient(req)`'i kullanmalı — hem web'in cookie'sini hem
mobile'ın Bearer token'ını destekler, RLS sorguları her iki durumda da doğru
kullanıcı kimliğiyle çalışır. **Sadece token'ı doğrulamak yetmez** — dönen
`supabase` client'ının kendisi de o kullanıcı kimliğiyle donatılmış olmalı,
yoksa sonraki `.from(...)` sorguları RLS tarafından sessizce engellenir.

**Store politikası notu (değişmedi):** ShapeBazaar fiziksel ürün sattığı için
Apple/Google'ın In-App Purchase zorunluluğu buraya uygulanmıyor — başvuru
öncesi güncel politikaları tekrar kontrol edin.

---

## 5. Neler Web'de Kalıyor (v1 kapsamı DIŞINDA)
- Tasarımcı model yükleme/düzenleme, Partner paneli, Admin paneli
- 3MF format desteği (mobile — bkz. Bölüm 2)
- "Nasıl Çalışır" / Misyon-Vizyon gibi içerik sayfaları
