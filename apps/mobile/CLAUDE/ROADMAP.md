# ShapeBazaar Mobile — Yol Haritası (v1: Sadece Alıcı)

> Her faz, kendinden önceki fazın üzerine inşa edilecek şekilde sıralandı.
> **Son güncelleme:** 010 canlıya uygulandı (denetim sorgusu hepsi true). Mobil profil fazı (6.8) ve 011 politika temizliği kodlandı. GitHub Actions migration iş akışı için `SUPABASE_ACCESS_TOKEN` ve `SUPABASE_DB_PASSWORD` secret'ları hâlâ güncellenmedi.

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
- [x] Mobil flip DÖRDÜNCÜ düzeltme: cihazda dört farklı `Animated` yaklaşımında kartın görüntüsü butonun bir basış gerisinde kalıyordu (animasyon kareleri ekrana yansımıyor, yalnız son render değeri görünüyor). `Animated` tamamen bırakıldı: görüntü `face`/`scaleX` React state'inden çiziliyor, çevirme requestAnimationFrame ile state'i güncelliyor. (Önceki, geçersiz kalan teşhis:) animasyon sürerken state değişip yeniden render olunca her render'da YENİ `interpolate` bağlantısı oluşuyor, görünüm son güncellemeyi alamayıp ara değerde kalıyordu (önce beyaz kart, sonra ince şeride sıkışmış fotoğraf). Şimdi iki yüz sürekli bağlı, görünürlüğü animasyonlu opaklık belirliyor, bağlantılar `useRef` ile bir kez oluşturuluyor, animasyon sırasında state değişmiyor, bitişte `mix.setValue(target)` ile son durum yazılıyor; görseller mutlak doldurma stiliyle boyutlanıyor
- [x] Mobil 3D viewer: dünya eksenli (trackball) döndürme + eylemsizlik, görünüm genişliğine oranlı hassasiyet, oransal pinch zoom, kayıtlı başlangıç yönelimi artık x/y/z (z eksikti), seçilen renk modele uygulanıyor (`colorHex`), dolgu ışığı
- [ ] Uçtan uca test: yazıcı iki fotoğraf yükleyip admin onayından sonra kargolasın → admin onaylayıp vitrin seçsin → kart ve model sayfası → mobil kart/galeri/sipariş detayı
- [ ] Uygulama mağazasına fotoğraf gösterimiyle çıkılacaksa: kullanıcı kaynaklı içerik kuralları (şikâyet butonu vb.) güncel Apple/Google metninden kontrol edilmeli

