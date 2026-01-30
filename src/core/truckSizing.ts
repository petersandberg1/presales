import {
  MinePlanSchema,
  HaulParamsSchema,
  type MinePlan,
  type HaulParams,
  type TruckSizingResult,
} from "./mineplan";

export function sizeTrucksFromMinePlan(plan: MinePlan, params: HaulParams): TruckSizingResult {
  const p = MinePlanSchema.parse(plan);
  const hp = HaulParamsSchema.parse(params);

  const tonsPerYear = p.millionTonsPerYear * 1_000_000;

  const totalOperatingHoursPerYear = hp.operatingDaysPerYear * hp.operatingHoursPerDay;
  const requiredTph = tonsPerYear / totalOperatingHoursPerYear;

  const cyclesPerHour = 60 / hp.cycleTimeMinutes;
  const effectiveTphPerTruck =
    hp.payloadTons * cyclesPerHour * hp.availability * hp.utilization;

  const trucksRequired = effectiveTphPerTruck > 0 ? Math.ceil(requiredTph / effectiveTphPerTruck) : Infinity;

  return { tonsPerYear, requiredTph, effectiveTphPerTruck, trucksRequired };
}