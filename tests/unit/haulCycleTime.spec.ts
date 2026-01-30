import { describe, it, expect } from "vitest";
import { calculateHaulCycleTime } from "@/core";

describe("HaulCycleTime", () => {
  it("calculates correct cycle time for simple case", () => {
    /*
      Loaded:    1,450 m @ 25 km/h
      Unloaded:  1,450 m @ 30 km/h
      Loading:   120 s
      Unloading: 90 s
    */

    const result = calculateHaulCycleTime({
      distanceLoaded: 1450,
      distanceUnloaded: 1450,
      speedLoaded: 25,
      speedUnloaded: 30,
      loadingTime: 120,
      unloadingTime: 90,
    });

    // Manual calculation:
    // 25 km/h = 6.94 m/s → 1450 / 6.94 ≈ 208.9 s
    // 30 km/h = 8.33 m/s → 1450 / 8.33 ≈ 174.0 s
    // Total = 208.9 + 174.0 + 120 + 90 ≈ 592.9 s

    expect(result.cycleTimeSeconds).toBeCloseTo(593, 0);
  });

  it("handles zero distances correctly (only load/unload time)", () => {
    const result = calculateHaulCycleTime({
      distanceLoaded: 0,
      distanceUnloaded: 0,
      speedLoaded: 20,
      speedUnloaded: 20,
      loadingTime: 100,
      unloadingTime: 80,
    });

    expect(result.cycleTimeSeconds).toBe(180);
  });

  it("throws on invalid input", () => {
    expect(() =>
      calculateHaulCycleTime({
        distanceLoaded: -100,
        distanceUnloaded: 1000,
        speedLoaded: 25,
        speedUnloaded: 30,
        loadingTime: 120,
        unloadingTime: 90,
      } as any)
    ).toThrow();
  });
});