## Faz 6.6 — Sunucu tarafı fiyat doğrulaması ✅ KOD TAMAM, DEPLOY + TEST BEKLİYOR
- [x] `payment/init` artık istemcinin gönderdiği tutarlara güvenmiyor: model/malzeme/ölçek/dolguyu alır; tasarım ücreti ve ağırlığı DB'den okur; tutarı `packages/shared/src/pricing/cartPricing.ts` (`priceCart`, saf fonksiyon) ile yeniden hesaplar. Kuruş (tamsayı) üzerinden toplanır → iyzico "sepet toplamı tutmuyor" hatası olmaz. Önceden giriş yapmış herkes sepet tutarını ve `order_items.model_price`'ı (tasarımcı kazancının dayanağı) kendisi belirleyebiliyordu.
- [x] İstemci toplamı sunucununkinden >₺1 farklıysa 409 `PRICE_CHANGED` (tasarımcı fiyatı değiştirdi / eski sepet): kullanıcı bilmeden farklı tutar ödemez. Web sunucu mesajını gösterir, mobil `payment.priceChanged` gösterir.
- [x] Bilinmeyen malzeme/ölçek/dolgu/renk, geçersiz model id, yayında olmayan/silinmiş model, >20 kalem, geçersiz adres → 400 (eskiden bilinmeyen seçenek sessizce PLA/×1'e düşüyordu). 25 senaryolu testten geçti; istemci formülüyle 200 kombinasyonda birebir aynı sonuç.
- [x] **Düzeltilen fiyat hataları:** (1) "Reçine" fiyat tablosunda yoktu (`Resin` anahtarı vardı) → reçine seçimi PLA fiyatıyla satılıyordu; tabloya `Reçine: 1400` eklendi. (2) Ağırlığı olmayan model web'de 50 g, mobilde 0 g ile fiyatlanıyordu; tek kural `resolveWeightGrams` (50 g) artık web, mobil, kart ve sunucuda aynı. Eski sepetlerdeki reçine/ağırlıksız kalemler tek seferlik `PRICE_CHANGED` alabilir.
- [ ] Deploy sonrası test: normal ödeme (web + mobil), reçine seçili ödeme, fiyatı değiştirilmiş modelle eski sepetten ödeme (409 beklenir)

## Faz 6.8 — Profil (mobil) ✅ KOD TAMAM, CİHAZDA TEST BEKLİYOR
Neden: Faz 2'den kalma geçici ekran (hoş geldin + çıkış) bırakılmıştı, roadmap'te profil maddesi yoktu; v1 kapsamı "alıcı akışı" olduğu için tasarımcı/yazıcı/cüzdan araçları bilinçli olarak web'de. **Faz 8'den (mağaza) önce** yapıldı: Apple incelemecisi boş profil ekranı görmemeli ve hesap silme/gizlilik bağlantıları buradan erişilir olmalı.
- [x] Profil ekranı: avatar (ya da baş harf), ad, @kullanıcı adı, e-posta, rol rozeti, hakkında; Siparişlerim kısayolu; **dil seçimi (TR/EN, kalıcı — AsyncStorage)**; Gizlilik politikası / Kullanım koşulları / İletişim (web sayfaları uygulama içi tarayıcıda); sürüm; Çıkış; Hesabı sil
- [x] Profili düzenle: ad soyad, kullanıcı adı (3-24, harf/rakam/_ ; çakışmada "alınmış" hatası), şehir, hakkında. Sadece değişen alanlar gönderilir; rol/bakiye/partner onayı zaten sunucuda korunuyor (010)
- [x] Tasarımcı / yazıcı ortağı / admin hesaplarında "Web panelini aç" kartı (model yükleme, baskı işleri, cüzdan web'de)
- [x] Profil sorguları `*` değil açık kolon listesi (`useProfile`): ileride telefon/cüzdan herkese açık okumadan çıkarılınca bozulmasın
- [ ] **Ertelenenler:** profil fotoğrafı yükleme (`expo-image-picker` gerekir: yeni native bağımlılık + iOS izin metni), kayıtlı adresler (CRUD + sepette seçme), yazıcı/tasarımcı araçlarının mobile taşınması (v2)
- [ ] Cihazda test: profil görünümü, düzenleme (kullanıcı adı çakışması dahil), dil değiştirip uygulamayı kapatıp açınca kalıcılık, web bağlantıları

## Faz 8.7 — Profil gizliliği (012) ✅ KOD TAMAM, UYGULAMA BEKLİYOR
Sorun: `profiles` tablosunda herkese açık okuma + tablo düzeyi SELECT yetkisi → anon anahtarıyla (uygulamaya/siteye gömülü) tüm kullanıcıların **telefon numarası ve cüzdan bakiyesi** okunabiliyordu (`GET /rest/v1/profiles?select=full_name,phone,wallet_balance`). KVKK ve mağaza gizlilik beyanıyla çelişir.
- [x] `012_profiles_privacy.sql`: SELECT yetkisi KOLON bazına indirildi; `phone`, `wallet_balance` (+ varsa `email`, `iban`, `tc_kimlik_no`, `tax_number`) anon/authenticated'dan alındı, diğer tüm kolonlar (canlıdaki ek kolonlar dahil, dinamik) açık kaldı. Kullanıcı kendi bilgisini `my_profile_private()` ile okur. UPDATE, RLS politikaları (role/is_partner_approved), SECURITY DEFINER fonksiyonlar ve sunucu etkilenmedi (gerçek PostgreSQL'de 22 senaryo)
- [x] Kod: `dashboard/page.tsx` artık `select("*")` yerine açık kolon listesi + bakiye için `my_profile_private()`; `payment/init` telefonu service-role ile okuyor. Taranan tüm diğer okumalar hassas olmayan kolonlardı.
- **Kural:** `profiles` üzerinde `.select("*")` / `.select()` ARTIK çalışmaz. profiles'a yeni kolon eklenirse istemci okuyacaksa: `GRANT SELECT (kolon) ON profiles TO anon, authenticated;`
- [ ] **Deploy sırası: önce kodu (dashboard + payment/init) deploy et, SONRA 012'yi uygula.** Tersi olursa eski `select("*")` kod 012'den sonra dashboard'u bozar. (CI ile birlikte push edersen: migration saniyeler içinde biter, Vercel dakikalar sürer → bir süre dashboard hata verir; güvenli yol: önce deploy, sonra 012.)
- [ ] 012 sonrası `security_audit.sql` sorgu 1'in yeni satırları true olmalı; sorgu 3'te telefon/bakiye/IBAN görünmemeli
- [ ] Cihaz/web testi: dashboard (bakiye görünüyor mu), çekim talebi, tasarımcı sayfaları, giriş/kayıt, ödeme (telefon iyzico'ya gidiyor mu)

## Faz 8.8 — Hukuki sayfalar + web'den hesap silme ✅ KOD TAMAM, DOLDURULACAK ALANLAR + HUKUKÇU ONAYI BEKLİYOR
- [x] **`/[locale]/account/delete`** (herkese açık sayfa, giriş gerektirmez): Google Play "Data safety" formunun istediği hesap silme web bağlantısı. Girişli kullanıcı silmeyi buradan yapar (mobille aynı API/engeller/onay), girişsizse adımlar + giriş bağlantısı gösterilir. Web dashboard ayarlarından da bağlantı var. **Data safety formundaki URL: `https://www.shapebazaar.com/en/account/delete`**
- [x] **Gizlilik Politikası yeniden yazıldı (12 bölüm, TR+EN; KVKK aydınlatma metni biçimi):** eski metin 5 başlıklı genel bir taslaktı (2024). Yeni metin gerçek veri akışını anlatır: toplanan veriler, hukuki sebepler, paylaşılan taraflar (yazıcı ortağı, tasarımcı, Supabase/Vercel/ödeme sağlayıcısı/Resend/Google), yurt dışı aktarım, saklama (hesap silinince 30 gün), baskı fotoğrafları, hesap silme, KVKK m.11 hakları.
- [x] **Çerez Politikası düzeltildi:** eski metin Google Analytics, pazarlama çerezleri ve Stripe'tan söz ediyordu; kodda bunların HİÇBİRİ yok (ödeme iyzico, analitik yok) → yanlış beyandı. Artık sadece zorunlu çerez/yerel depolama (oturum, dil, tema) ve üçüncü taraf formları anlatılıyor.
- [ ] **YAYINDAN ÖNCE doldurulacak alanlar** (gizlilik politikasında köşeli parantezli): `[ŞİRKET / İŞLETME ÜNVANI]`, `[ADRES]`, `[E-POSTA ADRESİ]` (TR: "[E-POSTA ADRESİ]"), `[ÖDEME SAĞLAYICISI]` (ödeme altyapısı değişince güncelle), `[SUPABASE BÖLGESİ]` (Supabase panelinde projenin bölgesi). Dosya: `apps/web/messages/tr.json` ve `en.json` → `privacy.sections`
- [ ] **Hukukçu / muhasebeci onayı gerekenler:** (1) hesap silme sonrası 30 gün saklama süresi, mesafeli satış ve vergi mevzuatındaki saklama sürelerinden kısa olabilir; (2) yurt dışı aktarım ifadesi (KVKK m.9, güncel şartlar); (3) **Kullanım Koşulları sayfasına DOKUNULMADI:** iade/iptal maddeleri ("onaylanan siparişler iptal edilemez", "30 gün içinde kusur") ve kişiye özel üretilen ürünlerde cayma hakkı istisnası, mesafeli satış sözleşmesi/ön bilgilendirme formu hukukçu tarafından gözden geçirilmeli; (4) yazıcı fotoğraflarının kullanım lisansı (yazıcı ortağı koşulları)

## Faz 8.6 — Canlı politika temizliği (011) ✅ KOD TAMAM, UYGULAMA BEKLİYOR
4 Ekim 2026 canlı policy dökümü, migration dosyalarında OLMAYAN tehlikeli politikaları gösterdi (DB panelden elle büyütülmüş): (1) `order_items` "System inserts order items" → alıcı ödenmiş siparişine sahte `model_price`'lı kalem ekleyip tasarımcı hesabıyla teslim sonrası cüzdanına para yazdırabilirdi; (2) `print_jobs` "System can insert print jobs" (WITH CHECK true) → anon dahil herkes havuza sahte iş ekleyebilirdi; (3) eski "Partners can view/update" politikaları 008'in sıkı politikalarının yanında OR'lanıyordu; (4) tasarımcı, devam eden siparişi olan modelini silebilirdi. `011_rls_cleanup.sql` hepsini kapatır (gerçek PostgreSQL'de öncesi/sonrası test edildi). Yazma noktalarının tamamı service-role kullandığı için kod değişmedi.
- [ ] 011'i uygula, ardından `security_audit.sql` sorgu 2'yi tekrar çalıştır (order_items'ta INSERT, print_jobs'ta INSERT ve eski "Partners…" politikaları KALMAMALI)
- [x] Telefon normalizasyonu: `05317168548` yazımı ödeme sağlayıcısına `+9005317168548` gidiyordu → `normalizeTrPhone` (14 senaryo testi) `payment/init`'te kullanılıyor

## Faz 8.5 — Güvenlik denetimi ve cüzdan muhasebesi ✅ KOD TAMAM, DEPLOY BEKLİYOR
RLS/fonksiyon denetiminde (migration dosyalarına göre) bulunan ve **010_security_hardening.sql** ile kapatılan açıklar — saldırılar gerçek PostgreSQL'de 010 öncesi çalıştırılıp sonrası engellendiği gösterildi, tam ve sapmış şemada:
- `increment_wallet` herkese açıktı → anon anahtarıyla herhangi bir hesaba sınırsız bakiye eklenebiliyordu (artık sadece service_role).
- `profiles_self_update` kolon kısıtsızdı → kullanıcı kendi `role`'ünü `admin`, `wallet_balance`'ını ve `is_partner_approved`'ını değiştirebiliyordu (`requireAdmin` yalnız `profiles.role`'e bakar → tam yönetici). Artık tetikleyici bu üç kolonu kullanıcı isteklerinden korur.
- `models` insert/update kolon kısıtsızdı → tasarımcı kendi modelini admin onayı olmadan yayınlayabiliyor, puan/sayaç/vitrin/sahiplik değiştirebiliyordu.
- `model_ratings` güncellemede `model_id` değiştirilebiliyordu (satın alma şartı atlanıyordu).
- **Çekim akışı:** talep tarayıcıdan doğrudan insert ediliyordu (miktar/durum doğrulanmıyor) ve bakiye HİÇBİR adımda düşmüyordu → aynı bakiyeyle sınırsız talep, "ödendi" bakiyeyi azaltmıyor, hesap silme engeli hiç kalkmıyordu. Artık: `POST /api/wallet/withdraw` (IBAN mod-97 doğrulaması) → `request_withdrawal` bakiyeyi kilitleyip DÜŞER; `resolve_withdrawal` durum geçişlerini doğrular, reddedilince iade eder (eski, `balance_held=false` talepler için iade YOK: para yoktan var olmasın).
- `admin/setup` sayfası `role: "admin"`'i kullanıcı client'ıyla yazıyordu (açık politikaya dayanıyordu) → service-role'e alındı. **İlk admin oluşturulduktan sonra `ADMIN_SETUP_KEY` ortam değişkenini sil.**
- [x] ~~Açık bulgu: `profiles_public_read USING (TRUE)`~~ → **012 ile kapatıldı** (aşağıda, Faz 8.7). Eski not: → `phone` ve `wallet_balance` dahil tüm profil kolonları anon anahtarıyla HERKES tarafından okunabiliyor (KVKK). Çözüm özel kolonları ayrı tabloya/RPC'ye taşımak; çok sayıda okuma noktasını etkilediği için ayrı iş.
- [ ] Canlıda doğrulama: `supabase/checks/security_audit.sql` (010 öncesi/sonrası)
- [ ] Mevcut bekleyen/onaylı çekim talepleri varsa 010 dosyasının sonundaki opsiyonel bölümü oku

