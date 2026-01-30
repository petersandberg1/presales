import { z } from "zod";

/**
 * Input schema
 */
export const HaulCycleTimeInputSchema = z.object({
  distanceLoaded: z.number().int().min(0),      // meters
  distanceUnloaded: z.number().int().min(0),    // meters

  speedLoaded: z.number().gt(0),                // km/h
  speedUnloaded: z.number().gt(0),              // km/h

  loadingTime: z.number().gt(0),                // seconds
  unloadingTime: z.number().gt(0),              // seconds
});

export type HaulCycleTimeInput = z.infer<typeof HaulCycleTimeInputSchema>;

/**
 * Output
 */
export type HaulCycleTimeResult = {
  cycleTimeSeconds: number;
};

/**
 * Calculate haul cycle time (one full cycle) in seconds
 */
export function calculateHaulCycleTime(
  input: HaulCycleTimeInput
): HaulCycleTimeResult {
  const x = HaulCycleTimeInputSchema.parse(input);

  // Convert speeds from km/h → m/s
  const speedLoadedMs = (x.speedLoaded * 1000) / 3600;
  const speedUnloadedMs = (x.speedUnloaded * 1000) / 3600;

  // Travel times in seconds
  const loadedTravelTime =
    speedLoadedMs > 0 ? x.distanceLoaded / speedLoadedMs : 0;

  const unloadedTravelTime =
    speedUnloadedMs > 0 ? x.distanceUnloaded / speedUnloadedMs : 0;

  const cycleTimeSeconds =
    loadedTravelTime +
    unloadedTravelTime +
    x.loadingTime +
    x.unloadingTime;

  return {
    cycleTimeSeconds,
  };
}