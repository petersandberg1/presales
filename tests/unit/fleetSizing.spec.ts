import { describe, it, expect } from "vitest";
import { calculateFleetSize } from "@/core";

describe("FleetSizing", () => {
  it("calculates correct fleet size for exact division", () => {
    /*
      Mine target: 5,000,000 tonnes/year
      Truck capacity: 1,000,000 tonnes/year
      Expected: exactly 5 trucks
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 5_000_000,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBe(5.0);
    expect(result.trucksRequired).toBe(5);
  });

  it("rounds UP when fractional part is exactly 0.20", () => {
    /*
      Rounding threshold test: 7.20 → 8 trucks
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 7_200_000,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBe(7.2);
    expect(result.trucksRequired).toBe(8);
  });

  it("rounds DOWN when fractional part is 0.19", () => {
    /*
      Rounding threshold test: 7.19 → 7 trucks
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 7_190_000,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBe(7.19);
    expect(result.trucksRequired).toBe(7);
  });

  it("rounds UP when fractional part is 0.20 (edge case with small numbers)", () => {
    /*
      Rounding threshold test: 0.20 → 1 truck
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 200_000,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBe(0.2);
    expect(result.trucksRequired).toBe(1);
  });

  it("applies safety rule: 0.19 with positive tonnage → 1 truck minimum", () => {
    /*
      Rounding threshold test: 0.19 would round to 0
      But safety rule ensures at least 1 truck when tonnage > 0
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 190_000,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBe(0.19);
    // Safety rule: ensure at least 1 truck for positive tonnage
    expect(result.trucksRequired).toBe(1);
  });

  it("rounds UP when fractional part is 0.50", () => {
    /*
      Test with larger fractional part: 5.50 → 6 trucks
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 5_500_000,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBe(5.5);
    expect(result.trucksRequired).toBe(6);
  });

  it("rounds DOWN when fractional part is 0.15", () => {
    /*
      Test below threshold: 10.15 → 10 trucks
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 10_150_000,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBe(10.15);
    expect(result.trucksRequired).toBe(10);
  });

  it("rounds UP when fractional part is 0.99", () => {
    /*
      Test high fractional: 3.99 → 4 trucks
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 3_990_000,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBe(3.99);
    expect(result.trucksRequired).toBe(4);
  });

  it("handles zero mine tonnage correctly", () => {
    /*
      No production target → 0 trucks
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 0,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBe(0);
    expect(result.trucksRequired).toBe(0);
  });

  it("applies safety rule for very small positive tonnage", () => {
    /*
      Very small production: 1 tonne/year with large truck capacity
      rawTrucks = 0.000001, rounds to 0, but safety rule → 1 truck
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 1,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBeCloseTo(0.000001, 6);
    // Safety rule: at least 1 truck when tonnage > 0
    expect(result.trucksRequired).toBe(1);
  });

  it("uses default mine tonnage when not provided", () => {
    /*
      Test default value: 5,000,000 tonnes/year
    */

    const result = calculateFleetSize({
      // Not providing totalMineTonnesPerYear, should use default
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBe(5.0);
    expect(result.trucksRequired).toBe(5);
  });

  it("throws error when tonnesPerTruckYear <= 0", () => {
    expect(() =>
      calculateFleetSize({
        totalMineTonnesPerYear: 5_000_000,
        tonnesPerTruckYear: 0,
      })
    ).toThrow();

    expect(() =>
      calculateFleetSize({
        totalMineTonnesPerYear: 5_000_000,
        tonnesPerTruckYear: -100_000,
      })
    ).toThrow();
  });

  it("throws error when totalMineTonnesPerYear is negative", () => {
    expect(() =>
      calculateFleetSize({
        totalMineTonnesPerYear: -1_000_000,
        tonnesPerTruckYear: 500_000,
      })
    ).toThrow();
  });

  it("calculates realistic mining scenario", () => {
    /*
      Realistic scenario:
      - Mine target: 5,000,000 tonnes/year
      - Truck capacity: 2,554,416 tonnes/year (from HaulProductivity example)
      - Expected: 5,000,000 / 2,554,416 = 1.957... → rounds DOWN to 1 truck
      - But this seems insufficient, so maybe 2 trucks
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 5_000_000,
      tonnesPerTruckYear: 2_554_416,
    });

    // rawTrucks = 1.957...
    expect(result.rawTrucks).toBeCloseTo(1.957, 2);

    // Fractional part ≈ 0.957, which is >= 0.20, so rounds UP to 2
    expect(result.trucksRequired).toBe(2);
  });

  it("tests threshold boundary at 0.199... (just below threshold)", () => {
    /*
      Edge case: 5.199 → 5 trucks (rounds DOWN because 0.199 < 0.20)
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 5_199_000,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBeCloseTo(5.199, 3);
    // fractionalPart = 5.199 - 5 = 0.199, which is < 0.20 → round DOWN to 5
    expect(result.trucksRequired).toBe(5);
  });

  it("tests threshold boundary at 0.200... (exactly at threshold)", () => {
    /*
      Edge case: 5.200 → 6 trucks
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 5_200_000,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBe(5.2);
    expect(result.trucksRequired).toBe(6); // 0.20 >= 0.20 → round UP to 6
  });

  it("handles large fleet sizes correctly", () => {
    /*
      Large operation: 50,000,000 tonnes/year with smaller trucks
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 50_000_000,
      tonnesPerTruckYear: 2_000_000,
    });

    expect(result.rawTrucks).toBe(25.0);
    expect(result.trucksRequired).toBe(25);
  });

  it("tests fractional part exactly at 0.21 (above threshold)", () => {
    /*
      Test: 8.21 → 9 trucks
    */

    const result = calculateFleetSize({
      totalMineTonnesPerYear: 8_210_000,
      tonnesPerTruckYear: 1_000_000,
    });

    expect(result.rawTrucks).toBe(8.21);
    expect(result.trucksRequired).toBe(9);
  });
});
