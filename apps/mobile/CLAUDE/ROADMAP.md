# ShapeBazaar Mobile — Yol Haritası (v1: Sadece Alıcı)

> Her faz, kendinden önceki fazın üzerine inşa edilecek şekilde sıralandı.
> **Son güncelleme:** Faz 5 kodu tamam; ilk cihaz testinden çıkan hatalar düzeltildi (aşağıdaki "Faz 5.1"). Ödeme testi web deploy'u sonrası yapılacak.

## Faz 0 — Monorepo Geçişi ✅ TAMAMLANDI
📄 Ayrıntılı adımlar: `MONOREPO_MIGRATION.md`
- [x] Web uygulaması `apps/web/`'e taşındı, Vercel Root Directory `apps/web` olarak ayarlandı, deploy çalışıyor
- [x] `packages/shared/` oluşturuldu, `printPricing.ts` taşındı
- [x] Root workspace kuruldu, `npm install` kökte çalışıyor
- [x] GitHub Actions migration workflow'u (`supabase-migrations.yml`) kuruldu ve doğrulandı — elle uygulanan migration geçmişini "repair" moduyla senkronize ettik, sonraki migration'lar otomatik uygulanıyor
- [x] `CATEGORIES`/`MATERIALS`/`COLORS`/`SCALES`/`INFILLS` sabitleri ve temel domain tipleri (`Model`/`Order`) `packages/shared`'a taşındı

## Faz 1 — Expo İskeleti & Tasarım Sistemi ✅ TAMAMLANDI (paket sorunları çözülerek)
- [x] `apps/mobile/` iskeleti (Expo Router, TypeScript)
- [x] Tab bar: Ana Sayfa / Ara / Sepet / Siparişlerim / Profil
- [x] NativeWind ile web'deki renk paleti (`brand.orange/dark/light/green`)
- [x] `apps/mobile/CLAUDE.md` oluşturuldu
- [x] **Kurulum sırasında çözülen paket sürüm sorunları** (bkz. ARCHITECTURE.md → "Bilinen Kurulum Sorunları"):
  - `nativewind`'in `^4.1.23` aralığı bozuk bir `4.2.x`'e çözülüyordu → tam `4.1.23`'e sabitlendi
  - Eksik `icon.png`/`splash.png`/`adaptive-icon.png` bundling'i durduruyordu → `app.json`'dan referanslar kaldırıldı (mağaza başvurusundan önce gerçek görsellerle geri eklenecek)
- [ ] EAS hesabı/projesi henüz bağlanmadı (`eas init`) — Faz 8'e kadar gerekmiyor

## Faz 2 — Auth & i18n ✅ TAMAMLANDI VE TEST EDİLDİ
- [x] Supabase client (`lib/supabase.ts`, AsyncStorage ile session persistence)
- [x] Giriş / Kayıt / Şifremi Unuttum / Şifre Sıfırlama ekranları
- [x] **Google OAuth test edildi ve çalışıyor** ✅ (beklenenin aksine ilk denemede sorunsuz çalıştı)
- [x] i18next kurulumu, `nav` + `auth` namespace'leri web'den taşındı
- [x] Dil değiştirme (cihaz diline göre TR/EN varsayılan) çalışıyor