## ⚠️ CI — GitHub Actions "Supabase Migrations" iş akışı
- Repoda `push` ile çalışan bir iş akışı var (`supabase-migrations.yml`: link → (elle tetiklenirse) repair → db push). 4 Ekim 2026'da **"Link Supabase project" adımında** `Authorization failed for the access token and project ref pair` hatasıyla düşüyor → migration'lar (008, 009, 010) **uygulanmıyor**.
- Düzeltme: `SUPABASE_PROJECT_REF` = uygulamanın bağlandığı proje (`qlngvvbdwqnaezretjbt`) ve `SUPABASE_ACCESS_TOKEN` = o projeye erişimi olan hesabın kişisel token'ı olmalı; `db push` için ayrıca `SUPABASE_DB_PASSWORD`.
- İlk başarılı çalıştırmadan önce **migration geçmişi onarılmalı**: veritabanı elle kuruldu, geçmiş tablosunda 001–00x kayıtlı değil; `db push` 001'den başlayıp `CREATE TABLE` hatası alır. Elle uygulanmış sürümler `supabase migration repair --status applied …` ile işaretlenmeli (iş akışındaki `repair_versions` girdisi).
- **010'a bağımlı kod (çekim API'si, admin çekim route'u) DB'de fonksiyonlar yokken çalışmaz → CI düzelene/010 elle uygulanana kadar bu kodu deploy etme.**

