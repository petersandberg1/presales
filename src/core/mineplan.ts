import { z } from "zod";

export const MinePlanSchema = z.object({
  millionTonsPerYear: z.number().min(0),
});
export type MinePlan = z.infer<typeof MinePlanSchema>;

export const HaulParamsSchema = z.object({
  operatingDaysPerYear: z.number().int().min(1).max(366),
  operatingHoursPerDay: z.number().min(1).max(24),

  payloadTons: z.number().min(1),
  cycleTimeMinutes: z.number().min(1),

  availability: z.number().min(0).max(1),
  utilization: z.number().min(0).max(1),
});
export type HaulParams = z.infer<typeof HaulParamsSchema>;

export type TruckSizingResult = {
  tonsPerYear: number;
  requiredTph: number;
  effectiveTphPerTruck: number;
  trucksRequired: number;
};