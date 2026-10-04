# ShapeBazaar Mobile — Yol Haritası (v1: Sadece Alıcı)

> Her faz, kendinden önceki fazın üzerine inşa edilecek şekilde sıralandı.
> **Son güncelleme:** Faz 6 cihazda doğrulandı. Baskı fotoğrafı özelliği (web + mobil) kodlandı, test ve migration 008 bekliyor.

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
- [ ] **Web deploy:** `payment/init` Bearer destekli sürümü Vercel'e yayınlanmalı. İlk cihaz testinde `HTTP_401` alındı. Ödeme ekranı artık oturumu yenileyip tekrar dener ve kodu ayırır: `HTTP_401_SERVER` = token Supabase'de geçerli ama sunucu reddediyor (eski deploy / farklı Supabase projesi env'i), `HTTP_401_TOKEN` = oturum gerçekten geçersiz.
- [x] **Google girişi — kök neden:** Supabase Auth, host'u IP olan (loopback hariç) redirect adreslerini allow-list'e bakmadan reddedip Site URL'ine düşürür. Expo Go adresi `exp://192.168.x.x:8081/...` olduğu için `exp://**` bile işe yaramıyordu. Dev'de redirectTo host'u `127.0.0.1`'e çevrildi (iOS'ta yeterli); Android/Expo Go için `npx expo start --tunnel`. Mağaza/dev-client sürümü `shapebazaar://` kullandığı için etkilenmez. Cihazda test bekliyor.

## Faz 6 — Siparişler & Takip ✅ KOD TAMAMLANDI, CİHAZDA TEST BEKLİYOR
- [x] `packages/shared/src/queries/orders.ts`: `fetchMyOrders` (sadece ödemesi alınmış, yani `paid_at` dolu siparişler — vazgeçilen/başarısız ödemelerin `pending`/`cancelled` kayıtları listelenmez), `fetchOrderDetail`, `OrderStatus` tipleri
- [x] `app/(tabs)/orders.tsx`: durum rozetli liste, pull-to-refresh, sonsuz kaydırma, sekmeye her dönüşte sessiz yenileme, boş/hata/giriş-yok durumları
- [x] `app/(tabs)/order/[id].tsx` (gizli sekme, alt çubuk görünür kalır): zaman çizelgesi, iptal/iade bilgisi, kalemler + ara toplam/kargo/toplam, teslimat adresi, kargo firması + takip no (basılı tutarak kopyalanır)
- [x] "Teslim Aldım" butonu (`shipped` durumunda) → `POST /api/orders/confirm-delivery`; web route'u `createRequestClient` ile Bearer destekli yapıldı. Ortak yardımcı: `lib/api.ts` (`apiPost`, 401'de oturum yenileyip tekrar dener)
- [x] **Güvenlik/veri düzeltmesi:** `payment/init` `orders` + `order_items` yazmalarını admin client ile yapıyor (kullanıcı client'ıyla `order_items` INSERT'ü RLS'te policy olmadığı için sessizce reddediliyor olabilirdi; kalemsiz sipariş = tasarımcı kazancı/puan şartı çalışmaz). `007_orders_rls_hardening.sql`: alıcının `orders` üzerindeki INSERT/UPDATE politikaları kaldırılıyor (önceden kendi siparişinin status/total_amount'unu değiştirebiliyordu). **Sıra: önce web deploy, sonra migration.**
- [ ] Cihazda test: ödeme sonrası sipariş listede görünüyor mu, kalemler dolu mu, detay/zaman çizelgesi, (admin panelinden `shipped` yapılmış bir siparişle) "Teslim Aldım" ve cüzdan kazançları
- [ ] Faz 3'ten kalan: satın alma şartıyla puan verme testi

## Faz 6.5 — Yazıcı baskı fotoğrafları + vitrin fotoğrafı + admin model silme ✅ KOD TAMAM, TEST BEKLİYOR
Kararlar: yazıcı kargo bilgisini girebilmek için **her ürün için ≥2 (en fazla 5) fotoğraf yüklemiş VE admin en az 2'sini onaylamış olmalıdır** (uzaktaki yazıcının modeli düzgün basıp basmadığını admin görür; kural `evaluatePrintPhotoGate` ile sunucu ve arayüzde ortak, `ship` route'u 422 `PHOTOS_REQUIRED` / `PHOTOS_NOT_APPROVED` döner); onaylı fotoğraflar ürün sayfasında görünür; admin ürün başına **tek bir vitrin fotoğrafı** seçer ve bu, ürün kartında sol üstte mini buton olur — basınca görsel alanı 180° dönüp baskı fotoğrafını gösterir, buton "3D" butonuna dönüşür. Tüm yazıcıların fotoğrafı kartta gösterilmez. Zorunluluk sadece migration'dan sonra oluşan işlere uygulanır (`print_jobs.photos_required`).
- [x] `supabase/migrations/008_print_photos.sql`: `print_photos` tablosu (pending/approved, RLS: herkes onaylıyı, yazıcı kendininkini okur), `models.showcase_*` kolonları + vitrin temizleme trigger'ları, `print-photos` public bucket
- [x] Web partner paneli: tarayıcıda küçültme (≤1600px + ≤640px JPEG, EXIF atılır) + `/api/partner/photos` (POST/DELETE); `partner/jobs/ship` ≥2 fotoğraf şartını sunucuda uygular
- [x] Web admin paneli: "Fotoğraflar" sekmesi (onayla/sil, vitrin seç; yayındakileri sonradan düzenle: vitrin değiştir, onayı kaldır, sil) ve "Katalog" sekmesi (model arama + kalıcı silme)
- [x] Model silme koruması: devam eden siparişi (paid/in_print/printed/shipped, yeni `pending`) olan model silinemez; sipariş geçmişi korunur
- [x] Web: ürün kartı flip animasyonu (`ModelsPageClient`), model sayfasında "Yazıcılarımızdan çıkanlar" galerisi
- [x] Mobil: `ModelCard` flip (Animated, native driver), model detayında galeri şeridi + tam ekran görüntüleyici, sipariş detayında alıcının kendi baskı fotoğrafları
- [x] **Canlı DB bulgusu:** `print_jobs` tablosu canlı veritabanında hiç yoktu (001'den kurulmamış, DB panelden elle büyütülmüş) → ödeme callback'indeki `print_jobs` insert'i sessizce hata veriyordu, yani siparişler hiçbir yazıcıya düşmemişti. `008` tabloyu kodun beklediği kolonlarla (`region`, `deadline`, `photos_required`) ve sıkı RLS/kolon yetkileriyle kuruyor; gerçek bir PostgreSQL'de iki kez çalıştırılarak test edildi. Geçmiş ödenmiş siparişleri havuza eklemek için dosya sonunda opsiyonel (yorumlu) sorgu var.
- [ ] **Dağıtım sırası: ÖNCE 008'i Supabase'de çalıştır, SONRA web deploy, sonra mobil.** (Yeni kod `showcase_thumb_path` ve `photos_required` kolonlarını okur; migration yoksa model listesi ve partner paneli boş döner.)
- [x] Mobil kart flip hatası düzeltildi: yüz ve buton etiketi tek state'ten (`showPhoto`) türüyor; animasyon iki yarım dönüş (önceki `backfaceVisibility` yaklaşımı iOS'ta butonla ters eşleşiyordu)
- [x] Kart iyileştirmeleri (web + mobil): medya çerçevesi 4:3 (iPhone fotoğraf oranı), 3D render ve baskı fotoğrafı `contain` ile kesilmeden sığar; fiyat satırında varsayılan ayarlarla (PLA · %100 · %25 dolgu) baskı ücreti, kargo hariç (`defaultPrintPrice`, kart = detay = sepet tutarı; ağırlığı olmayan modelde gösterilmez)
- [x] Mobil flip üçüncü düzeltme (kök neden): animasyon sürerken state değişip yeniden render olunca her render'da YENİ `interpolate` bağlantısı oluşuyor, görünüm son güncellemeyi alamayıp ara değerde kalıyordu (önce beyaz kart, sonra ince şeride sıkışmış fotoğraf). Şimdi iki yüz sürekli bağlı, görünürlüğü animasyonlu opaklık belirliyor, bağlantılar `useRef` ile bir kez oluşturuluyor, animasyon sırasında state değişmiyor, bitişte `mix.setValue(target)` ile son durum yazılıyor; görseller mutlak doldurma stiliyle boyutlanıyor
- [x] Mobil 3D viewer: dünya eksenli (trackball) döndürme + eylemsizlik, görünüm genişliğine oranlı hassasiyet, oransal pinch zoom, kayıtlı başlangıç yönelimi artık x/y/z (z eksikti), seçilen renk modele uygulanıyor (`colorHex`), dolgu ışığı
- [ ] Uçtan uca test: yazıcı iki fotoğraf yükleyip admin onayından sonra kargolasın → admin onaylayıp vitrin seçsin → kart ve model sayfası → mobil kart/galeri/sipariş detayı
- [ ] Uygulama mağazasına fotoğraf gösterimiyle çıkılacaksa: kullanıcı kaynaklı içerik kuralları (şikâyet butonu vb.) güncel Apple/Google metninden kontrol edilmeli

