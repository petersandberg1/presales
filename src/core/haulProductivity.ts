import { z } from "zod";

/**
 * Input schema for haul productivity calculations
 *
 * Calculates how productive a single truck is based on:
 * - Cycle time (from HaulCycleTime module)
 * - Payload capacity
 * - Operational efficiency factors
 */
export const HaulProductivityInputSchema = z.object({
  // Cycle time in seconds (must be positive)
  cycleTimeSeconds: z.number().gt(0),

  // Payload per cycle in tonnes (must be positive)
  payloadTonnes: z.number().gt(0),

  // Operational factors (all multiplicative, range 0..1)
  // Availability: fraction of time truck is available (not in maintenance)
  availability: z.number().min(0).max(1).optional().default(0.90),

  // Efficiency: fraction of available time truck is productive
  efficiency: z.number().min(0).max(1).optional().default(0.60),

  // Utilization: fraction of efficient time truck is actually used
  utilization: z.number().min(0).max(1).optional().default(0.90),
});

export type HaulProductivityInput = z.input<typeof HaulProductivityInputSchema>;

/**
 * Output of haul productivity calculation
 */
export type HaulProductivityResult = {
  // Theoretical cycles per hour (no operational factors applied)
  theoreticalCyclesPerHour: number;

  // Theoretical cycles per year (365 days, 24 hours/day)
  theoreticalCyclesPerYear: number;

  // Combined operational factor (availability × efficiency × utilization)
  effectiveFactor: number;

  // Actual cycles per year after applying operational factors
  effectiveCyclesPerYear: number;

  // Annual tonnage capacity per truck (tonnes/year)
  tonnesPerTruckYear: number;

  // Effective tonnes per hour (tph) after operational factors
  tonnesPerHour: number;
};

/**
 * Calculate haul productivity metrics for a single truck
 *
 * Formula overview:
 * 1. theoreticalCyclesPerHour = 3600 / cycleTimeSeconds
 * 2. theoreticalCyclesPerYear = (365 × 24 × 3600) / cycleTimeSeconds
 * 3. effectiveFactor = availability × efficiency × utilization
 * 4. effectiveCyclesPerYear = theoreticalCyclesPerYear × effectiveFactor
 * 5. tonnesPerTruckYear = payloadTonnes × effectiveCyclesPerYear
 * 6. tonnesPerHour = payloadTonnes × theoreticalCyclesPerHour × effectiveFactor
 *
 * @param input - Cycle time, payload, and operational factors
 * @returns Productivity metrics including tph and annual capacity
 */
export function calculateHaulProductivity(
  input: HaulProductivityInput
): HaulProductivityResult {
  const validated = HaulProductivityInputSchema.parse(input);

  // Constants
  const SECONDS_PER_HOUR = 3600;
  const HOURS_PER_YEAR = 365 * 24;
  const SECONDS_PER_YEAR = HOURS_PER_YEAR * SECONDS_PER_HOUR;

  // Step 1: Calculate theoretical cycles (no downtime)
  const theoreticalCyclesPerHour = SECONDS_PER_HOUR / validated.cycleTimeSeconds;
  const theoreticalCyclesPerYear = SECONDS_PER_YEAR / validated.cycleTimeSeconds;

  // Step 2: Calculate combined operational factor
  const effectiveFactor =
    validated.availability *
    validated.efficiency *
    validated.utilization;

  // Step 3: Apply operational factors to get effective cycles
  const effectiveCyclesPerYear = theoreticalCyclesPerYear * effectiveFactor;

  // Step 4: Calculate tonnage metrics
  const tonnesPerTruckYear = validated.payloadTonnes * effectiveCyclesPerYear;
  const tonnesPerHour = validated.payloadTonnes * theoreticalCyclesPerHour * effectiveFactor;

  return {
    theoreticalCyclesPerHour,
    theoreticalCyclesPerYear,
    effectiveFactor,
    effectiveCyclesPerYear,
    tonnesPerTruckYear,
    tonnesPerHour,
  };
}
