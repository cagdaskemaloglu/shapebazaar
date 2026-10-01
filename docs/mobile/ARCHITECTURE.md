# ShapeBazaar Mobile — Mimari Kararlar

> Bu doküman, ShapeBazaar'ın React Native/Expo mobil uygulamasına geçişi için
> alınan mimari kararları ve gerekçelerini kayıt altına alır. Hem insan
> geliştiricilerin hem de bu projede çalışacak Claude oturumlarının referans
> alması için yazılmıştır.
>
> **Durum:** Kararlar alındı, geliştirme henüz başlamadı.
> **Kapsam (v1):** Sadece alıcı (buyer) akışı — browse, sepet, ödeme, sipariş takibi.
> Tasarımcı/partner/admin panelleri v1'de YOK, web'de kalmaya devam ediyor.

---

## 1. Teknoloji Yığını

| Katman | Seçim | Gerekçe |
|---|---|---|
| Framework | **React Native + Expo** (managed workflow, EAS Build) | Ekip zaten React/TypeScript biliyor; Expo App Store/Play Store build sürecini (imzalama, provisioning) büyük ölçüde otomatikleştiriyor. |
| Backend | **Aynı Supabase projesi** (ayrı backend YOK) | Supabase JS client RN'de birebir çalışıyor. Aynı DB, aynı RLS politikaları, aynı Storage bucket'ları — sıfır backend tekrarı. |
| Sunucu tarafı işlemler (ödeme vb.) | **Mevcut Next.js API route'ları** (`apps/web/src/app/api/*`) | Mobil app bunlara HTTPS ile istek atar. İyzico entegrasyonu, admin işlemleri gibi server-only mantık ikinci kez yazılmaz. |
| State yönetimi | **Zustand** (cart.ts zaten bunu kullanıyor) | RN'de sorunsuz çalışır, web ile aynı store mantığı `packages/shared`'a taşınabilir. |
| Stil | **NativeWind** (Tailwind sınıflarını RN'de kullanmayı sağlıyor) | Web'deki `className="text-sm text-[var(--text-primary)]..."` alışkanlığını büyük ölçüde korur, iki ayrı stil dili öğrenmeye gerek kalmaz. |
| 3D Viewer | **expo-gl + expo-three** (native render, saf Three.js — react-three-fiber DEĞİL) | WebView'a göre çok daha akıcı. İlk planda react-three-fiber vardı ama Faz 3'te, Expo SDK 57 ile r3f'in `expo-gl` sürüm bağımlılığı arasında bilinen bir uyumsuzluk (gerçek cihazda çökme riski) tespit edildi; bu yüzden web'deki `ModelViewer.tsx` ile birebir aynı yaklaşıma (saf Three.js sahne yönetimi, GLView üzerinde) geçildi. Daha az soyutlama katmanı, daha az sürüm çakışması riski. |
| Navigasyon | **Expo Router** (dosya tabanlı, Next.js App Router'a kavramsal olarak çok yakın) | Next.js'teki `[locale]/models/[id]` gibi dinamik route alışkanlığı doğrudan taşınır. |
| i18n | **i18next + react-i18next** (mesaj JSON yapısı web'dekiyle aynı desende) | `messages/en.json`/`tr.json`'daki alıcı-kapsamındaki namespace'ler (`modelDetail`, `modelsPage`, `cart`, `auth`, vb.) doğrudan referans alınarak kopyalanır. |
| Push bildirim | **Expo Notifications** (v1 sonrası, Faz 7) | Sipariş durum güncellemeleri için. |

---

## 2. Repo Yapısı (Monorepo)

```
shapebazaar/                     ← repo kökü
├── apps/
│   ├── web/                     ← mevcut Next.js uygulaması (taşınacak)
│   │   ├── src/
│   │   ├── public/
│   │   ├── next.config.ts
│   │   └── package.json
│   └── mobile/                  ← yeni Expo uygulaması
│       ├── app/                 ← Expo Router route'ları
│       ├── components/
│       ├── CLAUDE.md            ← mobile'a özel yönergeler (bkz. ayrı dosya)
│       └── package.json
├── packages/
│   └── shared/                  ← iki app'in de kullandığı ortak kod
│       ├── pricing/             ← printPricing.ts (birebir taşınır, sıfır bağımlılık)
│       ├── types/                ← Model, Order, CartItem, Profile vb. TS tipleri
│       ├── constants/            ← CATEGORIES, MATERIALS, COLORS, SCALES, INFILLS
│       ├── queries/               ← fetchModels gibi Supabase sorgu fonksiyonları
│       │                            (supabase client dışarıdan inject edilir)
│       └── package.json
├── supabase/                     ← DEĞİŞMEZ, kökte kalır (tek backend, iki app paylaşır)
├── package.json                  ← root workspace tanımı (npm workspaces)
└── .github/workflows/            ← DEĞİŞMEZ (migration workflow zaten kökte)
```

**Paket yöneticisi:** npm workspaces (zaten npm kullanılıyor, yeni bir araç
öğrenmeye gerek yok). İleride build cache/paralel build gerekirse Turborepo
eklenebilir — v1 için şart değil.

**Neden `packages/shared`'a `printPricing.ts` taşınıyor?** Bu dosya zaten
Next.js'e hiçbir bağımlılığı olmayan saf TypeScript — taşınması sıfır risk,
ve bu oturumda gördüğümüz gibi (aynı hesaplama mantığının iki yerde ayrı ayrı
yazılıp senkron kalması gereken senaryo) tam olarak önlemek istediğimiz
tekrar türünden.

---

## 3. Auth Stratejisi

- Aynı Supabase Auth projesi, aynı kullanıcı tablosu.
- RN tarafında `@supabase/supabase-js` + `@react-native-async-storage/async-storage`
  (session persistence için).
- E-posta/şifre girişi: web'deki `LoginForm`/`RegisterForm` mantığının RN
  karşılığı — aynı Supabase çağrıları (`signInWithPassword`, `signUp`).
- Google OAuth: `expo-auth-session` ile deep-link tabanlı redirect akışı
  (web'deki gibi popup değil, mobilde native tarayıcı açılıp uygulamaya geri döner).
- Şifremi unuttum akışı: web'de zaten kurulu olan `resetPasswordForEmail` /
  `updateUser` akışının aynısı — deep link `redirectTo` mobil app scheme'ine
  (`shapebazaar://auth/reset-password`) yönlendirilir.

---

## 4. Ödeme Stratejisi (İyzico + Store Politikaları)

**Önemli uyumluluk notu:** ShapeBazaar **fiziksel ürün** (3D baskı) satıyor,
dijital içerik/hizmet değil. Bu yüzden Apple'ın "harici ödeme kullanılamaz,
In-App Purchase şart" kuralı **buraya uygulanmaz** — fiziksel mal/hizmet
satışı İyzico gibi harici bir ödeme sağlayıcısıyla App Store/Play Store
kurallarına uygun şekilde yapılabilir. (Bu konuda başvuru öncesi güncel
App Store Review Guidelines 3.1.3 ve Play Store Payments Policy'yi tekrar
kontrol etmenizi öneririm — politikalar zaman zaman güncelleniyor.)

**Akış:**
1. Mobil app, mevcut `POST /api/payment/init` route'una istek atar (aynı endpoint, web'de kullanılan).
2. Dönen İyzico checkout URL'i bir **in-app browser** (`expo-web-browser`) içinde açılır.
3. Ödeme tamamlanınca İyzico, mevcut `/api/payment/callback` route'una server-side post eder (bu değişmez).
4. Mobil app, deep link veya polling ile sipariş durumunu kontrol edip kullanıcıyı "Sipariş Alındı" ekranına yönlendirir.

Bu sayede İyzico entegrasyonu (imza doğrulama dahil, Faz 1'de güvenli olduğunu
doğruladığımız kısım) **hiç değişmeden** iki platformda da çalışır.

---

## 5. Neler Web'de Kalıyor (v1 kapsamı DIŞINDA)

- Tasarımcı model yükleme/düzenleme (`/upload`, `/models/[id]/edit`)
- Partner (yazıcı ortağı) paneli
- Admin paneli
- "Nasıl Çalışır" / Misyon-Vizyon gibi içerik sayfaları (mobilde basit bir WebView linkiyle veya hiç gösterilmeyebilir)

Bunlar v1 sonrası ayrı fazlarda değerlendirilecek (bkz. `ROADMAP.md`).
