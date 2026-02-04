/**
 * CAPEX + OPEX cost calculation layer.
 *
 * Math overview (per year y):
 *   newTrucks_y  = max(0, fleet_y − fleet_{y-1})   (fleet_{-1} = 0)
 *
 *   CAPEX (all EUR):
 *     capexTrucks_y      = newTrucks_y × truckPriceEUR
 *     capexDeployment_y  = deploymentOneTimeEUR          (first year only)
 *     capexFms_y         = fmsDeployment + fmsHw         (first year only, if FMS enabled)
 *     capexTotalEUR_y    = sum of above
 *
 *   OPEX – EUR:
 *     opexTruckLicense_y = fleet_y × truckLicenseEURPerYear
 *     opexFmsLicense_y   = fmsAnnualLicenseEUR           (every year, if FMS enabled)
 *     opexTotalEUR_y     = sum of above
 *
 *   OPEX – SEK:
 *     opexService_y  = km_y × serviceSEKPerKm
 *     opexFuel_y     = km_y × fuelSEKPerKm
 *     opexTotalSEK_y = sum of above
 *
 *   Combined totals (native + converted):
 *     totalCostEUR_y = capexTotalEUR_y + opexTotalEUR_y + opexTotalSEK_y / fxSEKPerEUR
 *     totalCostSEK_y = (capexTotalEUR_y + opexTotalEUR_y) × fxSEKPerEUR + opexTotalSEK_y
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface CostModelInput {
  truckPriceEUR: number;
  truckLicenseEURPerYear: number;
  includeFMS: boolean;
  fmsAnnualLicenseEUR: number;
  fmsDeploymentOneTimeEUR: number;
  fmsHwOneTimeEUR: number;
  serviceSEKPerKm: number;
  fuelSEKPerKm: number;
  deploymentOneTimeEUR: number;
  fxSEKPerEUR: number;
}

export const COST_MODEL_DEFAULTS: CostModelInput = {
  truckPriceEUR: 300_000,
  truckLicenseEURPerYear: 50_000,
  includeFMS: false,
  fmsAnnualLicenseEUR: 100_000,
  fmsDeploymentOneTimeEUR: 250_000,
  fmsHwOneTimeEUR: 150_000,
  serviceSEKPerKm: 2,
  fuelSEKPerKm: 6,
  deploymentOneTimeEUR: 200_000,
  fxSEKPerEUR: 11.0,
};

export interface YearlyDriver {
  year: number;
  fleetSize: number;
  kmPerYear: number;
}

export interface YearlyCostRow {
  year: number;
  fleetSize: number;
  newTrucks: number;
  kmPerYear: number;

  // CAPEX (EUR)
  capexTrucks: number;
  capexDeployment: number;
  capexFms: number;
  capexTotalEUR: number;

  // OPEX – EUR portion
  opexTruckLicenseEUR: number;
  opexFmsLicenseEUR: number;
  opexTotalEUR: number;

  // OPEX – SEK portion
  opexServiceSEK: number;
  opexFuelSEK: number;
  opexTotalSEK: number;

  // Combined totals
  totalCostEUR: number;
  totalCostSEK: number;
}

export interface CostBreakdownResult {
  rows: YearlyCostRow[];
  periodTotals: {
    capexTrucksEUR: number;
    capexOneTimeEUR: number;
    capexTotalEUR: number;
    opexTotalEUR: number;
    opexTotalSEK: number;
    totalCostEUR: number;
    totalCostSEK: number;
  };
}

// ── Validation ─────────────────────────────────────────────────────────────

const NUMERIC_COST_FIELDS = [
  "truckPriceEUR",
  "truckLicenseEURPerYear",
  "fmsAnnualLicenseEUR",
  "fmsDeploymentOneTimeEUR",
  "fmsHwOneTimeEUR",
  "serviceSEKPerKm",
  "fuelSEKPerKm",
  "deploymentOneTimeEUR",
  "fxSEKPerEUR",
] as const;

function validateCostModel(model: CostModelInput): void {
  if (model.fxSEKPerEUR <= 0) {
    throw new Error("FX rate (SEK per EUR) must be greater than 0");
  }
  for (const field of NUMERIC_COST_FIELDS) {
    if (model[field] < 0) {
      throw new Error(`${field} must not be negative`);
    }
  }
}

function validateDrivers(drivers: YearlyDriver[]): void {
  for (const d of drivers) {
    if (d.fleetSize < 0) {
      throw new Error("fleetSize must not be negative");
    }
    if (d.kmPerYear < 0) {
      throw new Error("kmPerYear must not be negative");
    }
  }
}

// ── Core calculation ───────────────────────────────────────────────────────

export function calcCostBreakdown(
  model: CostModelInput,
  drivers: YearlyDriver[],
): CostBreakdownResult {
  validateCostModel(model);
  validateDrivers(drivers);

  let prevFleet = 0;
  const rows: YearlyCostRow[] = drivers.map((d, i) => {
    const newTrucks = Math.max(0, d.fleetSize - prevFleet);
    prevFleet = d.fleetSize;

    const isFirstYear = i === 0;

    // CAPEX
    const capexTrucks = newTrucks * model.truckPriceEUR;
    const capexDeployment = isFirstYear ? model.deploymentOneTimeEUR : 0;
    const capexFms =
      isFirstYear && model.includeFMS
        ? model.fmsDeploymentOneTimeEUR + model.fmsHwOneTimeEUR
        : 0;
    const capexTotalEUR = capexTrucks + capexDeployment + capexFms;

    // OPEX – EUR
    const opexTruckLicenseEUR = d.fleetSize * model.truckLicenseEURPerYear;
    const opexFmsLicenseEUR = model.includeFMS ? model.fmsAnnualLicenseEUR : 0;
    const opexTotalEUR = opexTruckLicenseEUR + opexFmsLicenseEUR;

    // OPEX – SEK
    const opexServiceSEK = d.kmPerYear * model.serviceSEKPerKm;
    const opexFuelSEK = d.kmPerYear * model.fuelSEKPerKm;
    const opexTotalSEK = opexServiceSEK + opexFuelSEK;

    // Combined
    const totalCostEUR =
      capexTotalEUR + opexTotalEUR + opexTotalSEK / model.fxSEKPerEUR;
    const totalCostSEK =
      (capexTotalEUR + opexTotalEUR) * model.fxSEKPerEUR + opexTotalSEK;

    return {
      year: d.year,
      fleetSize: d.fleetSize,
      newTrucks,
      kmPerYear: d.kmPerYear,
      capexTrucks,
      capexDeployment,
      capexFms,
      capexTotalEUR,
      opexTruckLicenseEUR,
      opexFmsLicenseEUR,
      opexTotalEUR,
      opexServiceSEK,
      opexFuelSEK,
      opexTotalSEK,
      totalCostEUR,
      totalCostSEK,
    };
  });

  const periodTotals = rows.reduce(
    (acc, row) => ({
      capexTrucksEUR: acc.capexTrucksEUR + row.capexTrucks,
      capexOneTimeEUR:
        acc.capexOneTimeEUR + row.capexDeployment + row.capexFms,
      capexTotalEUR: acc.capexTotalEUR + row.capexTotalEUR,
      opexTotalEUR: acc.opexTotalEUR + row.opexTotalEUR,
      opexTotalSEK: acc.opexTotalSEK + row.opexTotalSEK,
      totalCostEUR: acc.totalCostEUR + row.totalCostEUR,
      totalCostSEK: acc.totalCostSEK + row.totalCostSEK,
    }),
    {
      capexTrucksEUR: 0,
      capexOneTimeEUR: 0,
      capexTotalEUR: 0,
      opexTotalEUR: 0,
      opexTotalSEK: 0,
      totalCostEUR: 0,
      totalCostSEK: 0,
    },
  );

  return { rows, periodTotals };
}
