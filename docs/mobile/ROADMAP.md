# ShapeBazaar Mobile — Yol Haritası (v1: Sadece Alıcı)

> Her faz, kendinden önceki fazın üzerine inşa edilecek şekilde sıralandı.
> Bir faz bitmeden bir sonrakine geçilmemeli — özellikle Faz 0 (monorepo)
> tamamlanmadan mobile kodu yazılmaya başlanmamalı.

## Faz 0 — Monorepo Geçişi ✅ TAMAMLANDI
📄 Ayrıntılı adımlar: `MONOREPO_MIGRATION.md`
- [x] Web uygulaması `apps/web/`'e taşındı, deploy hâlâ çalışıyor
- [x] `packages/shared/` oluşturuldu, `printPricing.ts` taşındı
- [x] Root workspace kuruldu, `npm install` kökte çalışıyor
- [x] Bonus: `CATEGORIES`/`MATERIALS`/`COLORS`/`SCALES`/`INFILLS` sabitleri ve temel domain tipleri (`Model`/`Order`/`CartItem`) de `packages/shared`'a taşındı (Adım 9, erken tamamlandı)

## Faz 1 — Expo İskeleti & Tasarım Sistemi
- [x] `apps/mobile/` proje iskeleti elle oluşturuldu (Claude'un sandbox'ında network erişimi olmadığı için `npx create-expo-app` çalıştırılamadı — Expo SDK 57 + Expo Router + NativeWind konvansiyonlarına göre dosyalar elle yazıldı). **Sizin yapmanız gereken:** `npm install` sonrası `npx expo install --fix` çalıştırarak sürümleri Expo'nun kendi uyumluluk kontrolünden geçirin.
- [x] Expo Router ile temel navigasyon iskeleti: Tab bar (Ana Sayfa / Ara / Sepet / Siparişlerim / Profil) — şimdilik markalı placeholder ekranlar
- [x] NativeWind kuruldu, web'deki renk paleti (`#FF6B35`, `#10B981`, `#1E293B`, `#F8FAFC`) `tailwind.config.js`'de `brand.*` olarak tanımlandı
- [x] `apps/mobile/CLAUDE.md` oluşturuldu
- [ ] **Eksik — sizin tamamlamanız gerekiyor:** `assets/icon.png`, `assets/splash.png`, `assets/adaptive-icon.png` gerçek görsel dosyaları (Claude görsel üretemez/yükleyemez, `app.json` şu an bunlara referans veriyor ama dosyalar yok — ilk build'de hata verir)
- [ ] EAS hesabı/projesi bağlandı (`eas init`), ileride build almak için — interaktif giriş gerektirdiği için sizin terminalinizde yapılmalı

## Faz 2 — Auth & i18n
- [x] Supabase client kurulumu (`lib/supabase.ts`, AsyncStorage ile session persistence + `react-native-url-polyfill`)
- [x] Giriş / Kayıt / Şifremi Unuttum / Şifre Sıfırlama ekranları (`app/auth/*.tsx`) — web'deki `LoginForm`/`RegisterForm`/`ForgotPasswordForm`/`ResetPasswordForm` akışlarının mobil karşılığı, `lib/auth/AuthProvider.tsx` üzerinden
- [x] Google OAuth eklendi (`AuthProvider.signInWithGoogle`, expo-auth-session + expo-web-browser) — **ama test edilmedi.** Kendi Google Cloud Console OAuth client'ınızı oluşturup Supabase Dashboard → Authentication → URL Configuration'a `shapebazaar://` şemasını eklemeniz, sonra gerçek cihazda denemeniz gerekiyor. Bu entegrasyon Expo+Supabase ekosisteminde bilinen kırılganlıklara sahip — ilk denemede çalışmayabilir.
- [x] i18next kurulumu (`lib/i18n/`), `nav` ve `auth` namespace'leri web'den birebir aynı anahtar isimleriyle taşındı. `modelsPage`/`modelDetail`/`cart`/`rating`/`hero`/`howItWorks` bilerek taşınmadı — o ekranlar henüz yazılmadığı için (Faz 3/4/6'da, ilgili ekran yazılırken taşınacak, CLAUDE.md'deki kural gereği)
- [x] Dil değiştirme çalışıyor — `expo-localization` ile cihaz diline bakılıyor, `tr`/`en` dışında bir şey gelirse `tr`'ye düşülüyor

## Faz 3 — Browse & Model Detayı
- [x] `packages/shared/src/queries/models.ts` — `fetchModels`, `fetchModel`, `incrementViewCount`, `canRateModel`, `fetchRatings`, `submitRating` — hepsi client-agnostic (Supabase client dışarıdan inject ediliyor). Web'in `lib/models.ts` ve `RatingSection.tsx`'i de bu fonksiyonlara bağlandı (ince wrapper'lar üzerinden) — artık aynı mantık tek yerde.
- [x] Model listesi ekranı (Ana Sayfa sekmesi): arama, kategori filtresi (chip listesi), fiyat filtresi — **not: tam bir dual-thumb slider yerine hazır fiyat aralığı seçenekleri (Ücretsiz/₺100 altı/₺250 altı/Tümü) kullanıldı**, RN'de native bir slider ek bağımlılık ve gesture kodu gerektirdiği için v1'de basitleştirildi. İsterseniz sonra web'deki gibi tam slider'a yükseltebiliriz.
- [x] Model detay ekranı (`app/models/[id].tsx`): başlık/açıklama (TR/EN locale-aware), fiyat, tasarımcı bilgisi, değerlendirmeler — hepsi çalışıyor
- [x] **Native 3D viewer** (`components/ModelViewer3D.tsx`) — **plan değişti:** react-three-fiber yerine `expo-three` + `expo-gl` (saf Three.js sahne yönetimi, web'deki `ModelViewer.tsx` ile aynı yaklaşım) kullanıldı. Sebep: Expo SDK 57 ile `@react-three/fiber`'ın `expo-gl` sürüm bağımlılığı arasında bilinen bir uyumsuzluk tespit edildi (bkz. ARCHITECTURE.md güncellemesi). **⚠️ Bu bileşen gerçek cihazda test edilmedi** — simülatör/emülatörde Three.js+EXGL güvenilir çalışmıyor, mutlaka fiziksel telefonda deneyin.
- [x] Değerlendirme formu — satın alma şartı kontrolü `canRateModel()` ile yapılıyor (RLS zaten server-side koruyor)

## Faz 4 — Sepet & Yapılandırma
- [x] Zustand cart store `packages/shared/src/cart/`'a taşındı — `createCartStore(storage?)` fabrika fonksiyonu, web'de `localStorage` (varsayılan, davranış değişmedi), mobile'da `AsyncStorage` ile persist ediliyor
- [x] Malzeme/renk/boyut/dolgu seçimi model detay ekranında (`app/models/[id].tsx`) — `packages/shared`'daki `MATERIALS`/`COLORS`/`SCALES`/`INFILLS` sabitleri kullanılıyor
- [x] Fiyat hesaplaması `packages/shared`'daki `calcPrintCost`/`calcTotalPrice`'tan geliyor — web ile birebir aynı sonuç garantisi
- [x] Sepet ekranı (Sepet sekmesi): ürün listesi (kaldırma butonu ile), adres formu, ara toplam/kargo/toplam özeti. **Not:** "adım göstergesi" (multi-step wizard) yerine tek ekranlı, kaydırılabilir bir form kullanıldı — mobilde daha doğal bir UX, web'deki `CartDrawer`'ın adım adım akışı burada gerekli görülmedi.
- [x] "Ödemeye Geç" butonu var ama gerçek ödeme akışına bağlı değil (Faz 5'te `/api/payment/init`'e bağlanacak) — şimdilik "yakında" mesajı gösteriyor, giriş yapılmamışsa önce girişe yönlendiriyor

### ⚠️ Faz 3 testinde bulunan ve bu fazda düzeltilen bir hata
Gerçek cihazda test edilirken 3D viewer'da `THREE.WebGLRenderer: WebGL 1 is not supported since r163` hatası çıktı. Sebep: `three.js` r163'ten itibaren `WebGLRenderer`'dan WebGL1 desteğini tamamen kaldırdı, ama `expo-gl`'in verdiği context hâlâ WebGL1 tabanlı — `expo-three` henüz buna yetişmedi. Çözüm: `apps/mobile`'daki `three` sürümü `0.162.0`'a (r163 öncesi son sürüm) sabitlendi. **Bu web'i etkilemiyor** — `apps/web`'in kendi `three` bağımlılığı ayrı ve `^0.184.0` olarak kalıyor, sadece mobile'ın kendi (aynı `packages/shared`'ı paylaşmayan, çünkü three bir UI/render kütüphanesi, iş mantığı değil) `three` sürümü farklı.

## Faz 5 — Ödeme
📄 Akış detayı: `ARCHITECTURE.md` → "Ödeme Stratejisi"
- [ ] Mobile'dan `POST /api/payment/init`'e istek (mevcut web API'si, değişmeden)
- [ ] İyzico checkout URL'i `expo-web-browser` ile in-app browser'da açılıyor
- [ ] Ödeme sonrası deep link / durum kontrolü ile "Sipariş Alındı" ekranına yönlendirme
- [ ] Hata durumları (ödeme başarısız, bağlantı koptu vb.) için kullanıcı dostu mesajlar

## Faz 6 — Siparişler & Takip
- [ ] Sipariş listesi (durum rozetleri: bekliyor/ödendi/baskıda/kargoda/teslim edildi)
- [ ] Sipariş detayı: kargo takip no, ürün kalemleri, toplam tutar
- [ ] Pull-to-refresh ile durum güncelleme

## Faz 7 — Push Bildirimleri (v1 sonrası, opsiyonel hızlandırma)
- [ ] Expo push token kaydı (kullanıcı profiline bağlanır)
- [ ] Sipariş durumu değiştiğinde bildirim (mevcut `/api/admin/orders/status` route'una push tetikleme eklenir)

## Faz 8 — Mağaza Başvurusu
- [ ] App icon, splash screen, store screenshot'ları (TR + EN)
- [ ] Gizlilik politikası / kullanım koşulları linkleri (web'deki `/privacy`, `/terms` sayfalarına yönlendirilebilir)
- [ ] App Store Review Guidelines 3.1.3 (fiziksel ürün istisnası) ve Play Store Payments Policy'nin başvuru öncesi güncel halinin tekrar kontrolü
- [ ] TestFlight (iOS) + Internal Testing (Android) ile kapalı beta
- [ ] Store listing metinleri (TR/EN açıklama, anahtar kelimeler)
- [ ] EAS Build ile production build + submit (`eas submit`)

---

## Kapsam Dışı (v1'de YOK, ayrı bir karar gerektirir)
- Tasarımcı model yükleme/düzenleme
- Partner (yazıcı ortağı) paneli
- Admin paneli
- Wallet/para çekme akışı

Bu roller mobilde gerekli görülürse, v1 App Store/Play Store onayından
sonra ayrı bir "Faz 9+" olarak ele alınmalı.
