import { describe, test, expect } from "vitest";
import {
  calcCostBreakdown,
  COST_MODEL_DEFAULTS,
  type CostModelInput,
  type YearlyDriver,
} from "@/lib/cost/calcCost";

describe("calcCostBreakdown", () => {
  // ── 1. Base case ─────────────────────────────────────────────────────────
  // 1 year, fleet = 10, km = 100 000, FMS off, all defaults
  test("base case – every component computed exactly", () => {
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 10, kmPerYear: 100_000 },
    ];
    const result = calcCostBreakdown(COST_MODEL_DEFAULTS, drivers);

    expect(result.rows).toHaveLength(1);
    const r = result.rows[0];

    // Derived
    expect(r.newTrucks).toBe(10); // max(0, 10 − 0)

    // CAPEX
    expect(r.capexTrucks).toBe(3_000_000); // 10 × 300 000
    expect(r.capexDeployment).toBe(200_000); // first year
    expect(r.capexFms).toBe(0); // FMS off
    expect(r.capexTotalEUR).toBe(3_200_000);

    // OPEX – EUR
    expect(r.opexTruckLicenseEUR).toBe(500_000); // 10 × 50 000
    expect(r.opexFmsLicenseEUR).toBe(0);
    expect(r.opexTotalEUR).toBe(500_000);

    // OPEX – SEK
    expect(r.opexServiceSEK).toBe(200_000); // 100 000 × 2
    expect(r.opexFuelSEK).toBe(600_000); // 100 000 × 6
    expect(r.opexTotalSEK).toBe(800_000);

    // Combined totals
    // totalCostEUR = 3 200 000 + 500 000 + 800 000 / 11 = 3 772 727.2727…
    expect(r.totalCostEUR).toBeCloseTo(3_772_727.27, 1);
    // totalCostSEK = (3 200 000 + 500 000) × 11 + 800 000 = 41 500 000
    expect(r.totalCostSEK).toBe(41_500_000);

    // Period totals equal single-row values
    expect(result.periodTotals.capexTotalEUR).toBe(r.capexTotalEUR);
    expect(result.periodTotals.totalCostEUR).toBeCloseTo(r.totalCostEUR, 1);
    expect(result.periodTotals.totalCostSEK).toBe(r.totalCostSEK);
  });

  // ── 2. Multi-year with growth ────────────────────────────────────────────
  test("multi-year – fleet [10, 12, 12] → newTrucks [10, 2, 0]", () => {
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 10, kmPerYear: 100_000 },
      { year: 2027, fleetSize: 12, kmPerYear: 120_000 },
      { year: 2028, fleetSize: 12, kmPerYear: 120_000 },
    ];
    const result = calcCostBreakdown(COST_MODEL_DEFAULTS, drivers);

    // New trucks
    expect(result.rows[0].newTrucks).toBe(10);
    expect(result.rows[1].newTrucks).toBe(2); // 12 − 10
    expect(result.rows[2].newTrucks).toBe(0); // 12 − 12

    // CAPEX trucks
    expect(result.rows[0].capexTrucks).toBe(3_000_000); // 10 × 300k
    expect(result.rows[1].capexTrucks).toBe(600_000); // 2 × 300k
    expect(result.rows[2].capexTrucks).toBe(0);

    // Deployment only in year 0
    expect(result.rows[0].capexDeployment).toBe(200_000);
    expect(result.rows[1].capexDeployment).toBe(0);
    expect(result.rows[2].capexDeployment).toBe(0);

    // Truck license scales with fleet
    expect(result.rows[0].opexTruckLicenseEUR).toBe(500_000); // 10 × 50k
    expect(result.rows[1].opexTruckLicenseEUR).toBe(600_000); // 12 × 50k
    expect(result.rows[2].opexTruckLicenseEUR).toBe(600_000);
  });

  // ── 3. FMS on ────────────────────────────────────────────────────────────
  test("FMS on – one-time costs year 0 only; annual license every year", () => {
    const model: CostModelInput = { ...COST_MODEL_DEFAULTS, includeFMS: true };
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 5, kmPerYear: 50_000 },
      { year: 2027, fleetSize: 5, kmPerYear: 50_000 },
      { year: 2028, fleetSize: 5, kmPerYear: 50_000 },
    ];
    const result = calcCostBreakdown(model, drivers);

    // One-time FMS only first year (250 000 + 150 000 = 400 000)
    expect(result.rows[0].capexFms).toBe(400_000);
    expect(result.rows[1].capexFms).toBe(0);
    expect(result.rows[2].capexFms).toBe(0);

    // Annual FMS license every year
    expect(result.rows[0].opexFmsLicenseEUR).toBe(100_000);
    expect(result.rows[1].opexFmsLicenseEUR).toBe(100_000);
    expect(result.rows[2].opexFmsLicenseEUR).toBe(100_000);

    // opexTotalEUR includes both license + FMS license
    expect(result.rows[0].opexTotalEUR).toBe(350_000); // 5×50k + 100k
    expect(result.rows[1].opexTotalEUR).toBe(350_000);
  });

  // ── 4. FX conversion ─────────────────────────────────────────────────────
  test("FX conversion – EUR↔SEK totals are consistent", () => {
    const model: CostModelInput = { ...COST_MODEL_DEFAULTS, fxSEKPerEUR: 11 };
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 1, kmPerYear: 11_000 },
    ];
    const result = calcCostBreakdown(model, drivers);
    const r = result.rows[0];

    // Exact EUR total: 500 000 (capex) + 50 000 (opex EUR) + 88 000/11 (opex SEK) = 558 000
    expect(r.totalCostEUR).toBe(558_000);
    // Exact SEK total: (500 000 + 50 000) × 11 + 88 000 = 6 138 000
    expect(r.totalCostSEK).toBe(6_138_000);

    // Algebraic identity: totalCostSEK === totalCostEUR × fx  (always true)
    expect(r.totalCostSEK).toBeCloseTo(r.totalCostEUR * 11, 2);
  });

  // ── 5a. Edge – km = 0 ───────────────────────────────────────────────────
  test("km = 0 – variable costs are zero, fixed costs unchanged", () => {
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 5, kmPerYear: 0 },
    ];
    const result = calcCostBreakdown(COST_MODEL_DEFAULTS, drivers);
    const r = result.rows[0];

    expect(r.opexServiceSEK).toBe(0);
    expect(r.opexFuelSEK).toBe(0);
    expect(r.opexTotalSEK).toBe(0);
    // Fixed costs still apply
    expect(r.capexTrucks).toBe(1_500_000); // 5 × 300k
    expect(r.opexTruckLicenseEUR).toBe(250_000); // 5 × 50k
  });

  // ── 5b. Edge – fleet = 0 ─────────────────────────────────────────────────
  test("fleet = 0 – no trucks purchased, no license; deployment still applies", () => {
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 0, kmPerYear: 0 },
    ];
    const result = calcCostBreakdown(COST_MODEL_DEFAULTS, drivers);
    const r = result.rows[0];

    expect(r.newTrucks).toBe(0);
    expect(r.capexTrucks).toBe(0);
    expect(r.opexTruckLicenseEUR).toBe(0);
    // One-time deployment still fires in year 0
    expect(r.capexDeployment).toBe(200_000);
  });

  // ── 5c. Edge – fx ≤ 0 ────────────────────────────────────────────────────
  test("fx = 0 throws; fx = −5 throws", () => {
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 1, kmPerYear: 1_000 },
    ];

    expect(() =>
      calcCostBreakdown({ ...COST_MODEL_DEFAULTS, fxSEKPerEUR: 0 }, drivers),
    ).toThrow(/FX rate/);

    expect(() =>
      calcCostBreakdown({ ...COST_MODEL_DEFAULTS, fxSEKPerEUR: -5 }, drivers),
    ).toThrow(/FX rate/);
  });

  // ── 5d. Edge – negative cost inputs ──────────────────────────────────────
  test("negative truckPriceEUR throws", () => {
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 1, kmPerYear: 1_000 },
    ];
    expect(() =>
      calcCostBreakdown(
        { ...COST_MODEL_DEFAULTS, truckPriceEUR: -100 },
        drivers,
      ),
    ).toThrow(/truckPriceEUR/);
  });

  test("negative serviceSEKPerKm throws", () => {
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 1, kmPerYear: 1_000 },
    ];
    expect(() =>
      calcCostBreakdown(
        { ...COST_MODEL_DEFAULTS, serviceSEKPerKm: -1 },
        drivers,
      ),
    ).toThrow(/serviceSEKPerKm/);
  });

  // ── 5e. Edge – negative driver fields ────────────────────────────────────
  test("negative fleetSize in driver throws", () => {
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: -1, kmPerYear: 1_000 },
    ];
    expect(() => calcCostBreakdown(COST_MODEL_DEFAULTS, drivers)).toThrow(
      /fleetSize/,
    );
  });

  test("negative kmPerYear in driver throws", () => {
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 5, kmPerYear: -100 },
    ];
    expect(() => calcCostBreakdown(COST_MODEL_DEFAULTS, drivers)).toThrow(
      /kmPerYear/,
    );
  });

  // ── 6. Period totals are sums of row totals ──────────────────────────────
  test("period totals equal sum of every row", () => {
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 10, kmPerYear: 100_000 },
      { year: 2027, fleetSize: 15, kmPerYear: 150_000 },
      { year: 2028, fleetSize: 20, kmPerYear: 200_000 },
    ];
    const { rows, periodTotals } = calcCostBreakdown(
      COST_MODEL_DEFAULTS,
      drivers,
    );

    const sum = (fn: (r: (typeof rows)[0]) => number) =>
      rows.reduce((s, r) => s + fn(r), 0);

    expect(periodTotals.capexTrucksEUR).toBe(sum((r) => r.capexTrucks));
    expect(periodTotals.capexOneTimeEUR).toBe(
      sum((r) => r.capexDeployment + r.capexFms),
    );
    expect(periodTotals.capexTotalEUR).toBe(sum((r) => r.capexTotalEUR));
    expect(periodTotals.opexTotalEUR).toBe(sum((r) => r.opexTotalEUR));
    expect(periodTotals.opexTotalSEK).toBe(sum((r) => r.opexTotalSEK));
    expect(periodTotals.totalCostEUR).toBeCloseTo(sum((r) => r.totalCostEUR), 5);
    expect(periodTotals.totalCostSEK).toBeCloseTo(sum((r) => r.totalCostSEK), 5);
  });

  // ── 7. Fleet shrinks → no negative purchases ────────────────────────────
  test("shrinking fleet produces zero new trucks (never negative)", () => {
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 20, kmPerYear: 200_000 },
      { year: 2027, fleetSize: 15, kmPerYear: 150_000 }, // −5
      { year: 2028, fleetSize: 10, kmPerYear: 100_000 }, // −5
    ];
    const { rows } = calcCostBreakdown(COST_MODEL_DEFAULTS, drivers);

    expect(rows[0].newTrucks).toBe(20);
    expect(rows[1].newTrucks).toBe(0); // max(0, 15−20)
    expect(rows[2].newTrucks).toBe(0); // max(0, 10−15)
    expect(rows[1].capexTrucks).toBe(0);
    expect(rows[2].capexTrucks).toBe(0);
  });

  // ── 8. Empty drivers ─────────────────────────────────────────────────────
  test("empty drivers → empty rows and zero period totals", () => {
    const { rows, periodTotals } = calcCostBreakdown(COST_MODEL_DEFAULTS, []);

    expect(rows).toHaveLength(0);
    expect(periodTotals.capexTrucksEUR).toBe(0);
    expect(periodTotals.capexOneTimeEUR).toBe(0);
    expect(periodTotals.capexTotalEUR).toBe(0);
    expect(periodTotals.opexTotalEUR).toBe(0);
    expect(periodTotals.opexTotalSEK).toBe(0);
    expect(periodTotals.totalCostEUR).toBe(0);
    expect(periodTotals.totalCostSEK).toBe(0);
  });

  // ── 9. FX identity across all rows ───────────────────────────────────────
  // totalCostSEK_y === totalCostEUR_y × fx for every row
  test("totalCostSEK === totalCostEUR × fx holds for every row", () => {
    const fx = 12.5;
    const model: CostModelInput = {
      ...COST_MODEL_DEFAULTS,
      fxSEKPerEUR: fx,
      includeFMS: true,
    };
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 8, kmPerYear: 80_000 },
      { year: 2027, fleetSize: 12, kmPerYear: 100_000 },
      { year: 2028, fleetSize: 10, kmPerYear: 90_000 },
    ];
    const { rows } = calcCostBreakdown(model, drivers);

    for (const r of rows) {
      expect(r.totalCostSEK).toBeCloseTo(r.totalCostEUR * fx, 4);
    }
  });

  // ── 10. Custom FX with exact integer result ─────────────────────────────
  // Choose values so opexTotalSEK is exactly divisible by fx
  test("exact integer totals when SEK divides evenly by fx", () => {
    const model: CostModelInput = {
      ...COST_MODEL_DEFAULTS,
      truckPriceEUR: 100_000,
      truckLicenseEURPerYear: 10_000,
      serviceSEKPerKm: 5,
      fuelSEKPerKm: 5,
      deploymentOneTimeEUR: 0,
      fxSEKPerEUR: 10,
    };
    // km = 10 000 → opexTotalSEK = 10 000 × (5+5) = 100 000
    // 100 000 / 10 = 10 000 (exact)
    const drivers: YearlyDriver[] = [
      { year: 2026, fleetSize: 1, kmPerYear: 10_000 },
    ];
    const { rows } = calcCostBreakdown(model, drivers);
    const r = rows[0];

    // capexTrucks = 100 000, deployment = 0, capex = 100 000
    // opexTruckLicense = 10 000, opexTotalEUR = 10 000
    // opexTotalSEK = 100 000
    // totalCostEUR = 100 000 + 10 000 + 100 000/10 = 120 000
    expect(r.totalCostEUR).toBe(120_000);
    // totalCostSEK = (100 000 + 10 000) × 10 + 100 000 = 1 200 000
    expect(r.totalCostSEK).toBe(1_200_000);
  });
});