## Faz 6.6 — Sunucu tarafı fiyat doğrulaması ✅ KOD TAMAM, DEPLOY + TEST BEKLİYOR
- [x] `payment/init` artık istemcinin gönderdiği tutarlara güvenmiyor: model/malzeme/ölçek/dolguyu alır; tasarım ücreti ve ağırlığı DB'den okur; tutarı `packages/shared/src/pricing/cartPricing.ts` (`priceCart`, saf fonksiyon) ile yeniden hesaplar. Kuruş (tamsayı) üzerinden toplanır → iyzico "sepet toplamı tutmuyor" hatası olmaz. Önceden giriş yapmış herkes sepet tutarını ve `order_items.model_price`'ı (tasarımcı kazancının dayanağı) kendisi belirleyebiliyordu.
- [x] İstemci toplamı sunucununkinden >₺1 farklıysa 409 `PRICE_CHANGED` (tasarımcı fiyatı değiştirdi / eski sepet): kullanıcı bilmeden farklı tutar ödemez. Web sunucu mesajını gösterir, mobil `payment.priceChanged` gösterir.
- [x] Bilinmeyen malzeme/ölçek/dolgu/renk, geçersiz model id, yayında olmayan/silinmiş model, >20 kalem, geçersiz adres → 400 (eskiden bilinmeyen seçenek sessizce PLA/×1'e düşüyordu). 25 senaryolu testten geçti; istemci formülüyle 200 kombinasyonda birebir aynı sonuç.
- [x] **Düzeltilen fiyat hataları:** (1) "Reçine" fiyat tablosunda yoktu (`Resin` anahtarı vardı) → reçine seçimi PLA fiyatıyla satılıyordu; tabloya `Reçine: 1400` eklendi. (2) Ağırlığı olmayan model web'de 50 g, mobilde 0 g ile fiyatlanıyordu; tek kural `resolveWeightGrams` (50 g) artık web, mobil, kart ve sunucuda aynı. Eski sepetlerdeki reçine/ağırlıksız kalemler tek seferlik `PRICE_CHANGED` alabilir.
- [ ] Deploy sonrası test: normal ödeme (web + mobil), reçine seçili ödeme, fiyatı değiştirilmiş modelle eski sepetten ödeme (409 beklenir)

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
- Kökteki eski `src/`, `messages/`, `package.json` kopyaları `apps/web`'in eski hali — silinebilir

## Kapsam Dışı (v1'de YOK)
- Tasarımcı model yükleme/düzenleme, Partner paneli, Admin paneli, Wallet akışı
- **3MF format desteği (mobile)** — yukarıda açıklandığı gibi bilinçli olarak kapsam dışı bırakıldı, web'de sorunsuz çalışıyor
