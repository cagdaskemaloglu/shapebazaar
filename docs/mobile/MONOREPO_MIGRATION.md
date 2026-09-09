# Monorepo Geçişi — Uygulama Adımları

> Bu doküman, mobil geliştirmeye başlamadan ÖNCE tamamlanması gereken tek
> seferlik bir geçiş sürecini adım adım anlatır. Hedef: mevcut web
> uygulamasını **hiçbir işlevini bozmadan** `apps/web/` altına taşımak ve
> ortak kodu `packages/shared/`'a çıkarmak.
>
> Bu adımları bir Claude Code oturumuna aynen verebilirsiniz — her adım
> bağımsız olarak doğrulanabilir (build/test) şekilde sıralanmıştır.

## Ön koşul
- Bu geçişe başlamadan önce mevcut `main` branch'in temiz (uncommitted
  değişiklik olmayan) ve deploy edilebilir durumda olduğundan emin olun.
- Ayrı bir branch açın: `git checkout -b monorepo-migration`.

## Adım 1 — Klasör iskeletini oluştur
```bash
mkdir -p apps/web apps/mobile packages/shared
```

## Adım 2 — Web uygulamasını taşı
Aşağıdaki dosya/klasörleri repo kökünden `apps/web/` altına taşı (git history
korunsun diye `git mv` kullan):
```bash
git mv src apps/web/src
git mv public apps/web/public
git mv messages apps/web/messages
git mv next.config.ts apps/web/next.config.ts
git mv next-env.d.ts apps/web/next-env.d.ts
git mv tailwind.config.ts apps/web/tailwind.config.ts
git mv postcss.config.mjs apps/web/postcss.config.mjs
git mv tsconfig.json apps/web/tsconfig.json
git mv vitest.config.ts apps/web/vitest.config.ts
git mv vercel.json apps/web/vercel.json
git mv eslint.config.mjs apps/web/eslint.config.mjs
git mv package.json apps/web/package.json
git mv package-lock.json apps/web/package-lock.json   # bu dosya root'ta yeniden oluşacak, silinebilir de
```
`supabase/` ve `.github/` klasörleri **kökte kalır** — ikisi de tek backend'e
ve tek CI sürecine ait, uygulama-özel değil.

## Adım 3 — Root workspace `package.json` oluştur
Kökte yeni bir `package.json`:
```json
{
  "name": "shapebazaar-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:web": "npm run dev --workspace=apps/web",
    "build:web": "npm run build --workspace=apps/web",
    "test:web": "npm run test --workspace=apps/web",
    "dev:mobile": "npm run start --workspace=apps/mobile"
  }
}
```

## Adım 4 — `apps/web/package.json` içindeki `name` alanını güncelle
`"name": "shapebazaar"` → `"name": "@shapebazaar/web"` (workspace içi
paketler arasında çakışmayı önlemek için scope'lu isimlendirme).

## Adım 5 — Vercel deploy ayarını güncelle
Vercel proje ayarlarında **Root Directory**'yi `apps/web` olarak
ayarlayın (Vercel Dashboard → Project Settings → General → Root Directory).
Bu adım atlanırsa deploy kırılır — build komutu artık kökte değil
`apps/web` içinde çalışmalı.

## Adım 6 — GitHub Actions migration workflow'unu kontrol et
`.github/workflows/supabase-migrations.yml` zaten `supabase/` klasörüne
göre çalışıyor (kökte kaldığı için) — bu workflow'da değişiklik gerekmez.
Sadece dosya yollarının hâlâ doğru olduğunu teyit edin.

## Adım 7 — `packages/shared` içeriğini oluştur
```bash
mkdir -p packages/shared/src/{pricing,types,constants,queries}
git mv apps/web/src/lib/printPricing.ts packages/shared/src/pricing/printPricing.ts
git mv apps/web/src/lib/printPricing.test.ts packages/shared/src/pricing/printPricing.test.ts
```
`packages/shared/package.json`:
```json
{
  "name": "@shapebazaar/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```
`packages/shared/src/index.ts` — tüm alt modülleri re-export et:
```ts
export * from "./pricing/printPricing";
export * from "./types";
export * from "./constants";
```

## Adım 8 — `apps/web` içindeki importları güncelle
`apps/web/src/**` içinde `printPricing.ts`'i import eden her dosyada:
```diff
- import { calcPrintCost, calcTotalPrice } from "@/lib/printPricing";
+ import { calcPrintCost, calcTotalPrice } from "@shapebazaar/shared";
```
`apps/web/package.json`'a workspace bağımlılığı ekle:
```json
"dependencies": {
  "@shapebazaar/shared": "*"
}
```
`apps/web/tsconfig.json`'a path alias ekle (opsiyonel ama IDE deneyimi için önerilir):
```json
"paths": {
  "@/*": ["./src/*"],
  "@shapebazaar/shared": ["../../packages/shared/src"]
}
```

## Adım 9 — Ortak sabitleri ve tipleri taşı (opsiyonel ama önerilir)
Bu oturumda tespit edildiği gibi `CATEGORIES`, `MATERIALS`, `COLORS`,
`SCALES`, `INFILLS` dizileri şu an `ModelDetailClient.tsx`, `FeaturedViewer.tsx`,
`UploadPageClient.tsx`, `EditModelClient.tsx` içinde ayrı ayrı tanımlı.
Bunları `packages/shared/src/constants/`'a taşıyıp her dosyada import etmek,
hem web'i temizler hem mobile'ın gün 1'den aynı sabitleri kullanmasını sağlar.
Bu adımı hemen yapmak zorunlu değil — mobile geliştirmeye başlarken de yapılabilir.

## Adım 10 — Doğrulama
```bash
npm install                          # kökte, workspace'leri kurar
npm run build --workspace=apps/web   # web hâlâ derleniyor mu?
npm run test --workspace=apps/web    # (test taşındıysa: --workspace=packages/shared)
npm run dev --workspace=apps/web     # localhost:3000 hâlâ eskisi gibi açılıyor mu?
```
Hepsi geçerse commit atıp PR açın. Bu noktada web tarafında **davranışsal
hiçbir değişiklik olmamalı** — sadece dosya konumları ve import yolları değişti.

## Adım 11 — Expo mobile app'i scaffold et
Bu, ayrı bir adım/PR olarak `ROADMAP.md`'deki Faz 0'ın devamı — `apps/mobile/`
içine `npx create-expo-app@latest` ile başlanır. Detaylar `ROADMAP.md`'de.
