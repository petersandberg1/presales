import { describe, it, expect } from "vitest";
import { calculateHaulProductivity } from "@/core";

describe("HaulProductivity", () => {
  it("calculates correct productivity with default operational factors", () => {
    /*
      Cycle time: 600 seconds (10 minutes)
      Payload: 100 tonnes
      Defaults: availability=0.90, efficiency=0.60, utilization=0.90
    */

    const result = calculateHaulProductivity({
      cycleTimeSeconds: 600,
      payloadTonnes: 100,
      // Using defaults: 0.90 × 0.60 × 0.90 = 0.486
    });

    // Theoretical cycles per hour = 3600 / 600 = 6
    expect(result.theoreticalCyclesPerHour).toBeCloseTo(6, 2);

    // Theoretical cycles per year = (365 × 24 × 3600) / 600 = 52,560
    expect(result.theoreticalCyclesPerYear).toBeCloseTo(52560, 0);

    // Effective factor = 0.90 × 0.60 × 0.90 = 0.486
    expect(result.effectiveFactor).toBeCloseTo(0.486, 3);

    // Effective cycles per year = 52,560 × 0.486 = 25,544.16
    expect(result.effectiveCyclesPerYear).toBeCloseTo(25544.16, 1);

    // Tonnes per truck year = 100 × 25,544.16 = 2,554,416
    expect(result.tonnesPerTruckYear).toBeCloseTo(2554416, 0);

    // Tonnes per hour = 100 × 6 × 0.486 = 291.6
    expect(result.tonnesPerHour).toBeCloseTo(291.6, 1);
  });

  it("calculates correct productivity with custom operational factors", () => {
    /*
      Cycle time: 450 seconds (7.5 minutes)
      Payload: 80 tonnes
      Custom: availability=0.85, efficiency=0.70, utilization=0.95
    */

    const result = calculateHaulProductivity({
      cycleTimeSeconds: 450,
      payloadTonnes: 80,
      availability: 0.85,
      efficiency: 0.70,
      utilization: 0.95,
    });

    // Theoretical cycles per hour = 3600 / 450 = 8
    expect(result.theoreticalCyclesPerHour).toBeCloseTo(8, 2);

    // Theoretical cycles per year = (365 × 24 × 3600) / 450 = 70,080
    expect(result.theoreticalCyclesPerYear).toBeCloseTo(70080, 0);

    // Effective factor = 0.85 × 0.70 × 0.95 = 0.56525
    expect(result.effectiveFactor).toBeCloseTo(0.56525, 5);

    // Effective cycles per year = 70,080 × 0.56525 = 39,612.72
    expect(result.effectiveCyclesPerYear).toBeCloseTo(39612.72, 1);

    // Tonnes per truck year = 80 × 39,612.72 = 3,169,017.6
    expect(result.tonnesPerTruckYear).toBeCloseTo(3169017.6, 0);

    // Tonnes per hour = 80 × 8 × 0.56525 = 361.76
    expect(result.tonnesPerHour).toBeCloseTo(361.76, 1);
  });

  it("handles perfect conditions (all factors = 1.0)", () => {
    /*
      Test edge case where truck operates at 100% efficiency
    */

    const result = calculateHaulProductivity({
      cycleTimeSeconds: 300,
      payloadTonnes: 50,
      availability: 1.0,
      efficiency: 1.0,
      utilization: 1.0,
    });

    // Effective factor = 1.0
    expect(result.effectiveFactor).toBe(1.0);

    // Theoretical = Effective in this case
    expect(result.effectiveCyclesPerYear).toBeCloseTo(
      result.theoreticalCyclesPerYear,
      1
    );

    // Theoretical cycles per hour = 3600 / 300 = 12
    expect(result.theoreticalCyclesPerHour).toBeCloseTo(12, 2);

    // Tonnes per hour = 50 × 12 × 1.0 = 600
    expect(result.tonnesPerHour).toBeCloseTo(600, 1);
  });

  it("handles minimal conditions (all factors at minimum)", () => {
    /*
      Test edge case where truck operates at minimum efficiency
    */

    const result = calculateHaulProductivity({
      cycleTimeSeconds: 1000,
      payloadTonnes: 150,
      availability: 0.0,
      efficiency: 0.0,
      utilization: 0.0,
    });

    // Effective factor = 0.0
    expect(result.effectiveFactor).toBe(0.0);

    // No effective production
    expect(result.effectiveCyclesPerYear).toBe(0);
    expect(result.tonnesPerTruckYear).toBe(0);
    expect(result.tonnesPerHour).toBe(0);

    // But theoretical values should still be calculated
    expect(result.theoreticalCyclesPerHour).toBeCloseTo(3.6, 2);
  });

  it("throws error when cycleTimeSeconds <= 0", () => {
    expect(() =>
      calculateHaulProductivity({
        cycleTimeSeconds: 0,
        payloadTonnes: 100,
      })
    ).toThrow();

    expect(() =>
      calculateHaulProductivity({
        cycleTimeSeconds: -100,
        payloadTonnes: 100,
      })
    ).toThrow();
  });

  it("throws error when payloadTonnes <= 0", () => {
    expect(() =>
      calculateHaulProductivity({
        cycleTimeSeconds: 600,
        payloadTonnes: 0,
      })
    ).toThrow();

    expect(() =>
      calculateHaulProductivity({
        cycleTimeSeconds: 600,
        payloadTonnes: -50,
      })
    ).toThrow();
  });

  it("throws error when availability is outside 0..1 range", () => {
    expect(() =>
      calculateHaulProductivity({
        cycleTimeSeconds: 600,
        payloadTonnes: 100,
        availability: -0.1,
      })
    ).toThrow();

    expect(() =>
      calculateHaulProductivity({
        cycleTimeSeconds: 600,
        payloadTonnes: 100,
        availability: 1.1,
      })
    ).toThrow();
  });

  it("throws error when efficiency is outside 0..1 range", () => {
    expect(() =>
      calculateHaulProductivity({
        cycleTimeSeconds: 600,
        payloadTonnes: 100,
        efficiency: -0.1,
      })
    ).toThrow();

    expect(() =>
      calculateHaulProductivity({
        cycleTimeSeconds: 600,
        payloadTonnes: 100,
        efficiency: 1.5,
      })
    ).toThrow();
  });

  it("throws error when utilization is outside 0..1 range", () => {
    expect(() =>
      calculateHaulProductivity({
        cycleTimeSeconds: 600,
        payloadTonnes: 100,
        utilization: -0.01,
      })
    ).toThrow();

    expect(() =>
      calculateHaulProductivity({
        cycleTimeSeconds: 600,
        payloadTonnes: 100,
        utilization: 2.0,
      })
    ).toThrow();
  });

  it("applies default values correctly when not provided", () => {
    const result = calculateHaulProductivity({
      cycleTimeSeconds: 600,
      payloadTonnes: 100,
      // Not providing operational factors, should use defaults
    });

    // Should use default effective factor: 0.90 × 0.60 × 0.90 = 0.486
    expect(result.effectiveFactor).toBeCloseTo(0.486, 3);
  });

  it("calculates realistic mining scenario", () => {
    /*
      Realistic scenario:
      - 10-minute cycle (from HaulCycleTime calculation)
      - 150-tonne payload truck
      - 90% availability (maintenance downtime)
      - 65% efficiency (delays, waiting, etc.)
      - 85% utilization (not all time is used)
    */

    const result = calculateHaulProductivity({
      cycleTimeSeconds: 600,
      payloadTonnes: 150,
      availability: 0.90,
      efficiency: 0.65,
      utilization: 0.85,
    });

    // Effective factor = 0.90 × 0.65 × 0.85 = 0.49725
    expect(result.effectiveFactor).toBeCloseTo(0.49725, 5);

    // Theoretical cycles per hour = 6
    // TPH = 150 × 6 × 0.49725 = 447.525
    expect(result.tonnesPerHour).toBeCloseTo(447.525, 1);

    // Annual capacity should be reasonable (around 3.9M tonnes)
    // Actual: effectiveFactor = 0.49725, cycles/year = 52560, effective = 26135.46
    // tonnes = 150 × 26135.46 = 3,920,319
    expect(result.tonnesPerTruckYear).toBeCloseTo(3920319, 0);
  });
});