## Faz 3 — Browse & Model Detayı ✅ BÜYÜK ÖLÇÜDE TAMAMLANDI VE TEST EDİLDİ
- [x] `packages/shared/src/queries/models.ts` — `fetchModels`, `fetchModel`, `canRateModel`, `fetchRatings`, `submitRating` (client-agnostic)
- [x] `packages/shared/src/storage/index.ts` — **sonradan bulunan bir hatayı düzeltti:** `models.file_url` veritabanında tam URL değil ham storage path olarak tutuluyormuş, `getModelPublicUrl()` bunu web'de zaten çeviriyordu ama mobile bunu atlamıştı → düzeltildi, hem web hem mobile artık bu paylaşılan fonksiyonu kullanıyor
- [x] Ana Sayfa: arama, kategori filtresi, fiyat filtresi (preset chip'ler), model grid'i — test edildi
- [x] Model detay ekranı: başlık/açıklama (TR/EN), fiyat, tasarımcı, değerlendirmeler — test edildi
- [x] **Native 3D viewer (`ModelViewer3D.tsx`) — STL ve OBJ formatları test edildi, çalışıyor.** Yolculukta çözülen sorunlar:
  - WebGL1/r163 uyumsuzluğu → `three` sürümü `0.162.0`'a sabitlendi
  - `expo-three`'nin `.load()` metodu (tarayıcıya özgü FileLoader/XHR/ProgressEvent) RN'de çalışmıyordu → `fetch()` + `loader.parse()` yaklaşımına geçildi
  - Rotasyon jesti aşırı hassastı (küçük sürüklemede model 2-3 tur dönüyordu) → `PanResponder`'ın kümülatif `gesture.dx/dy` değerini her frame'de tekrar tekrar eklediği bulundu, delta (fark) hesaplamasına geçildi
  - ScrollView, viewer'ın dikey/yatay sürükleme jestini çalıyordu (sayfa kayıyordu) → capture-fazı PanResponder handler'ları + `onInteractionChange` callback'i ile üst ekranın `ScrollView`'ını **native olarak** (`scrollEnabled={false}`) geçici kapatma yaklaşımına geçildi — bu son çözüm, **henüz kullanıcı tarafından test edilmedi**
  - Zemin/arkaplan grid'i yoktu → `THREE.GridHelper` eklendi, modelin tabanına otomatik oturtuluyor
- [x] **3MF formatı mobile'da desteklenmiyor — bilinçli bir kapsam kararı.** `ThreeMFLoader`, three.js'in tarayıcıya özgü DOM/XML altyapısına (muhtemelen `querySelector` gibi API'lere) dayanıyor; iki farklı düzeltme denendi (DOMParser polyfill dahil), ikisi de başarısız oldu. Mobile'da 3MF dosyası açılırsa "bu format desteklenmiyor" mesajı gösteriliyor, kullanıcı web'e yönlendiriliyor. **STL/OBJ önerilen mobile formatları.**
- [x] Değerlendirme formu — satın alma şartı kontrolü kodda hazır, **ama henüz gerçek bir satın alma ile uçtan uca test edilmedi** (Faz 5 tamamlanınca test edilebilir)

## Faz 4 — Sepet & Yapılandırma ✅ KOD TAMAMLANDI, CİHAZDA TEST BEKLİYOR
- [x] Zustand cart store `packages/shared/src/cart/`'a taşındı (`createCartStore(storage?)` — web `localStorage`, mobile `AsyncStorage`)
- [x] Malzeme/renk/boyut/dolgu seçimi model detay ekranında, `packages/shared` sabitleriyle
- [x] Fiyat hesaplaması `calcPrintCost`/`calcTotalPrice`'tan geliyor (web ile birebir aynı sonuç garantisi)
- [x] Sepet sekmesi: ürün listesi, adres formu, ara toplam/kargo/toplam özeti (tek ekranlı, web'deki adım göstergesi yerine)
- [ ] **Henüz kullanıcı tarafından gerçek cihazda test edilmedi** — bir sonraki test turunda doğrulanmalı
- [x] "Ödemeye Geç" butonu var, gerçek ödemeye bağlı değil (Faz 5'in işi)

### ⚠️ Bu fazda çözülen bir hata (Faz 3 testinde bulundu)
`packages/shared/src/index.ts`, hem `types/index.ts` hem `cart/index.ts` içinde aynı isimde (`CartItem`) iki farklı arayüz tanımlandığı için "ambiguous export" hatası veriyordu. `types/index.ts`'teki eski/kullanılmayan tanım silindi, kanonik `CartItem` artık sadece `cart/index.ts`'te yaşıyor.

## Faz 5 — Ödeme ✅ KOD TAMAMLANDI, CİHAZDA TEST BEKLİYOR
📄 Akış detayı: `ARCHITECTURE.md` → "Ödeme Stratejisi"
- [x] **Kimlik doğrulama uyumsuzluğu çözüldü:** `apps/web/src/lib/supabase/requestClient.ts` (`createRequestClient()`) hem cookie hem Bearer token'ı destekliyor; tip uyuşmazlığı düzeltildi.
- [x] `apps/web/src/app/api/payment/init/route.ts` `createRequestClient(req)` kullanıyor (kodda doğrulandı). **Not:** canlı sitede (Vercel) bu sürümün deploy edilmiş olması gerekir.
- [x] `app/checkout.tsx`: `POST /api/payment/init` (Bearer token, gövde web'deki `CartDrawer` ile aynı) → `checkoutFormContent` statik HTML olarak `react-native-webview`'a gömülüyor. `onShouldStartLoadWithRequest` + `onNavigationStateChange` ile `/payment/success|failed` yakalanıyor (sadece shapebazaar host'unda). Çıkış onayı, Android geri tuşu, 20 sn timeout, hata/tekrar dene ekranı var.
- [x] `app/payment/success.tsx` (sepeti temizler, sipariş no gösterir) ve `app/payment/failed.tsx` (tekrar dene / sepete dön); `_layout.tsx`'e rotalar eklendi.
- [x] Sepetteki "Ödemeye Geç" butonu `/checkout`'a bağlandı (ad/şehir/adres zorunlu alan kontrolüyle). i18n: `payment.*` namespace + `cart.requiredFields` (TR/EN).
- [ ] **`npx expo install react-native-webview`** (apps/mobile içinde) çalıştırılmalı, ardından `three`/`nativewind` pinlerinin bozulmadığı kontrol edilmeli.
- [ ] **Cihazda uçtan uca test** (iyzico sandbox/gerçek kart): başarılı ödeme, başarısız ödeme, ödemeden vazgeçme, 3D Secure adımı. Ardından Faz 3'ten kalan puan verme (satın alma şartı) testi.

## Faz 5.1 — İlk cihaz testi düzeltmeleri (Expo Go / iPhone)
- [x] **Google girişi web sitesine yönleniyordu:** `redirectTo` Supabase "Redirect URLs" listesinde olmadığı için Supabase Site URL'ine (web) düşüyordu. Kod tarafı sağlamlaştırıldı (`auth/callback` rotası, hata/iptal ayrımı, giriş sonrası modal'ı kapatma). **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs'e `exp://**` ve `shapebazaar://**` eklenmeli** (elle yapılacak).
- [x] Giriş sonrası (e-posta/Google) modal kapanır ve kullanıcı geldiği ekrana (sepet, profil) döner (`leaveAuthScreen`).
- [x] **Alt sekmeler ürün sayfasında kayboluyordu:** `models/[id]` artık `(tabs)` içinde gizli sekme (`href: null`), `backBehavior="history"`. Detay ekranı `key={id}` ile sarılı (başka ürüne geçince state sıfırlanır) ve odak kaybedilince unmount olur (3D viewer GL context'i arka planda kalmaz).
- [x] "Sepete Ekle" artık sepet sekmesine yönlendiriyor.
- [x] **Ara sekmesi gerçek ekran oldu:** arama (debounce), kategori, fiyat, sıralama, toplam sonuç sayısı, sonsuz kaydırma, filtreleri temizle. Ortak `ModelCard` + `lib/modelFilters.ts` (Ana sayfa da kullanıyor; tek kalan son kart artık tam genişliğe yayılmıyor).
- [x] `fetchModels` arama metnindeki `, ( ) % * \` karakterleri sorguyu bozmasın diye temizleniyor (`packages/shared`).
- [x] Ödeme hata ekranı artık 401'i ("sunucu token'ı kabul etmedi") yerel "oturum yok"tan ayırıyor ve hata kodu gösteriyor (`NO_SESSION`, `HTTP_401`, `NETWORK`…).
- [ ] **Web deploy:** `payment/init` Bearer destekli sürümü Vercel'e yayınlanmalı; `HTTP_401` görülüyorsa ilk şüpheli bu.

## Faz 6 — Siparişler & Takip (başlanmadı)
- [ ] Sipariş listesi (durum rozetleri)
- [ ] Sipariş detayı: kargo takip no, ürün kalemleri, toplam tutar
- [ ] Pull-to-refresh ile durum güncelleme

## Faz 7 — Push Bildirimleri (başlanmadı, opsiyonel hızlandırma)
- [ ] Expo push token kaydı
- [ ] Sipariş durumu değiştiğinde bildirim

## Faz 8 — Mağaza Başvurusu (başlanmadı)
- [ ] Gerçek app icon/splash/adaptive-icon görselleri (şu an app.json'da yok — Faz 1'de bilerek kaldırıldı)
- [ ] Gizlilik politikası / kullanım koşulları linkleri
- [ ] App Store Review Guidelines 3.1.3 ve Play Store Payments Policy'nin güncel halinin son kontrolü
- [ ] TestFlight + Internal Testing ile kapalı beta
- [ ] Store listing metinleri
- [ ] `eas init` + EAS Build + submit

---

## 🔧 Bilinen teknik borç / temizlenmesi gerekenler
- `scrollEnabled={!viewerActive}` bağlantısı kodda mevcut (`models/[id].tsx`), ama 3D viewer üzerinde sürükleme cihazda henüz test edilmedi
- Ödeme başlatılınca sipariş `pending` olarak kaydediliyor; vazgeçilen ödemelerin `pending` siparişleri kalıyor (web'de de aynı). Faz 6'da sipariş listesinde `pending`/`cancelled` siparişler gizlenmeli ya da etiketlenmeli
- `/api/payment/init` fiyatları istemciden olduğu gibi alıyor; sunucuda `packages/shared` ile yeniden hesaplanmalı (mağaza öncesi)
- Kökteki eski `src/`, `messages/`, `package.json` kopyaları `apps/web`'in eski hali — silinebilir

## Kapsam Dışı (v1'de YOK)
- Tasarımcı model yükleme/düzenleme, Partner paneli, Admin paneli, Wallet akışı
- **3MF format desteği (mobile)** — yukarıda açıklandığı gibi bilinçli olarak kapsam dışı bırakıldı, web'de sorunsuz çalışıyor
