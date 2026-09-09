# ShapeBazaar Mobile — Claude için Yönergeler

Bu dosya, `apps/mobile/` içinde çalışan herhangi bir Claude (Code) oturumunun
ilk okuması gereken dosyadır. Amacı: web uygulamasıyla tutarlı, tekrar
üretmeyen, mağaza onayına hazır bir mobil uygulama inşa etmek.

## Proje bağlamı
ShapeBazaar, Türkiye merkezli bir 3D baskı pazaryeri. Tasarımcılar model
yüklüyor, alıcılar seçip sipariş veriyor, yazıcı ortakları basıp kargoluyor.
Bu mobil app **sadece alıcı akışını** kapsıyor (v1). Detaylar için:
- `../../docs/mobile/ARCHITECTURE.md` — mimari kararlar ve gerekçeleri
- `../../docs/mobile/ROADMAP.md` — hangi fazda neyin yapılacağı
- `../web/` — referans alınacak mevcut web implementasyonu

## Altın kural: Web'i referans al, kopyalama
Bir ekran/akış üzerinde çalışırken önce `apps/web/src/components/` içinde
karşılığını bul ve iş mantığını (hangi alan zorunlu, fiyat nasıl hesaplanıyor,
hangi RLS politikası hangi işlemi engelliyor) oradan anla. Ama:
- UI kodu **birebir port edilmez** — RN'in kendi bileşen/layout mantığı kullanılır.
- İş mantığı (fiyat hesabı, validasyon kuralları) **kopyalanmaz**,
  `packages/shared`'dan import edilir. Web'de `printPricing.ts`,
  `fetchModels()` gibi paylaşılan kod varsa, mobile'da yeniden yazmak yerine
  onu kullan. Paylaşılan bir şeyi mobile için özelleştirmen gerekiyorsa,
  önce `packages/shared`'ı genişletmeyi düşün, sonra mobile'a özel kod yaz.

## Stil ve bileşen kuralları
- NativeWind kullan (Tailwind sınıfları), web'deki renk token'larıyla birebir
  aynı hex değerleri (`#FF6B35`, `#10B981`, `#1E293B`, `#F8FAFC`) — bunları
  `tailwind.config.js`'de tema olarak tanımla, satır içi hex yazma.
- Web'de `var(--text-primary)` gibi CSS custom property'lerle yapılan
  light/dark mode ayrımı, RN'de `useColorScheme()` + NativeWind'in
  `dark:` varyantlarıyla karşılanır.
- Component dosya adlandırması web ile aynı desende: `PascalCase.tsx`.

## i18n kuralları
- Çeviri anahtarları **web'deki `messages/en.json`/`tr.json` ile aynı isim ve
  yapıda** olmalı (namespace + key). Örn. web'de `modelDetail.addToCart` neyse,
  mobile'da da `modelDetail.addToCart` olmalı — anlamsız bir yeniden isimlendirme
  gelecekte iki dosyayı elle senkron tutmayı zorlaştırır.
- Sadece alıcı akışında kullanılan namespace'leri taşı (bkz. `ROADMAP.md` Faz 2).
  Admin/partner/upload namespace'lerini taşımana gerek yok.
- next-intl'e özgü `t.rich()` kalıpları (`<b>{chunks}</b>` gibi) i18next'te
  `Trans` component'i ile karşılanır — birebir aynı sözdizimi değil, ama
  aynı mesaj JSON'ını kullanabilirsin.

## Asla yapılmaması gerekenler
- **Fiyat hesaplama mantığını (`calcPrintCost`, `calcTotalPrice`) mobile'da
  yeniden yazma.** `packages/shared`'dan import et. Web ile mobile'da farklı
  sonuç veren bir fiyat hesabı, gerçek para kaybına/güven sorununa yol açar.
- **İyzico'yu native bir SDK ile entegre etmeye çalışma.** Mimari kararı
  gereği ödeme, mevcut `/api/payment/*` route'ları + in-app browser üzerinden
  yürütülüyor (bkz. `ARCHITECTURE.md`). Bunu değiştirmek büyük bir mimari
  karar gerektirir, tek başına yapılmaz.
- **Yeni bir Supabase projesi/tablosu oluşturma.** Aynı backend, aynı şema.
  Şema değişikliği gerekiyorsa `supabase/migrations/`'a (kökte) yeni bir
  migration eklenir — web ve mobile aynı migration geçmişini paylaşır.
- **RLS politikalarını mobile tarafında "bypass etmek" için service-role key
  kullanma.** Mobile app, web'in client tarafı gibi `anon key` + RLS ile
  çalışmalı. Service role key sadece server-side (Next.js API route'ları)
  içindir ve mobile bundle'ına asla gömülmemeli.

## Test
- `packages/shared` içindeki paylaşılan mantık için testler zaten
  `packages/shared/src/pricing/printPricing.test.ts`'te var (Vitest).
  Mobile'a özel yeni iş mantığı eklersen, aynı Vitest kurulumuyla
  `packages/shared` içinde test yaz — mobile'ın kendi test framework'üne
  (varsa) gerek yok, paylaşılan kod tek bir yerde test edilir.

## Bir özellik eklerken izlenecek sıra
1. `ROADMAP.md`'de hangi fazda olduğunu kontrol et, sırayı atlama.
2. Web'deki karşılığını oku (component + kullandığı lib/hook'lar).
3. Paylaşılması gereken bir iş mantığı varsa, önce `packages/shared`'a taşı/ekle
   (web'i de bu paylaşılan koda bağlamayı unutma — böylece iki app aynı kaynağı kullanır).
4. Mobile ekranını/bileşenini yaz.
5. TR ve EN'de test et (i18n anahtarı eksikse sessizce İngilizce/Türkçe
   karışık görünebilir — bu oturumda web'de defalarca karşılaştığımız hata
   türü, mobile'da tekrarlanmamalı).
