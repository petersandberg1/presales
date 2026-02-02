import { z } from "zod";

/**
 * Input schema for fleet sizing calculation
 *
 * Determines how many trucks are needed to meet the mine's production target
 * based on the annual capacity of each truck.
 */
export const FleetSizingInputSchema = z.object({
  // Total mine production target in tonnes per year
  totalMineTonnesPerYear: z.number().min(0).optional().default(5_000_000),

  // Annual capacity per truck in tonnes per year (must be positive)
  tonnesPerTruckYear: z.number().gt(0),
});

export type FleetSizingInput = z.input<typeof FleetSizingInputSchema>;

/**
 * Output of fleet sizing calculation
 */
export type FleetSizingResult = {
  // Raw calculation before rounding
  rawTrucks: number;

  // Final truck count after applying rounding rules
  trucksRequired: number;
};

/**
 * Calculate required truck fleet size
 *
 * Rounding rule:
 * - Calculate rawTrucks = totalMineTonnesPerYear / tonnesPerTruckYear
 * - Let fractionalPart = rawTrucks - floor(rawTrucks)
 * - If fractionalPart >= 0.20 → round UP to next integer
 * - If fractionalPart < 0.20 → round DOWN to current integer
 *
 * Examples:
 * - 7.20 → 8 trucks
 * - 7.19 → 7 trucks
 * - 7.00 → 7 trucks
 * - 0.20 → 1 truck
 * - 0.19 → 0 trucks
 *
 * Safety rule:
 * If totalMineTonnesPerYear > 0, ensure at least 1 truck is allocated.
 * This prevents situations where a non-zero production target results in
 * zero trucks due to rounding down small fractional values.
 *
 * @param input - Mine production target and per-truck capacity
 * @returns Raw and rounded truck counts
 */
export function calculateFleetSize(input: FleetSizingInput): FleetSizingResult {
  const validated = FleetSizingInputSchema.parse(input);

  // Step 1: Calculate raw truck requirement
  const rawTrucks = validated.totalMineTonnesPerYear / validated.tonnesPerTruckYear;

  // Step 2: Apply custom rounding rule (threshold = 0.20)
  const ROUNDING_THRESHOLD = 0.20;
  const floorValue = Math.floor(rawTrucks);
  const fractionalPart = rawTrucks - floorValue;

  let trucksRequired: number;
  if (fractionalPart >= ROUNDING_THRESHOLD) {
    // Round up
    trucksRequired = floorValue + 1;
  } else {
    // Round down
    trucksRequired = floorValue;
  }

  // Step 3: Safety rule - ensure at least 1 truck if production target > 0
  // This handles edge cases like very small production targets or very large
  // truck capacities that would round down to zero
  if (validated.totalMineTonnesPerYear > 0 && trucksRequired === 0) {
    trucksRequired = 1;
  }

  return {
    rawTrucks,
    trucksRequired,
  };
}