## ⚠️ Engel — Ödeme altyapısı
- iyzico canlı (production) başvurusu Findeks değerlendirmesi nedeniyle onaylanmadı → **gerçek ödeme alınamıyor**; şimdiye kadarki testler sandbox. Karar (4 Ekim 2026): şimdilik aksiyon yok, muhtemelen ödeme sağlayıcısı değişecek.
- Sağlayıcıdan **bağımsız** kalanlar: sunucu fiyat doğrulaması (`priceCart`), sipariş/ürün kayıtları, yazıcı havuzu, fotoğraf akışı, hesap silme.
- Sağlayıcıya **bağlı** kalanlar (değişince yeniden yazılacak): `lib/iyzico.ts`, `payment/init`, `payment/callback`, mobil `checkout.tsx` (iyzico checkout formunu WebView'da gösteriyor), iade (şu an elle).
- Not: cüzdan/çekim sistemi kullanıcı bakiyesi tutuyor (parayı platform tutuyor görünümü). Yeni sağlayıcıyı seçerken **pazaryeri / alt üye iş yeri (split ödeme)** desteği ve mevzuat uyumu (ödeme hizmetleri mevzuatı) mutlaka sorulmalı.
- Mağaza yayını için gerçek ödeme şart değil (inceleme notunda açıklanır), ama müşteriye açılmak için şart.

## Faz 7 — Push Bildirimleri (başlanmadı, opsiyonel hızlandırma)
- [ ] Expo push token kaydı
- [ ] Sipariş durumu değiştiğinde bildirim

## Faz 8 — Mağaza Başvurusu (hazırlık başladı → `FAZ8-STORE-HAZIRLIK.md`)
- [x] Mağaza kuralları kontrol edildi (3 Ekim 2026): fiziksel ürün için IAP dışı ödeme (iyzico) doğru; Apple 5.1.1(v) **uygulama içi hesap silme zorunlu**; Google kişisel hesaplarda 12 test kullanıcısı × 14 gün kapalı test (kurumsal hesap muaf)
- [x] `eas.json` oluşturuldu (`preview`, `production`); `app.json`'a `usesNonExemptEncryption: false` eklendi
- [x] **Hesap silme** (zorunlu) kodlandı: `009_account_deletion.sql`, `POST /api/account/delete`, `/api/cron/scrub-order-pii`, mobil `account/delete` ekranı. SQL gerçek PostgreSQL'de engel/etki/yetki/PII senaryolarıyla test edildi. **Deploy sırası: önce 009'u Supabase'de çalıştır, sonra web deploy.**
- [ ] Hesap silme: cihazda uçtan uca test (temiz hesap, bakiyeli hesap, tasarımcı hesabı) ve web'den silme sayfası (Google Data safety)
- [ ] Gerçek app icon/splash/adaptive-icon görselleri (şu an app.json'da yok)
- [~] Gizlilik politikası ✅ (yeniden yazıldı), hesap silme sayfası ✅; kullanım koşulları hukukçu onayı bekliyor, destek = /contact. Bkz. Faz 8.8
- [ ] İnceleme notu + demo hesabı + test ödeme açıklaması
- [ ] EAS hesabı, `eas init`, `EXPO_PUBLIC_*` değişkenlerini EAS ortamına tanımlama
- [ ] TestFlight + Google kapalı test (kişisel hesapsa 14 gün)
- [ ] Store listing metinleri ve ekran görüntüleri
- [ ] İsteğe bağlı: baskı fotoğrafı "Şikâyet et" butonu (Guideline 1.2)

---

## 🔧 Bilinen teknik borç / temizlenmesi gerekenler
- `scrollEnabled={!viewerActive}` bağlantısı kodda mevcut (`models/[id].tsx`), ama 3D viewer üzerinde sürükleme cihazda henüz test edilmedi
- Ödeme başlatılınca sipariş `pending` olarak kaydediliyor; vazgeçilen ödemelerin `pending` siparişleri kalıyor (web'de de aynı). Faz 6'da sipariş listesinde `pending`/`cancelled` siparişler gizlenmeli ya da etiketlenmeli
- Kökteki eski `src/`, `messages/`, `package.json` kopyaları `apps/web`'in eski hali — silinebilir

## Kapsam Dışı (v1'de YOK)
- Tasarımcı model yükleme/düzenleme, Partner paneli, Admin paneli, Wallet akışı
- **3MF format desteği (mobile)** — yukarıda açıklandığı gibi bilinçli olarak kapsam dışı bırakıldı, web'de sorunsuz çalışıyor
