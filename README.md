# ShapeBazaar — Print Farm Network

> ShapeBazaar is where digital designs become real products.

## 🚀 Kurulum

### 1. Bağımlılıkları kur
```bash
npm install
```

### 2. Supabase projesi oluştur
1. [supabase.com](https://supabase.com) → New Project
2. `supabase/migrations/001_initial_schema.sql` dosyasını SQL Editor'a yapıştır ve çalıştır
3. Authentication → Providers → Google'ı aktif et

### 3. Environment variables
```bash
cp .env.local.example .env.local
# .env.local dosyasını kendi Supabase bilgilerinle doldur
```

### 4. Geliştirme sunucusu
```bash
npm run dev
# http://localhost:3000
```

## 📁 Proje Yapısı

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Landing page
│   ├── layout.tsx          # Root layout + metadata
│   ├── auth/
│   │   ├── login/          # Giriş sayfası
│   │   ├── register/       # Kayıt sayfası
│   │   └── callback/       # OAuth callback
│   ├── dashboard/          # Kullanıcı paneli
│   └── models/
│       ├── page.tsx        # Model listesi
│       └── [id]/           # Model detay
├── components/
│   ├── ui/                 # Button, Input, Badge
│   ├── layout/             # Navbar, Footer
│   ├── home/               # Landing page bölümleri
│   ├── auth/               # LoginForm, RegisterForm
│   ├── dashboard/          # Dashboard tabs
│   └── models/             # Model list & detail
└── lib/
    ├── supabase/           # client / server / middleware
    └── utils.ts            # cn, formatPrice, formatNumber
```

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

| Faz | İçerik |
|-----|--------|
| Faz 2 | Three.js 3D Viewer (STL/OBJ/3MF), Model yükleme, Supabase Storage |
| Faz 3 | İyzico ödeme entegrasyonu, Gerçek sipariş akışı, Puan sistemi |
| Faz 4 | Yazıcı ortağı paneli, Kargo takibi, Admin paneli, E-posta bildirimleri |
| Faz 5 | React Native / Expo mobil uygulama |

## 🎨 Renk Paleti

| Token | Hex | Kullanım |
|-------|-----|---------|
| Brand Orange | `#FF6B35` | Ana CTA, vurgu |
| Brand Green  | `#10B981` | Başarı, kazanç |
| Brand Dark   | `#1E293B` | Koyu zemin |
| Brand Light  | `#F8FAFC` | Açık zemin |
