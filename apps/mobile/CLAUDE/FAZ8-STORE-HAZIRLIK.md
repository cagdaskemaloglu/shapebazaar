# Faz 8 — Mağaza Hazırlığı (kontrol listesi)

> Kaynak kontrolü: **3 Ekim 2026**. Mağaza kuralları değişebilir; gönderimden hemen önce ilgili sayfalar tekrar okunmalı.

## 1. Doğrulanan mağaza kuralları

| Konu | Sonuç | Bizim için anlamı |
|---|---|---|
| **Apple – fiziksel ürün ödemesi** (Guideline 3.1.3(e), yeni numaralamada 3.1.5) | Uygulama içinde tüketilmeyen **fiziksel ürün/hizmet** için uygulama içi satın alma (IAP) yerine Apple Pay / kart girişi gibi **başka ödeme yöntemleri kullanılmalı**. | iyzico ile kartlı ödeme **doğru ve zorunlu** yol; IAP **kullanmayın**. Forumlarda yanlış anlaşılma kaynaklı ret hikâyeleri var → inceleme notunda açıkça "fiziksel 3D baskı ürünü, kargoyla gönderilir" yazın (bkz. §4). |
| **Apple – hesap silme** (Guideline 5.1.1(v)) | Hesap oluşturmayı destekleyen uygulama, **uygulama içinden hesap silmeyi** de sunmak zorunda (31 Ocak 2022'den beri). Seçenek kolay bulunur olmalı; kişisel veriler silinmeli; yasal saklama yükümlülükleri ayrıca uygulanır. | **Mobilde şu an YOK → gönderim öncesi zorunlu iş.** (§3) |
| **Google Play – kapalı test** | **13 Kasım 2023'ten sonra açılmış KİŞİSEL** geliştirici hesaplarında: en az **12 test kullanıcısı, kesintisiz 14 gün** kapalı testte kalmadan production başvurusu yapılamaz. **Kurumsal (organization) hesaplar muaf.** | Hesap türü takvimi belirler: kişisel hesapta en az ~3 hafta, kurumsalda yok. |
| **Google Play – hesap silme** | Doğrulanamadı (arama sonuçları bu konuyu kapsamadı). Play Console'daki **Data safety** formu, hesap oluşturan uygulamalardan silme yolu / web bağlantısı ister. | Play Console'da formu doldururken net görülecek; hesap silmeyi Apple için zaten yapıyoruz, web bağlantısı da gerekecek. |

## 2. Senin sağlaman gerekenler (ben üretemem)
- [ ] **Apple Developer Program** üyeliği (ücretli, yıllık) ve **Google Play Console** hesabı. Play için **kişisel mi kurumsal mı** olacağı (§1 – 14 günlük test kuralı).
- [ ] **Uygulama ikonu** (1024×1024 PNG, saydamsız), **splash** görseli, Android **adaptive icon** (ön plan + arka plan). `app.json`'da şu an hiçbiri tanımlı değil.
- [ ] **Gizlilik politikası** ve **kullanım koşulları** için herkese açık web sayfaları (URL). Her iki mağaza da ister. İçerik hukuki bir metin; ben taslak yazabilirim ama son hâlini bir hukukçu/muhasebeci onaylamalı (KVKK, mesafeli satış, veri saklama süreleri).
- [ ] **Destek e-postası / destek sayfası URL'si** (Apple "Support URL" ister).
- [ ] **Hesap silme web sayfası URL'si** (Google Data safety için; uygulama içi silme ile aynı işi yapan bir web yolu).
- [ ] **Ekran görüntüleri** (iPhone 6.7"/6.9" ve Android telefon) ve mağaza açıklama metinleri (TR + EN). Ben metin taslağı çıkarırım.
- [ ] **İnceleme için demo hesabı**: Apple/Google incelemecisi giriş yapabilmeli (e-posta + şifre ile bir test hesabı).

## 3. Kodla yapılacaklar (sıra önerisi)
1. ~~Hesap silme~~ ✅ yazıldı (aşağıda), test + deploy bekliyor.
2. İkon/splash dosyaları gelince `app.json`'a bağlama.
3. `EXPO_PUBLIC_*` değişkenlerini EAS ortamına tanımlama (`eas env:create` / EAS panelinden). `.env` dosyası derlemeye otomatik gitmez.
4. İsteğe bağlı: baskı fotoğrafları için **"Şikâyet et"** butonu. Apple, kullanıcı kaynaklı içerik gösteren uygulamalardan şikâyet mekanizması ve içerik filtresi bekleyebilir (Guideline 1.2). Fotoğraflar yalnızca **admin onayından sonra** yayınlandığı ve yalnızca onaylı yazıcı ortakları yüklediği için risk düşük; ama inceleme sırasında istenirse eklemek 1 günlük iştir.

### Hesap silme — önerilen davranış (onayına sunulur)
Giriş noktası: Profil sekmesi → "Hesabı sil" (kırmızı) → onay ekranı (şifre/“SİL” yazdırma) → `POST /api/account/delete` (Bearer token).

Sunucu **silmeyi reddeder** (409 + sebep listesi) eğer kullanıcının açık yükümlülüğü varsa:
- Alıcı olarak: `paid / in_print / printed / shipped` durumunda siparişi var.
- Yazıcı ortağı olarak: `claimed / printing` durumunda işi var ya da teslim onayı bekleyen işi var (kazancı henüz yatmadı).
- Tasarımcı olarak: modeli, henüz teslim edilmemiş bir siparişte.
- Cüzdan bakiyesi > 0 ya da bekleyen çekim talebi var.

Engel yoksa:
1. Geçmiş siparişlerdeki kişisel veriler (alıcı adı, adres, telefon) **anonimleştirilir**; sipariş ve tutar kayıtları yasal saklama için kalır.
2. Tasarımcının modelleri yayından kaldırılır (silinmez; siparişlerde referansı var).
3. Profil, puanlar, cüzdan geçmişi ve oturum silinir (veritabanındaki ilişkiler bunu zaten destekliyor: `profiles → auth.users ON DELETE CASCADE`, `orders.buyer_id ON DELETE SET NULL`).
4. Auth kullanıcısı silinir, istemci çıkış yapar.

**Alınan kararlar (4 Ekim 2026) ve uygulama durumu — KOD YAZILDI, test + deploy bekliyor:**
1. Eski siparişler saklanır; kişisel veriler (ad, adres, telefon) hesap silindikten **30 gün sonra** anonimleştirilir (`orders.pii_scrub_at` + günlük cron `/api/cron/scrub-order-pii`). *Not: 30 gün, Türkiye'deki mesafeli satış / fatura saklama sürelerinden kısa olabilir; muhasebeci/hukukçuyla teyit edilmeli.*
2. Tasarımcının modelleri yayından kaldırılır; bu modelleri içeren **kargolanmamış** (paid / in_print / printed) siparişler **iptal edilir ve "iade bekliyor"** işaretlenir (`orders.refund_pending`). **Kodda otomatik iade yok** — iade ödeme sağlayıcı panelinden elle yapılır (aşağıdaki SQL). **Kargodaki** siparişler varsa silme engellenir (tasarımcı kazancı teslim onayında dağıtılıyor). Basılmakta olan/basılmış işin yazıcısı için iş `failed` olur (yazıcıya telafi yok — gerekirse elle).
3. Cüzdan bakiyesi > 0 veya bekleyen/onaylı çekim talebi varsa silme engellenir.
4. Google Play hesabı **kişisel** (12 test kullanıcısı × 14 gün). Şimdilik aksiyon yok.

Veritabanı: `supabase/migrations/009_account_deletion.sql` (iki fonksiyon, service-role'a kilitli). API: `POST /api/account/delete` (`dryRun` / `confirm`). Mobil: Profil → "Hesabımı sil" → `app/account/delete.tsx`.
Silmeyle birlikte **cüzdan işlem geçmişi ve çekim talebi kayıtları** (`ON DELETE CASCADE`) da silinir; banka dekontları ayrıca bankada durur — muhasebe açısından yeterli mi teyit et.

İade bekleyen siparişleri görmek / kapatmak için (SQL Editor):
```sql
SELECT id, created_at, total_amount, cancel_reason FROM orders WHERE refund_pending ORDER BY created_at;
UPDATE orders SET refund_pending = FALSE, status = 'refunded' WHERE id = '<sipariş id>';   -- iade yapıldıktan sonra
```

**Açık kalan:** Google Data safety için hesap silmeyi **web'den** de sunan bir sayfa gerekecek (API cookie ile de çalışıyor, sadece arayüz yok).

## 4. İnceleme notu taslağı (App Review Notes)
> ShapeBazaar sells **physical 3D-printed products** that are manufactured by independent print partners and shipped by courier to the customer. Payment is collected with a card through our payment provider (iyzico) inside a secure web form, as required by Guideline 3.1.3(e)/3.1.5 for physical goods. The app does not sell digital content or unlock digital features. Demo account: `<e-posta>` / `<şifre>`. To test checkout, `<test kartı bilgisi veya ekran kaydı>`.

(İnceleyici gerçek kartla ödeme yapamayabilir; test ödeme yöntemini ya da ekran kaydını notta mutlaka belirtin.)

## 5. EAS adımları (hesaplar hazır olunca)
```bash
cd apps/mobile
npx eas-cli login
npx eas-cli init                         # projeyi EAS'a bağlar, app.json'a projectId yazar
# EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_WEB_URL → EAS ortamına tanımla
npx eas-cli build -p ios --profile preview        # önce iç dağıtım derlemesi
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios                         # TestFlight / App Store Connect
npx eas-cli build -p android --profile production
```
`eas.json` hazır (`preview` = iç dağıtım, `production` = otomatik sürüm numarası artışı).

## 6. Takvim
- **Google kişisel hesap:** kapalı test 14 gün + production başvurusu + inceleme → hesabı açar açmaz kapalı testi başlat; mağaza metinlerini beklerken test akıyor olsun.
- **Apple:** TestFlight dış test için ilk derlemede kısa bir Beta App Review var; ana inceleme günler sürebilir.
