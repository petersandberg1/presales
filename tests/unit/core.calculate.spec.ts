import { describe, expect, it } from "vitest";
import { calculate } from "@/core";

describe("calculate", () => {
  it("räknar daily cost korrekt", () => {
    const result = calculate({ trucks: 10, hoursPerDay: 20, costPerHour: 100 });
    expect(result.totalHoursPerDay).toBe(200);
    expect(result.dailyCost).toBe(20000);
  });

  it("kastar fel på ogiltig input", () => {
    expect(() => calculate({ trucks: 0, hoursPerDay: 20, costPerHour: 100 } as any)).toThrow();
  });
}); 