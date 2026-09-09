# ShapeBazaar — Print Farm Network

> ShapeBazaar is where digital designs become real products.

Bu repo bir **monorepo**'dur:
- `apps/web/` — Next.js web uygulaması (mevcut ürün)
- `apps/mobile/` — React Native/Expo mobil uygulama (geliştiriliyor, bkz. `docs/mobile/`)
- `packages/shared/` — web ve mobile'ın ortak kullandığı iş mantığı (fiyatlandırma, tipler, sabitler)
- `supabase/` — tek backend, her iki app tarafından paylaşılıyor

## 🚀 Kurulum

### 1. Bağımlılıkları kur (kökte, workspace'lerin hepsini kurar)
```bash
npm install
```

### 2. Supabase projesi oluştur
1. [supabase.com](https://supabase.com) → New Project
2. `supabase/migrations/` altındaki dosyaları **sırayla** (001'den başlayarak) SQL Editor'da çalıştır — ya da `.github/workflows/supabase-migrations.yml` kurulduysa otomatik uygulanır (bkz. o dosyanın içindeki kurulum notları)
3. Authentication → Providers → Google'ı aktif et

### 3. Environment variables
```bash
cp apps/web/.env.local.example apps/web/.env.local
# apps/web/.env.local dosyasını kendi Supabase bilgilerinle doldur
```

### 4. Web geliştirme sunucusu
```bash
npm run dev:web
# http://localhost:3000
```

### 5. Testler (packages/shared — fiyatlandırma mantığı)
```bash
npm test
```

## 📁 Proje Yapısı

```
apps/web/src/
├── app/[locale]/            # Next.js App Router (next-intl ile TR/EN)
├── components/
│   ├── ui/                  # Button, Input, Badge
│   ├── layout/               # Navbar, Footer
│   ├── home/                 # Landing page bölümleri
│   ├── auth/                  # LoginForm, RegisterForm, ForgotPassword, ResetPassword
│   ├── dashboard/              # Dashboard tabs
│   ├── admin/                   # Admin paneli
│   ├── partner/                  # Yazıcı ortağı paneli
│   ├── upload/                    # Model yükleme
│   └── models/                     # Model list & detail
└── lib/
    ├── supabase/                # client / server / middleware
    └── utils.ts                  # cn, formatPrice, formatNumber

packages/shared/src/
├── pricing/       # calcPrintCost, calcTotalPrice (Vitest testli)
├── types/         # Model, Order, CartItem, Profile — ortak tipler
└── constants/     # CATEGORIES, MATERIALS, COLORS, SCALES, INFILLS
```

Mobil uygulamanın mimarisi ve yol haritası için: `docs/mobile/ARCHITECTURE.md`,
`docs/mobile/ROADMAP.md`.


## 🗄️ Veritabanı

`supabase/migrations/001_initial_schema.sql` içerir:
- `profiles` — Kullanıcı profilleri (roller: buyer, designer, printer_partner, admin)
- `categories` — Model kategorileri
- `models` — 3D modeller (STL/OBJ/3MF)
- `model_ratings` — Puanlama sistemi
- `orders` — Siparişler (full sipariş akışı)
- `print_jobs` — Yazıcı ortağı - sipariş eşleşmesi
- `wallet_transactions` — Puan/cüzdan hareketleri
- `addresses` — Kayıtlı teslimat adresleri

Row Level Security (RLS) tüm tablolarda aktif.

## 🔜 Sonraki Fazlar

| Faz | İçerik | Durum |
|-----|--------|-------|
| Faz 2 | Three.js 3D Viewer (STL/OBJ/3MF), Model yükleme, Supabase Storage | ✅ Tamamlandı |
| Faz 3 | İyzico ödeme entegrasyonu, Gerçek sipariş akışı, Puan sistemi | ✅ Tamamlandı |
| Faz 4 | Yazıcı ortağı paneli, Kargo takibi, Admin paneli, E-posta bildirimleri | ✅ Tamamlandı |
| Faz 5 | React Native / Expo mobil uygulama (alıcı akışı, v1) | 🚧 Planlama tamam, monorepo geçişi (Faz 0) tamamlandı — bkz. `docs/mobile/` |

## 🎨 Renk Paleti

| Token | Hex | Kullanım |
|-------|-----|---------|
| Brand Orange | `#FF6B35` | Ana CTA, vurgu |
| Brand Green  | `#10B981` | Başarı, kazanç |
| Brand Dark   | `#1E293B` | Koyu zemin |
| Brand Light  | `#F8FAFC` | Açık zemin |
