"use client";

import React, { useState, useEffect } from "react";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Header with Mode Toggle */}
        <div className="mb-8 flex items-center justify-between border-b-2 border-brand-500/20 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-brand-500 shadow-[0_0_20px_rgba(47,107,255,0.5)]" />
              <h1 className="text-4xl font-bold tracking-tight text-slate-50">
                Fleet Sizing Calculator
              </h1>
            </div>
            <p className="mt-2 text-lg text-slate-400">
              Configure haul parameters and production targets
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-400">Mode:</span>
            <div className="flex gap-2 rounded-xl bg-slate-800/80 p-1.5">
              <button
                onClick={() => setMode("dynamic")}
                className={[
                  "rounded-lg px-6 py-2.5 text-sm font-bold transition-all",
                  mode === "dynamic"
                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                    : "text-slate-400 hover:text-slate-300",
                ].join(" ")}
              >
                Live
              </button>
              <button
                onClick={() => setMode("static")}
                className={[
                  "rounded-lg px-6 py-2.5 text-sm font-bold transition-all",
                  mode === "static"
                    ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30"
                    : "text-slate-400 hover:text-slate-300",
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
              <div className="border-b-2 border-white/20 bg-gradient-to-r from-slate-800 to-slate-800/90 px-6 py-4">
                <h2 className="text-2xl font-bold text-slate-50">
                  Production Targets
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Annual production by year (Million tonnes)
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {productionPlan.map((plan, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div
                        className="w-20 text-sm font-bold text-slate-300"
                        aria-label={`plan-year-${index}`}
                        data-year={plan.year}
                      >
                        {plan.year}
                      </div>
                      <div className="flex-1">
                        <div className="mb-2 flex items-baseline justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Production
                          </span>
                          <span className="text-lg font-bold text-brand-400">
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
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-400 hover:bg-red-950/50 hover:text-red-400"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={addProductionYear}
                  className="mt-6 border-2 border-brand-500/40 bg-brand-500/20 text-brand-300 shadow-brand-500/10 hover:bg-brand-500/30"
                >
                  Add Year
                </Button>
              </div>
            </Card>

            {/* Haul Cycle Parameters */}
            <Card>
              <div className="border-b-2 border-white/20 bg-gradient-to-r from-slate-800 to-slate-800/90 px-6 py-4">
                <h2 className="text-2xl font-bold text-slate-50">
                  Haul Cycle Parameters
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Distance Loaded */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Distance Loaded
                      </span>
                      <span className="text-lg font-bold text-slate-200">
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
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Distance Unloaded
                      </span>
                      <span className="text-lg font-bold text-slate-200">
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
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Speed Loaded
                      </span>
                      <span className="text-lg font-bold text-slate-200">
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
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Speed Unloaded
                      </span>
                      <span className="text-lg font-bold text-slate-200">
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
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Loading Time
                      </span>
                      <span className="text-lg font-bold text-slate-200">
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
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Unloading Time
                      </span>
                      <span className="text-lg font-bold text-slate-200">
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
              <div className="border-b-2 border-white/20 bg-gradient-to-r from-slate-800 to-slate-800/90 px-6 py-4">
                <h2 className="text-2xl font-bold text-slate-50">
                  Truck Capacity & Operational Factors
                </h2>
              </div>
              <div className="p-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Payload */}
                  <div>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Payload Capacity
                      </span>
                      <span className="text-lg font-bold text-slate-200">
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
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Availability
                      </span>
                      <span className="text-lg font-bold text-slate-200">
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
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Efficiency
                      </span>
                      <span className="text-lg font-bold text-slate-200">
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
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Utilization
                      </span>
                      <span className="text-lg font-bold text-slate-200">
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
              <div className="rounded-xl border-2 border-red-500/50 bg-red-950/50 p-4 shadow-lg">
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
              <div className="border-b-2 border-white/20 bg-gradient-to-r from-slate-800 to-slate-800/90 px-6 py-4">
                <h2 className="text-2xl font-bold text-slate-50">
                  Fleet Requirements
                </h2>
              </div>
              <div className="p-6">
                {!results && (
                  <div className="py-12 text-center">
                    <p className="text-slate-400">
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
                          <tr className="border-b-2 border-brand-500/30">
                            <th className="pb-3 pr-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">
                              Year
                            </th>
                            <th className="pb-3 px-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">
                              Production
                            </th>
                            <th className="pb-3 pl-3 text-right text-xs font-bold uppercase tracking-wider text-brand-400">
                              Trucks
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.yearlyFleet.map((year) => (
                            <tr
                              key={year.year}
                              className="group border-b border-white/10 transition-colors hover:bg-white/5"
                            >
                              <td className="py-4 pr-3 text-lg font-bold text-slate-200">
                                {year.year}
                              </td>
                              <td className="py-4 px-3 text-right">
                                <div className="text-base font-semibold text-slate-300">
                                  {(year.tonnesPerYear / 1_000_000).toFixed(1)}
                                </div>
                                <div className="text-xs text-slate-500">Mt/year</div>
                              </td>
                              <td
                                className="py-4 pl-3 text-right"
                                data-testid={`trucks-required-${year.year}`}
                              >
                                <div className="inline-flex flex-col items-end rounded-lg bg-gradient-to-br from-brand-500/20 to-brand-600/20 px-4 py-2 shadow-lg shadow-brand-500/10 transition-all group-hover:shadow-brand-500/20">
                                  <span className="text-3xl font-black text-brand-300">
                                    {year.trucksRequired}
                                  </span>
                                  <span className="text-xs font-semibold text-brand-400/70">
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
                    <div className="grid grid-cols-2 gap-4 rounded-lg border-2 border-white/10 bg-slate-900/50 p-4">
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Cycle Time
                        </div>
                        <div
                          className="mt-1 text-xl font-bold text-slate-200"
                          data-testid="cycle-time-seconds"
                        >
                          {results.cycleTimeSeconds.toFixed(0)}s
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Tonnes/Hour
                        </div>
                        <div
                          className="mt-1 text-xl font-bold text-slate-200"
                          data-testid="tonnes-per-hour"
                        >
                          {results.tonnesPerHour.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Annual Cap/Truck
                        </div>
                        <div
                          className="mt-1 text-xl font-bold text-slate-200"
                          data-testid="tonnes-per-truck-year"
                        >
                          {(results.tonnesPerTruckYear / 1000).toFixed(0)}k t
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Effective Factor
                        </div>
                        <div
                          className="mt-1 text-xl font-bold text-slate-200"
                          data-testid="effective-factor-percent"
                        >
                          {Math.round(results.effectiveFactor * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Scenario Management */}
            <Card>
              <div className="border-b-2 border-white/20 bg-gradient-to-r from-slate-800 to-slate-800/90 px-6 py-4">
                <h2 className="text-xl font-bold text-slate-50">Scenarios</h2>
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
                    className="w-full border-2 border-brand-500/40 bg-brand-500/20 text-brand-300 shadow-brand-500/10 hover:bg-brand-500/30"
                    disabled={!results || !scenarioName.trim()}
                  >
                    Save Current Scenario
                  </Button>
                </div>

                {/* Scenario List */}
                {scenarios.length === 0 && (
                  <p className="text-sm text-slate-400">No saved scenarios yet.</p>
                )}

                {scenarios.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-bold text-slate-300">
                      Saved Scenarios
                    </div>
                    <div className="max-h-80 space-y-2 overflow-y-auto">
                      {scenarios.map((scenario) => (
                        <div
                          key={scenario.id}
                          className="flex items-start gap-3 rounded-lg border-2 border-white/20 bg-slate-900/70 p-3 shadow-lg"
                        >
                          <div className="flex-1">
                            <div className="font-bold text-slate-200">
                              {scenario.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-400">
                              {new Date(scenario.createdAt).toLocaleDateString()}{" "}
                              • {scenario.productionPlan?.length || 0} years
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              aria-label={`load-scenario-${scenario.id}`}
                              onClick={() => onLoadScenario(scenario)}
                              className="rounded-lg bg-brand-500/30 px-3 py-1.5 text-sm font-bold text-brand-300 shadow-lg hover:bg-brand-500/40"
                            >
                              Load
                            </button>
                            <button
                              aria-label={`delete-scenario-${scenario.id}`}
                              onClick={() => onDeleteScenario(scenario.id)}
                              className="rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-400 hover:bg-red-950/50 hover:text-red-400"
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
      </div>
    </div>
  );
}
