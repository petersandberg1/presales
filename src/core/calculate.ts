import { ScenarioInputSchema, type ScenarioInput, type ScenarioResult } from "./scenario";

export function calculate(input: ScenarioInput): ScenarioResult {
  // runtime-guard: gör att samma kod kan köras säkert i backend senare
  const x = ScenarioInputSchema.parse(input);

  const totalHoursPerDay = x.trucks * x.hoursPerDay;
  const dailyCost = totalHoursPerDay * x.costPerHour;

  return {
    totalHoursPerDay,
    dailyCost,
  };
}