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
- [ ] `apps/mobile/` içinde `npx create-expo-app@latest` ile proje kuruldu (TypeScript template)
- [ ] Expo Router ile temel navigasyon iskeleti: Tab bar (Ana Sayfa / Ara / Sepet / Siparişlerim / Profil)
- [ ] NativeWind kuruldu, web'deki renk paleti (`#FF6B35`, `#10B981`, `#1E293B`, `#F8FAFC`) tema olarak tanımlandı
- [ ] `apps/mobile/CLAUDE.md` oluşturuldu (bkz. ayrı dosya — zaten hazır)
- [ ] EAS hesabı/projesi bağlandı (`eas init`), ileride build almak için

## Faz 2 — Auth & i18n
- [ ] Supabase client kurulumu (AsyncStorage ile session persistence)
- [ ] Giriş / Kayıt / Şifremi Unuttum ekranları (web'deki `LoginForm`/`RegisterForm`/`ForgotPasswordForm` akışlarının mobil karşılığı)
- [ ] Google OAuth (expo-auth-session + deep link)
- [ ] i18next kurulumu, `messages/*.json`'dan alıcı-kapsamındaki namespace'ler taşındı: `nav`, `auth`, `modelsPage`, `modelDetail`, `cart`, `rating`, `hero`, `howItWorks` (gerekli olanlar)
- [ ] Dil değiştirme (TR/EN) çalışıyor, cihaz diline göre varsayılan seçiliyor

## Faz 3 — Browse & Model Detayı
- [ ] `packages/shared/src/queries/fetchModels.ts` — web'deki merkezi `fetchModels()` fonksiyonunun mobile'dan da çağrılabilir hâli (Supabase client dışarıdan inject edilir)
- [ ] Model listesi ekranı: arama, kategori filtresi, fiyat aralığı slider'ı (web'deki `ModelsPageClient` mantığının mobil karşılığı)
- [ ] Model detay ekranı: başlık/açıklama (TR/EN locale-aware), fiyat dökümü, tasarımcı bilgisi, değerlendirmeler
- [ ] **Native 3D viewer**: react-three-fiber + expo-gl + expo-three ile STL/OBJ/3MF render — web'deki `ModelViewer.tsx`'teki dönme/zoom/sıfırlama mantığının native karşılığı
- [ ] Değerlendirme (rating) formu — satın alma şartı kontrolü (Faz 1'de eklediğimiz RLS zaten server-side koruyor, UI'da da aynı "satın almadan değerlendiremezsin" mesajı gösterilmeli)

## Faz 4 — Sepet & Yapılandırma
- [ ] Zustand cart store'u `packages/shared`'a taşındı, mobile'dan da kullanılıyor
- [ ] Malzeme/renk/boyut/dolgu seçimi (web'deki `ConfigRow`/`OptionBtn` mantığının mobil karşılığı)
- [ ] Fiyat hesaplaması `packages/shared`'daki `calcPrintCost`/`calcTotalPrice`'tan geliyor (web ile birebir aynı sonuç garantisi)
- [ ] Sepet ekranı: ürün listesi, adres formu, adım göstergesi (web'deki `CartDrawer`'ın tam ekran mobil karşılığı)

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
