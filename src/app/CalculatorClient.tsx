"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  calculateHaulCycleTime,
  calculateHaulProductivity,
  calculateFleetSize,
} from "@/core";
import { Button, Card, Input, Label, ErrorText } from "@/components/ui";
import {
  scenarioRepository,
  type CalculatorScenario,
  type ProductionPlanRow,
} from "@/lib/scenarioRepository";
import {
  calcCostBreakdown,
  COST_MODEL_DEFAULTS,
  type CostModelInput,
  type YearlyDriver,
} from "@/lib/cost/calcCost";

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}

interface HaulCycleInputs {
  distanceLoadedKm: number;
  distanceUnloadedKm: number;
  speedLoaded: number;
  speedUnloaded: number;
  loadingTime: number;
  unloadingTime: number;
}

interface CalculationResults {
  cycleTimeSeconds: number;
  cycleTimeMinutes: number;
  cyclesPerHour: number;
  tonnesPerHour: number;
  tonnesPerTruckYear: number;
  effectiveFactor: number;
  yearlyFleet: Array<{
    year: number;
    tonnesPerYear: number;
    rawTrucks: number;
    trucksRequired: number;
  }>;
}

type CalculationMode = "dynamic" | "static";

export default function CalculatorClient() {
  // Mode toggle
  const [mode, setMode] = useState<CalculationMode>("dynamic");

  // Haul cycle inputs (converted to km)
  const [haulCycle, setHaulCycle] = useState<HaulCycleInputs>({
    distanceLoadedKm: 1.45, // 1450m = 1.45km
    distanceUnloadedKm: 1.45,
    speedLoaded: 25,
    speedUnloaded: 30,
    loadingTime: 120,
    unloadingTime: 90,
  });

  // Truck and operational inputs
  const [payloadTonnes, setPayloadTonnes] = useState(40);
  const [availabilityPercent, setAvailabilityPercent] = useState(90);
  const [efficiencyPercent, setEfficiencyPercent] = useState(60);
  const [utilizationPercent, setUtilizationPercent] = useState(90);

  // Production plan (converted to Mt)
  const [productionPlan, setProductionPlan] = useState<ProductionPlanRow[]>([
    { year: 2026, tonnesPerYear: 5_000_000 },
    { year: 2027, tonnesPerYear: 6_000_000 },
    { year: 2028, tonnesPerYear: 4_300_000 },
    { year: 2029, tonnesPerYear: 3_000_000 },
    { year: 2030, tonnesPerYear: 2_000_000 },
  ]);

  // Results and error state
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingCalculation, setPendingCalculation] = useState(false);

  // Scenario management
  const [scenarios, setScenarios] = useState<CalculatorScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");
  const [pdfNotes, setPdfNotes] = useState("");

  // Cost model inputs
  const [costModel, setCostModel] = useState<CostModelInput>(COST_MODEL_DEFAULTS);
  const [reportingCurrency, setReportingCurrency] = useState<"EUR" | "SEK">("EUR");

  // Load scenarios on mount
  useEffect(() => {
    setScenarios(scenarioRepository.getAll());
  }, []);

  // Auto-calculate in dynamic mode
  useEffect(() => {
    if (mode === "dynamic") {
      const timer = setTimeout(() => {
        performCalculation();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setPendingCalculation(true);
    }
  }, [
    mode,
    haulCycle,
    payloadTonnes,
    availabilityPercent,
    efficiencyPercent,
    utilizationPercent,
    productionPlan,
  ]);

  // Compute cost breakdown reactively (works in both dynamic and static modes)
  const costBreakdown = useMemo(() => {
    if (!results) return null;
    try {
      const effectiveCyclesPerYear =
        ((365 * 24 * 3600) / results.cycleTimeSeconds) * results.effectiveFactor;
      const kmPerTruckYear =
        (haulCycle.distanceLoadedKm + haulCycle.distanceUnloadedKm) *
        effectiveCyclesPerYear;
      const drivers: YearlyDriver[] = results.yearlyFleet.map((yf) => ({
        year: yf.year,
        fleetSize: yf.trucksRequired,
        kmPerYear: yf.trucksRequired * kmPerTruckYear,
      }));
      return calcCostBreakdown(costModel, drivers);
    } catch {
      return null;
    }
  }, [results, costModel, haulCycle.distanceLoadedKm, haulCycle.distanceUnloadedKm]);

  // Update production year Mt value
  function updateProductionYearMt(index: number, mt: number) {
    const updated = [...productionPlan];
    updated[index] = { ...updated[index], tonnesPerYear: mt * 1_000_000 };
    setProductionPlan(updated);
  }

  // Add new production year
  function addProductionYear() {
    const lastYear =
      productionPlan.length > 0
        ? Math.max(...productionPlan.map((p) => p.year))
        : 2025;
    setProductionPlan([
      ...productionPlan,
      { year: lastYear + 1, tonnesPerYear: 5_000_000 },
    ]);
  }

  // Remove production year
  function removeProductionYear(index: number) {
    if (productionPlan.length > 1) {
      setProductionPlan(productionPlan.filter((_, i) => i !== index));
    }
  }

  // Calculate button handler
  function performCalculation() {
    setError(null);
    try {
      // Convert km back to meters for core functions
      const cycleTimeResult = calculateHaulCycleTime({
        distanceLoaded: Math.round(haulCycle.distanceLoadedKm * 1000),
        distanceUnloaded: Math.round(haulCycle.distanceUnloadedKm * 1000),
        speedLoaded: haulCycle.speedLoaded,
        speedUnloaded: haulCycle.speedUnloaded,
        loadingTime: haulCycle.loadingTime,
        unloadingTime: haulCycle.unloadingTime,
      });

      const productivityResult = calculateHaulProductivity({
        cycleTimeSeconds: cycleTimeResult.cycleTimeSeconds,
        payloadTonnes: payloadTonnes,
        availability: availabilityPercent / 100,
        efficiency: efficiencyPercent / 100,
        utilization: utilizationPercent / 100,
      });

      const yearlyFleet = productionPlan.map((plan) => {
        const fleetResult = calculateFleetSize({
          totalMineTonnesPerYear: plan.tonnesPerYear,
          tonnesPerTruckYear: productivityResult.tonnesPerTruckYear,
        });

        return {
          year: plan.year,
          tonnesPerYear: plan.tonnesPerYear,
          rawTrucks: fleetResult.rawTrucks,
          trucksRequired: fleetResult.trucksRequired,
        };
      });

      setResults({
        cycleTimeSeconds: cycleTimeResult.cycleTimeSeconds,
        cycleTimeMinutes: cycleTimeResult.cycleTimeSeconds / 60,
        cyclesPerHour: productivityResult.theoreticalCyclesPerHour,
        tonnesPerHour: productivityResult.tonnesPerHour,
        tonnesPerTruckYear: productivityResult.tonnesPerTruckYear,
        effectiveFactor: productivityResult.effectiveFactor,
        yearlyFleet,
      });
      setPendingCalculation(false);
    } catch (e: unknown) {
      setResults(null);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Invalid input values. Please check your entries.");
      }
    }
  }

  // Manual calculate for static mode
  function onCalculate() {
    performCalculation();
  }

  // Save scenario
  function onSaveScenario() {
    if (!scenarioName.trim()) {
      setError("Please enter a scenario name.");
      return;
    }

    if (!results) {
      setError("Please calculate results before saving.");
      return;
    }

    try {
      scenarioRepository.save({
        name: scenarioName.trim(),
        distanceLoaded: Math.round(haulCycle.distanceLoadedKm * 1000),
        distanceUnloaded: Math.round(haulCycle.distanceUnloadedKm * 1000),
        speedLoaded: haulCycle.speedLoaded,
        speedUnloaded: haulCycle.speedUnloaded,
        loadingTime: haulCycle.loadingTime,
        unloadingTime: haulCycle.unloadingTime,
        payloadTonnes,
        availability: availabilityPercent / 100,
        efficiency: efficiencyPercent / 100,
        utilization: utilizationPercent / 100,
        productionPlan,
        costModel,
        cycleTimeSeconds: results.cycleTimeSeconds,
        tonnesPerHour: results.tonnesPerHour,
        tonnesPerTruckYear: results.tonnesPerTruckYear,
        effectiveFactor: results.effectiveFactor,
      });

      setScenarios(scenarioRepository.getAll());
      setScenarioName("");
      setError(null);
    } catch (e) {
      setError("Failed to save scenario.");
    }
  }

  // Load scenario
  function onLoadScenario(scenario: CalculatorScenario) {
    setHaulCycle({
      distanceLoadedKm: scenario.distanceLoaded / 1000,
      distanceUnloadedKm: scenario.distanceUnloaded / 1000,
      speedLoaded: scenario.speedLoaded,
      speedUnloaded: scenario.speedUnloaded,
      loadingTime: scenario.loadingTime,
      unloadingTime: scenario.unloadingTime,
    });

    setPayloadTonnes(scenario.payloadTonnes);
    setAvailabilityPercent(Math.round(scenario.availability * 100));
    setEfficiencyPercent(Math.round(scenario.efficiency * 100));
    setUtilizationPercent(Math.round(scenario.utilization * 100));
    setProductionPlan(
      scenario.productionPlan || [{ year: 2026, tonnesPerYear: 5_000_000 }]
    );
    setCostModel(scenario.costModel || COST_MODEL_DEFAULTS);

    setError(null);
  }

  // Delete scenario
  function onDeleteScenario(id: string) {
    try {
      scenarioRepository.delete(id);
      setScenarios(scenarioRepository.getAll());
    } catch (e) {
      setError("Failed to delete scenario.");
    }
  }

  // Export current results to PDF
  async function onExportPdf() {
    if (!results) return;
    const { generateFleetPdf } = await import("@/lib/pdfExport");
    const blob = generateFleetPdf({
      distanceLoadedKm: haulCycle.distanceLoadedKm,
      distanceUnloadedKm: haulCycle.distanceUnloadedKm,
      speedLoaded: haulCycle.speedLoaded,
      speedUnloaded: haulCycle.speedUnloaded,
      loadingTime: haulCycle.loadingTime,
      unloadingTime: haulCycle.unloadingTime,
      payloadTonnes,
      availabilityPercent,
      efficiencyPercent,
      utilizationPercent,
      cycleTimeSeconds: results.cycleTimeSeconds,
      tonnesPerHour: results.tonnesPerHour,
      tonnesPerTruckYear: results.tonnesPerTruckYear,
      effectiveFactor: results.effectiveFactor,
      yearlyFleet: results.yearlyFleet,
      scenarioName: scenarioName.trim() || undefined,
      notes: pdfNotes.trim() || undefined,
      generatedDate: new Date().toISOString(),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fleet-sizing-report.pdf";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3]">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header with Mode Toggle */}
        <div className="mb-8 flex items-center justify-between border-b border-[#30363d] pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#e6edf3]">
              Fleet Sizing Calculator
            </h1>
            <p className="mt-1 text-sm text-[#8b949e]">
              Configure haul parameters and production targets
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[#8b949e]">Mode:</span>
            <div className="flex gap-1 rounded-md bg-[#161b22] border border-[#30363d] p-1">
              <button
                onClick={() => setMode("dynamic")}
                className={[
                  "rounded-md px-5 py-1.5 text-sm font-semibold transition-all",
                  mode === "dynamic"
                    ? "bg-brand-500 text-white"
                    : "text-[#8b949e] hover:text-[#e6edf3]",
                ].join(" ")}
              >
                Live
              </button>
              <button
                onClick={() => setMode("static")}
                className={[
                  "rounded-md px-5 py-1.5 text-sm font-semibold transition-all",
                  mode === "static"
                    ? "bg-brand-500 text-white"
                    : "text-[#8b949e] hover:text-[#e6edf3]",
                ].join(" ")}
              >
                Manual
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Left Column: Inputs - spans 2 columns on XL */}
          <div className="space-y-6 xl:col-span-2">
            {/* Production Targets */}
            <Card>
              <div className="border-b border-[#30363d] px-6 py-4">
                <h2 className="text-2xl font-bold text-[#e6edf3]">
                  Production Targets
                </h2>
                <p className="mt-1 text-sm text-[#8b949e]">
                  Annual production by year (Million tonnes)
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {productionPlan.map((plan, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div
                        className="w-20 text-sm font-bold text-[#c9d1d9]"
                        aria-label={`plan-year-${index}`}
                        data-year={plan.year}
                      >
                        {plan.year}
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                            Production
                          </span>
                          <span className="text-lg font-bold text-[#58a6ff]">
                            {(plan.tonnesPerYear / 1_000_000).toFixed(1)} Mt
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          step="0.1"
                          value={plan.tonnesPerYear / 1_000_000}
                          onChange={(e) =>
                            updateProductionYearMt(index, Number(e.target.value))
                          }
                          aria-label={`plan-tonnes-${index}`}
                          className="slider w-full"
                        />
                      </div>
                      {productionPlan.length > 1 && (
                        <button
                          onClick={() => removeProductionYear(index)}
                          className="rounded-md px-3 py-2 text-sm font-semibold text-[#8b949e] hover:bg-red-950/30 hover:text-red-400"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={addProductionYear}
                  className="mt-6 border border-[#30363d] bg-[#1c2333] text-[#58a6ff] hover:bg-[#243040]"
                >
                  Add Year
                </Button>
              </div>
            </Card>

            {/* Haul Cycle Parameters */}
            <Card>
              <div className="border-b border-[#30363d] px-6 py-4">
                <h2 className="text-2xl font-bold text-[#e6edf3]">
                  Haul Cycle Parameters
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Distance Loaded */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Distance Loaded
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {haulCycle.distanceLoadedKm.toFixed(2)} km
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.05"
                      value={haulCycle.distanceLoadedKm}
                      onChange={(e) =>
                        setHaulCycle({
                          ...haulCycle,
                          distanceLoadedKm: Number(e.target.value),
                        })
                      }
                      aria-label="distanceLoaded"
                      className="slider w-full"
                    />
                  </div>

                  {/* Distance Unloaded */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Distance Unloaded
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {haulCycle.distanceUnloadedKm.toFixed(2)} km
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.05"
                      value={haulCycle.distanceUnloadedKm}
                      onChange={(e) =>
                        setHaulCycle({
                          ...haulCycle,
                          distanceUnloadedKm: Number(e.target.value),
                        })
                      }
                      aria-label="distanceUnloaded"
                      className="slider w-full"
                    />
                  </div>

                  {/* Speed Loaded */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Speed Loaded
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {haulCycle.speedLoaded} km/h
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      step="1"
                      value={haulCycle.speedLoaded}
                      onChange={(e) =>
                        setHaulCycle({
                          ...haulCycle,
                          speedLoaded: Number(e.target.value),
                        })
                      }
                      aria-label="speedLoaded"
                      className="slider w-full"
                    />
                  </div>

                  {/* Speed Unloaded */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Speed Unloaded
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {haulCycle.speedUnloaded} km/h
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      step="1"
                      value={haulCycle.speedUnloaded}
                      onChange={(e) =>
                        setHaulCycle({
                          ...haulCycle,
                          speedUnloaded: Number(e.target.value),
                        })
                      }
                      aria-label="speedUnloaded"
                      className="slider w-full"
                    />
                  </div>

                  {/* Loading Time */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Loading Time
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {haulCycle.loadingTime} sec
                      </span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="300"
                      step="10"
                      value={haulCycle.loadingTime}
                      onChange={(e) =>
                        setHaulCycle({
                          ...haulCycle,
                          loadingTime: Number(e.target.value),
                        })
                      }
                      data-testid="input-loadingTime"
                      aria-label="loadingTime"
                      className="slider w-full"
                    />
                  </div>

                  {/* Unloading Time */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Unloading Time
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {haulCycle.unloadingTime} sec
                      </span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="300"
                      step="10"
                      value={haulCycle.unloadingTime}
                      onChange={(e) =>
                        setHaulCycle({
                          ...haulCycle,
                          unloadingTime: Number(e.target.value),
                        })
                      }
                      data-testid="input-unloadingTime"
                      aria-label="unloadingTime"
                      className="slider w-full"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Truck & Operational Factors */}
            <Card>
              <div className="border-b border-[#30363d] px-6 py-4">
                <h2 className="text-2xl font-bold text-[#e6edf3]">
                  Truck Capacity & Operational Factors
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Payload */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Payload Capacity
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {payloadTonnes} tonnes
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="5"
                      value={payloadTonnes}
                      onChange={(e) => setPayloadTonnes(Number(e.target.value))}
                      aria-label="payloadTonnes"
                      className="slider w-full"
                    />
                  </div>

                  {/* Availability */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Availability
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {availabilityPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={availabilityPercent}
                      onChange={(e) =>
                        setAvailabilityPercent(Number(e.target.value))
                      }
                      aria-label="availabilityPercent"
                      className="slider w-full"
                    />
                  </div>

                  {/* Efficiency */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Efficiency
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {efficiencyPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={efficiencyPercent}
                      onChange={(e) =>
                        setEfficiencyPercent(Number(e.target.value))
                      }
                      aria-label="efficiencyPercent"
                      className="slider w-full"
                    />
                  </div>

                  {/* Utilization */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Utilization
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {utilizationPercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={utilizationPercent}
                      onChange={(e) =>
                        setUtilizationPercent(Number(e.target.value))
                      }
                      aria-label="utilizationPercent"
                      className="slider w-full"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Cost Model */}
            <Card>
              <div className="border-b border-[#30363d] px-6 py-4">
                <h2 className="text-2xl font-bold text-[#e6edf3]">
                  Cost Model
                </h2>
                <p className="mt-1 text-sm text-[#8b949e]">
                  CAPEX & OPEX parameters
                </p>
              </div>
              <div className="p-6">
                {/* FMS Toggle */}
                <div className="mb-6 flex items-center justify-between rounded-md border border-[#30363d] bg-[#0d1117] p-4">
                  <div>
                    <div className="text-sm font-semibold text-[#e6edf3]">
                      Fleet Management System (FMS)
                    </div>
                    <div className="mt-0.5 text-xs text-[#8b949e]">
                      One-time deployment + annual license
                    </div>
                  </div>
                  <div
                    onClick={() =>
                      setCostModel((prev) => ({
                        ...prev,
                        includeFMS: !prev.includeFMS,
                      }))
                    }
                    className={[
                      "relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer transition-colors duration-200",
                      costModel.includeFMS ? "bg-brand-500" : "bg-[#30363d]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200",
                        costModel.includeFMS ? "translate-x-6" : "translate-x-1",
                      ].join(" ")}
                    />
                  </div>
                </div>

                {/* Main cost sliders */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Truck Price */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Truck Price
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {(costModel.truckPriceEUR / 1000).toFixed(0)}k EUR
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50000"
                      max="1500000"
                      step="25000"
                      value={costModel.truckPriceEUR}
                      onChange={(e) =>
                        setCostModel((prev) => ({
                          ...prev,
                          truckPriceEUR: Number(e.target.value),
                        }))
                      }
                      className="slider w-full"
                    />
                  </div>

                  {/* Truck License */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        License / Truck / Year
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {(costModel.truckLicenseEURPerYear / 1000).toFixed(0)}k EUR
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5000"
                      max="200000"
                      step="5000"
                      value={costModel.truckLicenseEURPerYear}
                      onChange={(e) =>
                        setCostModel((prev) => ({
                          ...prev,
                          truckLicenseEURPerYear: Number(e.target.value),
                        }))
                      }
                      className="slider w-full"
                    />
                  </div>

                  {/* Service Cost */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Service Cost
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {costModel.serviceSEKPerKm.toFixed(1)} SEK/km
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.5"
                      value={costModel.serviceSEKPerKm}
                      onChange={(e) =>
                        setCostModel((prev) => ({
                          ...prev,
                          serviceSEKPerKm: Number(e.target.value),
                        }))
                      }
                      className="slider w-full"
                    />
                  </div>

                  {/* Fuel Cost */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Fuel Cost
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {costModel.fuelSEKPerKm.toFixed(1)} SEK/km
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="0.5"
                      value={costModel.fuelSEKPerKm}
                      onChange={(e) =>
                        setCostModel((prev) => ({
                          ...prev,
                          fuelSEKPerKm: Number(e.target.value),
                        }))
                      }
                      className="slider w-full"
                    />
                  </div>

                  {/* Deployment One-Time */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        Deployment (one-time)
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {(costModel.deploymentOneTimeEUR / 1000).toFixed(0)}k EUR
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1000000"
                      step="25000"
                      value={costModel.deploymentOneTimeEUR}
                      onChange={(e) =>
                        setCostModel((prev) => ({
                          ...prev,
                          deploymentOneTimeEUR: Number(e.target.value),
                        }))
                      }
                      className="slider w-full"
                    />
                  </div>

                  {/* FX Rate */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                        FX Rate
                      </span>
                      <span className="text-lg font-bold text-[#e6edf3]">
                        {costModel.fxSEKPerEUR.toFixed(1)} SEK/EUR
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="20"
                      step="0.1"
                      value={costModel.fxSEKPerEUR}
                      onChange={(e) =>
                        setCostModel((prev) => ({
                          ...prev,
                          fxSEKPerEUR: Number(e.target.value),
                        }))
                      }
                      className="slider w-full"
                    />
                  </div>
                </div>

                {/* FMS conditional inputs */}
                {costModel.includeFMS && (
                  <div className="mt-6 rounded-md border border-[#30363d] bg-[#0d1117] p-4">
                    <div className="mb-4 text-xs font-bold uppercase tracking-wider text-[#58a6ff]">
                      FMS Details
                    </div>
                    <div className="grid gap-6 md:grid-cols-3">
                      {/* FMS Annual License */}
                      <div>
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                            Annual License
                          </span>
                          <span className="text-lg font-bold text-[#e6edf3]">
                            {(costModel.fmsAnnualLicenseEUR / 1000).toFixed(0)}k EUR
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10000"
                          max="500000"
                          step="10000"
                          value={costModel.fmsAnnualLicenseEUR}
                          onChange={(e) =>
                            setCostModel((prev) => ({
                              ...prev,
                              fmsAnnualLicenseEUR: Number(e.target.value),
                            }))
                          }
                          className="slider w-full"
                        />
                      </div>

                      {/* FMS Deployment One-Time */}
                      <div>
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                            Deploy (one-time)
                          </span>
                          <span className="text-lg font-bold text-[#e6edf3]">
                            {(costModel.fmsDeploymentOneTimeEUR / 1000).toFixed(0)}k EUR
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1000000"
                          step="25000"
                          value={costModel.fmsDeploymentOneTimeEUR}
                          onChange={(e) =>
                            setCostModel((prev) => ({
                              ...prev,
                              fmsDeploymentOneTimeEUR: Number(e.target.value),
                            }))
                          }
                          className="slider w-full"
                        />
                      </div>

                      {/* FMS HW One-Time */}
                      <div>
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                            HW (one-time)
                          </span>
                          <span className="text-lg font-bold text-[#e6edf3]">
                            {(costModel.fmsHwOneTimeEUR / 1000).toFixed(0)}k EUR
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="500000"
                          step="25000"
                          value={costModel.fmsHwOneTimeEUR}
                          onChange={(e) =>
                            setCostModel((prev) => ({
                              ...prev,
                              fmsHwOneTimeEUR: Number(e.target.value),
                            }))
                          }
                          className="slider w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Calculate Button - Only in Static Mode */}
            {mode === "static" && (
              <Button
                data-testid="calculate-button"
                aria-label="calculate-button"
                onClick={onCalculate}
                className="w-full py-4 text-xl font-bold"
              >
                {pendingCalculation ? "Calculate Fleet Requirements" : "Recalculate"}
              </Button>
            )}

            {/* Error Display */}
            {error && (
              <div className="rounded-md border border-red-900/50 bg-red-950/30 p-4">
                <ErrorText>
                  <span data-testid="calc-error">{error}</span>
                </ErrorText>
              </div>
            )}
          </div>

          {/* Right Column: Results & Scenarios */}
          <div className="space-y-6">
            {/* Fleet Requirements Table */}
            <Card>
              <div className="border-b border-[#30363d] px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-[#e6edf3]">
                  Fleet Requirements
                </h2>
                <Button
                  aria-label="export-pdf"
                  data-testid="export-pdf-button"
                  onClick={onExportPdf}
                  disabled={!results}
                  className="border border-[#30363d] bg-[#1c2333] text-[#58a6ff] hover:bg-[#243040] px-4 py-2 text-sm"
                >
                  Export PDF
                </Button>
              </div>
              <div className="p-6">
                {!results && (
                  <div className="py-12 text-center">
                    <p className="text-[#8b949e]">
                      {mode === "dynamic"
                        ? "Adjust inputs to see results"
                        : "Click Calculate to see results"}
                    </p>
                  </div>
                )}

                {results && (
                  <div
                    className={[
                      "space-y-6 transition-opacity duration-300",
                      mode === "static" && pendingCalculation
                        ? "opacity-50"
                        : "opacity-100",
                    ].join(" ")}
                  >
                    {/* Main Results Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#30363d]">
                            <th className="pb-3 pr-3 text-left text-xs font-bold uppercase tracking-wider text-[#8b949e]">
                              Year
                            </th>
                            <th className="pb-3 px-3 text-right text-xs font-bold uppercase tracking-wider text-[#8b949e]">
                              Production
                            </th>
                            <th className="pb-3 pl-3 text-right text-xs font-bold uppercase tracking-wider text-[#58a6ff]">
                              Trucks
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.yearlyFleet.map((year) => (
                            <tr
                              key={year.year}
                              className="group border-b border-[#30363d] transition-colors hover:bg-[#1c2333]"
                            >
                              <td className="py-4 pr-3 text-lg font-bold text-[#e6edf3]">
                                {year.year}
                              </td>
                              <td className="py-4 px-3 text-right">
                                <div className="text-base font-semibold text-[#c9d1d9]">
                                  {(year.tonnesPerYear / 1_000_000).toFixed(1)}
                                </div>
                                <div className="text-xs text-[#484f58]">Mt/year</div>
                              </td>
                              <td
                                className="py-4 pl-3 text-right"
                                data-testid={`trucks-required-${year.year}`}
                              >
                                <div className="inline-flex flex-col items-end rounded-md bg-[#1c2333] px-4 py-2">
                                  <span className="text-3xl font-black text-[#58a6ff]">
                                    {year.trucksRequired}
                                  </span>
                                  <span className="text-xs font-semibold text-[#484f58]">
                                    trucks
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Supporting Metrics */}
                    <div className="grid grid-cols-2 gap-4 rounded-md border border-[#30363d] bg-[#0d1117] p-4">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">
                          Cycle Time
                        </div>
                        <div
                          className="mt-1 text-xl font-bold text-[#e6edf3]"
                          data-testid="cycle-time-seconds"
                        >
                          {results.cycleTimeSeconds.toFixed(0)}s
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">
                          Tonnes/Hour
                        </div>
                        <div
                          className="mt-1 text-xl font-bold text-[#e6edf3]"
                          data-testid="tonnes-per-hour"
                        >
                          {results.tonnesPerHour.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">
                          Annual Cap/Truck
                        </div>
                        <div
                          className="mt-1 text-xl font-bold text-[#e6edf3]"
                          data-testid="tonnes-per-truck-year"
                        >
                          {(results.tonnesPerTruckYear / 1000).toFixed(0)}k t
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">
                          Effective Factor
                        </div>
                        <div
                          className="mt-1 text-xl font-bold text-[#e6edf3]"
                          data-testid="effective-factor-percent"
                        >
                          {Math.round(results.effectiveFactor * 100)}%
                        </div>
                      </div>
                    </div>

                    {/* PDF Export Notes */}
                    <div>
                      <Label>Export Notes (optional)</Label>
                      <textarea
                        aria-label="pdf-notes"
                        data-testid="pdf-notes-input"
                        value={pdfNotes}
                        onChange={(e) => setPdfNotes(e.target.value)}
                        placeholder="Add assumptions, disclaimers, or internal notes..."
                        rows={3}
                        className="mt-1 w-full rounded-md border border-[#30363d] bg-[#0d1117] px-4 py-2.5 text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-brand-500 transition-all duration-150 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Scenario Management */}
            <Card>
              <div className="border-b border-[#30363d] px-6 py-4">
                <h2 className="text-xl font-bold text-[#e6edf3]">Scenarios</h2>
              </div>
              <div className="p-6">
                {/* Save Scenario */}
                <div className="mb-4 space-y-3">
                  <Label>Scenario Name</Label>
                  <Input
                    aria-label="scenario-name"
                    type="text"
                    placeholder="e.g., Base Case"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                  />
                  <Button
                    aria-label="save-scenario"
                    onClick={onSaveScenario}
                    className="w-full border border-[#30363d] bg-[#1c2333] text-[#58a6ff] hover:bg-[#243040]"
                    disabled={!results || !scenarioName.trim()}
                  >
                    Save Current Scenario
                  </Button>
                </div>

                {/* Scenario List */}
                {scenarios.length === 0 && (
                  <p className="text-sm text-[#8b949e]">No saved scenarios yet.</p>
                )}

                {scenarios.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-[#c9d1d9]">
                      Saved Scenarios
                    </div>
                    <div className="max-h-80 space-y-2 overflow-y-auto">
                      {scenarios.map((scenario) => (
                        <div
                          key={scenario.id}
                          className="flex items-start gap-3 rounded-md border border-[#30363d] bg-[#0d1117] p-3"
                        >
                          <div className="flex-1">
                            <div className="font-bold text-[#e6edf3]">
                              {scenario.name}
                            </div>
                            <div className="mt-1 text-xs text-[#8b949e]">
                              {new Date(scenario.createdAt).toLocaleDateString()}{" "}
                              • {scenario.productionPlan?.length || 0} years
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              aria-label={`load-scenario-${scenario.id}`}
                              onClick={() => onLoadScenario(scenario)}
                              className="rounded-md bg-[#1c2333] border border-[#30363d] px-3 py-1.5 text-sm font-bold text-[#58a6ff] hover:bg-[#243040]"
                            >
                              Load
                            </button>
                            <button
                              aria-label={`delete-scenario-${scenario.id}`}
                              onClick={() => onDeleteScenario(scenario.id)}
                              className="rounded-md px-2 py-1.5 text-sm font-semibold text-[#8b949e] hover:bg-red-950/30 hover:text-red-400"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Cost Breakdown – full width below main grid */}
        {costBreakdown && (
          <Card>
            <div className="border-b border-[#30363d] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#e6edf3]">
                  Cost Breakdown
                </h2>
                <p className="mt-1 text-sm text-[#8b949e]">
                  CAPEX &amp; OPEX per year
                </p>
              </div>
              {/* Currency Toggle */}
              <div className="flex gap-1 rounded-md bg-[#161b22] border border-[#30363d] p-1">
                <button
                  onClick={() => setReportingCurrency("EUR")}
                  className={[
                    "rounded-md px-4 py-1.5 text-sm font-semibold transition-all",
                    reportingCurrency === "EUR"
                      ? "bg-brand-500 text-white"
                      : "text-[#8b949e] hover:text-[#e6edf3]",
                  ].join(" ")}
                >
                  EUR
                </button>
                <button
                  onClick={() => setReportingCurrency("SEK")}
                  className={[
                    "rounded-md px-4 py-1.5 text-sm font-semibold transition-all",
                    reportingCurrency === "SEK"
                      ? "bg-brand-500 text-white"
                      : "text-[#8b949e] hover:text-[#e6edf3]",
                  ].join(" ")}
                >
                  SEK
                </button>
              </div>
            </div>
            <div className="overflow-x-auto p-6">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#30363d]">
                    <th className="pb-3 pr-3 text-left text-xs font-bold uppercase tracking-wider text-[#8b949e]">
                      Year
                    </th>
                    <th className="pb-3 px-3 text-right text-xs font-bold uppercase tracking-wider text-[#8b949e]">
                      Fleet
                    </th>
                    <th className="pb-3 px-3 text-right text-xs font-bold uppercase tracking-wider text-[#8b949e]">
                      km/yr
                    </th>
                    <th className="pb-3 px-3 text-right text-xs font-bold uppercase tracking-wider text-[#58a6ff]">
                      CAPEX Trucks{" "}
                      <span className="text-[#484f58]">(EUR)</span>
                    </th>
                    <th className="pb-3 px-3 text-right text-xs font-bold uppercase tracking-wider text-[#58a6ff]">
                      CAPEX One-time{" "}
                      <span className="text-[#484f58]">(EUR)</span>
                    </th>
                    <th className="pb-3 px-3 text-right text-xs font-bold uppercase tracking-wider text-[#8b949e]">
                      OPEX License{" "}
                      <span className="text-[#484f58]">(EUR)</span>
                    </th>
                    <th className="pb-3 px-3 text-right text-xs font-bold uppercase tracking-wider text-[#8b949e]">
                      OPEX Variable{" "}
                      <span className="text-[#484f58]">(SEK)</span>
                    </th>
                    <th className="pb-3 pl-3 text-right text-xs font-bold uppercase tracking-wider text-[#e6edf3]">
                      Total{" "}
                      <span className="text-[#58a6ff]">
                        ({reportingCurrency})
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {costBreakdown.rows.map((row) => (
                    <tr
                      key={row.year}
                      className="border-b border-[#30363d] transition-colors hover:bg-[#1c2333]"
                    >
                      <td className="py-3 pr-3 text-sm font-bold text-[#e6edf3]">
                        {row.year}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-[#c9d1d9]">
                        {row.fleetSize}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-[#c9d1d9]">
                        {fmt(row.kmPerYear)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm font-semibold text-[#58a6ff]">
                        {fmt(row.capexTrucks)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm font-semibold text-[#58a6ff]">
                        {fmt(row.capexDeployment + row.capexFms)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-[#c9d1d9]">
                        {fmt(row.opexTotalEUR)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-[#c9d1d9]">
                        {fmt(row.opexTotalSEK)}
                      </td>
                      <td className="py-3 pl-3 text-right text-sm font-bold text-[#e6edf3]">
                        {fmt(
                          reportingCurrency === "EUR"
                            ? row.totalCostEUR
                            : row.totalCostSEK,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#30363d] bg-[#1c2333]">
                    <td
                      className="py-3 pr-3 text-sm font-bold text-[#e6edf3]"
                      colSpan={3}
                    >
                      Period Total
                    </td>
                    <td className="py-3 px-3 text-right text-sm font-bold text-[#58a6ff]">
                      {fmt(costBreakdown.periodTotals.capexTrucksEUR)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm font-bold text-[#58a6ff]">
                      {fmt(costBreakdown.periodTotals.capexOneTimeEUR)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm font-bold text-[#c9d1d9]">
                      {fmt(costBreakdown.periodTotals.opexTotalEUR)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm font-bold text-[#c9d1d9]">
                      {fmt(costBreakdown.periodTotals.opexTotalSEK)}
                    </td>
                    <td className="py-3 pl-3 text-right text-sm font-bold text-[#e6edf3]">
                      {fmt(
                        reportingCurrency === "EUR"
                          ? costBreakdown.periodTotals.totalCostEUR
                          : costBreakdown.periodTotals.totalCostSEK,
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
