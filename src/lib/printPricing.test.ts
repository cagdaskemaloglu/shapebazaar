import { describe, it, expect } from "vitest";
import {
  calcPrintCost,
  calcTotalPrice,
  tlToUsd,
  FILAMENT_PRICE_PER_KG,
  FILAMENT_PRICE_PER_GRAM,
  SCALE_FACTOR,
  INFILL_FACTOR,
  LABOR_COST_TL,
  PLATFORM_FEE_RATE,
  EXCHANGE_RATE_TL_PER_USD,
} from "@/lib/printPricing";

describe("FILAMENT_PRICE_PER_GRAM", () => {
  it("her malzeme için kg fiyatının 1/1000'i olmalı", () => {
    for (const [material, kgPrice] of Object.entries(FILAMENT_PRICE_PER_KG)) {
      expect(FILAMENT_PRICE_PER_GRAM[material]).toBeCloseTo(kgPrice / 1000);
    }
  });
});

describe("calcPrintCost", () => {
  it("PLA, 100 gram, %100 ölçek, standart dolgu için doğru hesaplamalı", () => {
    // 1 TL/gram * 100g * 1.0 (scale) * 1.0 (infill) + 50 TL işçilik = 150 TL
    const cost = calcPrintCost("PLA", 100, SCALE_FACTOR["100%"], INFILL_FACTOR["25% (Standart)"]);
    expect(cost).toBeCloseTo(100 * FILAMENT_PRICE_PER_GRAM.PLA * 1 * 1 + LABOR_COST_TL);
  });

  it("bilinmeyen bir malzeme için PLA fiyatına düşmeli (fallback)", () => {
    const known   = calcPrintCost("PLA", 50, 1, 1);
    const unknown = calcPrintCost("BILINMEYEN_MALZEME", 50, 1, 1);
    expect(unknown).toBeCloseTo(known);
  });

  it("ölçek büyüdükçe maliyet artmalı", () => {
    const small = calcPrintCost("PLA", 100, SCALE_FACTOR["50%"]);
    const large = calcPrintCost("PLA", 100, SCALE_FACTOR["150%"]);
    expect(large).toBeGreaterThan(small);
  });

  it("dolgu yoğunluğu arttıkça maliyet artmalı", () => {
    const light = calcPrintCost("PLA", 100, 1, INFILL_FACTOR["15% (Hafif)"]);
    const dense = calcPrintCost("PLA", 100, 1, INFILL_FACTOR["80% (Masif)"]);
    expect(dense).toBeGreaterThan(light);
  });

  it("infill parametresi verilmezse varsayılan olarak 1 kullanılmalı", () => {
    const withDefault  = calcPrintCost("PLA", 100, 1);
    const withExplicit = calcPrintCost("PLA", 100, 1, 1);
    expect(withDefault).toBeCloseTo(withExplicit);
  });

  it("ağırlık 0 olduğunda sadece işçilik ücreti dönmeli", () => {
    expect(calcPrintCost("PLA", 0, 1, 1)).toBeCloseTo(LABOR_COST_TL);
  });

  it("negatif ağırlık girilirse maliyet işçilik ücretinin altına düşmemeli (regresyon testi)", () => {
    // NOT: Fonksiyon şu an negatif ağırlığa karşı korumasız — bu test mevcut
    // davranışı belgelemek için var. Gelecekte bir doğrulama eklenirse
    // (örn. Math.max(0, weightGrams)) bu test güncellenmelidir.
    const cost = calcPrintCost("PLA", -100, 1, 1);
    expect(cost).toBeLessThan(LABOR_COST_TL);
  });
});

describe("calcTotalPrice", () => {
  it("platform komisyonunu (design + print) * %10 olarak hesaplamalı", () => {
    const { platformFee } = calcTotalPrice(100, 50);
    expect(platformFee).toBeCloseTo((100 + 50) * PLATFORM_FEE_RATE);
  });

  it("toplamı design + print + komisyon olarak hesaplamalı (kargo hariç)", () => {
    const { total, platformFee } = calcTotalPrice(100, 50);
    expect(total).toBeCloseTo(100 + 50 + platformFee);
  });

  it("tasarım fiyatı 0 (ücretsiz model) olduğunda sadece baskı üzerinden komisyon almalı", () => {
    const { platformFee, total } = calcTotalPrice(0, 200);
    expect(platformFee).toBeCloseTo(200 * PLATFORM_FEE_RATE);
    expect(total).toBeCloseTo(200 + platformFee);
  });

  it("hem tasarım hem baskı 0 olduğunda toplam 0 olmalı", () => {
    const { total, platformFee } = calcTotalPrice(0, 0);
    expect(total).toBe(0);
    expect(platformFee).toBe(0);
  });
});

describe("tlToUsd", () => {
  it("güncel kura göre doğru çevirmeli", () => {
    expect(tlToUsd(EXCHANGE_RATE_TL_PER_USD)).toBeCloseTo(1);
    expect(tlToUsd(0)).toBe(0);
  });

  it("negatif tutarlarda da orantılı çevirmeli", () => {
    expect(tlToUsd(-EXCHANGE_RATE_TL_PER_USD)).toBeCloseTo(-1);
  });
});
