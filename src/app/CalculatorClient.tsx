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
} from "@/lib/scenarioRepository";

interface HaulCycleInputs {
  distanceLoaded: number;
  distanceUnloaded: number;
  speedLoaded: number;
  speedUnloaded: number;
  loadingTime: number;
  unloadingTime: number;
}

interface TruckInputs {
  payloadTonnes: number;
}

interface OperationalFactors {
  availability: number; // stored as 0..1
  efficiency: number; // stored as 0..1
  utilization: number; // stored as 0..1
}

interface MinePlan {
  totalMineTonnesPerYear: number;
}

interface CalculationResults {
  cycleTimeSeconds: number;
  cycleTimeMinutes: number;
  cyclesPerHour: number;
  tonnesPerHour: number;
  tonnesPerTruckYear: number;
  effectiveFactor: number;
  rawTrucks: number;
  trucksRequired: number;
}

export default function CalculatorClient() {
  // Input states
  const [haulCycle, setHaulCycle] = useState<HaulCycleInputs>({
    distanceLoaded: 1450,
    distanceUnloaded: 1450,
    speedLoaded: 25,
    speedUnloaded: 30,
    loadingTime: 120,
    unloadingTime: 90,
  });

  const [truck, setTruck] = useState<TruckInputs>({
    payloadTonnes: 150,
  });

  const [operational, setOperational] = useState<OperationalFactors>({
    availability: 0.90,
    efficiency: 0.60,
    utilization: 0.90,
  });

  const [minePlan, setMinePlan] = useState<MinePlan>({
    totalMineTonnesPerYear: 5_000_000,
  });

  // Results and error state
  const [results, setResults] = useState<CalculationResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scenario management
  const [scenarios, setScenarios] = useState<CalculatorScenario[]>([]);
  const [scenarioName, setScenarioName] = useState("");

  // Load scenarios on mount
  useEffect(() => {
    setScenarios(scenarioRepository.getAll());
  }, []);

  // Calculate button handler
  function onCalculate() {
    setError(null);
    try {
      // Step 1: Calculate haul cycle time
      const cycleTimeResult = calculateHaulCycleTime({
        distanceLoaded: Math.round(haulCycle.distanceLoaded),
        distanceUnloaded: Math.round(haulCycle.distanceUnloaded),
        speedLoaded: haulCycle.speedLoaded,
        speedUnloaded: haulCycle.speedUnloaded,
        loadingTime: haulCycle.loadingTime,
        unloadingTime: haulCycle.unloadingTime,
      });

      // Step 2: Calculate productivity
      const productivityResult = calculateHaulProductivity({
        cycleTimeSeconds: cycleTimeResult.cycleTimeSeconds,
        payloadTonnes: truck.payloadTonnes,
        availability: operational.availability,
        efficiency: operational.efficiency,
        utilization: operational.utilization,
      });

      // Step 3: Calculate fleet size
      const fleetResult = calculateFleetSize({
        totalMineTonnesPerYear: minePlan.totalMineTonnesPerYear,
        tonnesPerTruckYear: productivityResult.tonnesPerTruckYear,
      });

      setResults({
        cycleTimeSeconds: cycleTimeResult.cycleTimeSeconds,
        cycleTimeMinutes: cycleTimeResult.cycleTimeSeconds / 60,
        cyclesPerHour: productivityResult.theoreticalCyclesPerHour,
        tonnesPerHour: productivityResult.tonnesPerHour,
        tonnesPerTruckYear: productivityResult.tonnesPerTruckYear,
        effectiveFactor: productivityResult.effectiveFactor,
        rawTrucks: fleetResult.rawTrucks,
        trucksRequired: fleetResult.trucksRequired,
      });
    } catch (e: unknown) {
      setResults(null);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Invalid input values. Please check your entries.");
      }
    }
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
        ...haulCycle,
        ...truck,
        ...operational,
        ...minePlan,
        ...results,
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
      distanceLoaded: scenario.distanceLoaded,
      distanceUnloaded: scenario.distanceUnloaded,
      speedLoaded: scenario.speedLoaded,
      speedUnloaded: scenario.speedUnloaded,
      loadingTime: scenario.loadingTime,
      unloadingTime: scenario.unloadingTime,
    });

    setTruck({
      payloadTonnes: scenario.payloadTonnes,
    });

    setOperational({
      availability: scenario.availability,
      efficiency: scenario.efficiency,
      utilization: scenario.utilization,
    });

    setMinePlan({
      totalMineTonnesPerYear: scenario.totalMineTonnesPerYear,
    });

    setResults({
      cycleTimeSeconds: scenario.cycleTimeSeconds,
      cycleTimeMinutes: scenario.cycleTimeSeconds / 60,
      cyclesPerHour: 3600 / scenario.cycleTimeSeconds,
      tonnesPerHour: scenario.tonnesPerHour,
      tonnesPerTruckYear: scenario.tonnesPerTruckYear,
      effectiveFactor: scenario.effectiveFactor,
      rawTrucks: scenario.rawTrucks,
      trucksRequired: scenario.trucksRequired,
    });

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

  // Helper to convert 0..1 to percentage for display
  const toPercent = (value: number) => Math.round(value * 100);
  const fromPercent = (value: number) => value / 100;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-brand-500 shadow-[0_0_0_8px_rgba(47,107,255,0.15)]" />
            <h1 className="text-3xl font-bold text-slate-100">
              Mining Fleet Calculator
            </h1>
          </div>
          <p className="mt-2 text-slate-400">
            Calculate haul cycle productivity and determine required truck fleet size
          </p>
        </div>

        {/* Main Layout: Two columns on desktop */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {/* Left Column: Inputs */}
          <div className="space-y-6 xl:col-span-2">
            {/* Haul Cycle Parameters */}
            <Card>
              <div className="p-6">
                <h2 className="mb-1 text-xl font-semibold text-slate-100">
                  Haul Cycle Parameters
                </h2>
                <p className="mb-4 text-sm text-slate-400">
                  Define the haul route and operational timings
                </p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Distance Loaded (m)</Label>
                    <Input
                      aria-label="distanceLoaded"
                      type="number"
                      min="0"
                      step="1"
                      value={haulCycle.distanceLoaded}
                      onChange={(e) =>
                        setHaulCycle({
                          ...haulCycle,
                          distanceLoaded: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Distance Unloaded (m)</Label>
                    <Input
                      aria-label="distanceUnloaded"
                      type="number"
                      min="0"
                      step="1"
                      value={haulCycle.distanceUnloaded}
                      onChange={(e) =>
                        setHaulCycle({
                          ...haulCycle,
                          distanceUnloaded: Math.max(
                            0,
                            Number(e.target.value) || 0
                          ),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Speed Loaded (km/h)</Label>
                    <Input
                      aria-label="speedLoaded"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={haulCycle.speedLoaded}
                      onChange={(e) =>
                        setHaulCycle({
                          ...haulCycle,
                          speedLoaded: Math.max(0.1, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Speed Unloaded (km/h)</Label>
                    <Input
                      aria-label="speedUnloaded"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={haulCycle.speedUnloaded}
                      onChange={(e) =>
                        setHaulCycle({
                          ...haulCycle,
                          speedUnloaded: Math.max(0.1, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Loading Time (s)</Label>
                    <Input
                      aria-label="loadingTime"
                      type="number"
                      min="1"
                      step="1"
                      value={haulCycle.loadingTime}
                      onChange={(e) =>
                        setHaulCycle({
                          ...haulCycle,
                          loadingTime: Math.max(1, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Unloading Time (s)</Label>
                    <Input
                      aria-label="unloadingTime"
                      type="number"
                      min="1"
                      step="1"
                      value={haulCycle.unloadingTime}
                      onChange={(e) =>
                        setHaulCycle({
                          ...haulCycle,
                          unloadingTime: Math.max(1, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Truck & Operational Parameters */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Truck Payload */}
              <Card>
                <div className="p-6">
                  <h2 className="mb-1 text-xl font-semibold text-slate-100">
                    Truck Capacity
                  </h2>
                  <p className="mb-4 text-sm text-slate-400">
                    Payload per haul cycle
                  </p>

                  <div className="space-y-1.5">
                    <Label>Payload (tonnes)</Label>
                    <Input
                      aria-label="payloadTonnes"
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={truck.payloadTonnes}
                      onChange={(e) =>
                        setTruck({
                          payloadTonnes: Math.max(0.1, Number(e.target.value) || 0),
                        })
                      }
                    />
                  </div>
                </div>
              </Card>

              {/* Mine Production Target */}
              <Card>
                <div className="p-6">
                  <h2 className="mb-1 text-xl font-semibold text-slate-100">
                    Production Target
                  </h2>
                  <p className="mb-4 text-sm text-slate-400">
                    Annual mine tonnage goal
                  </p>

                  <div className="space-y-1.5">
                    <Label>Total (tonnes/year)</Label>
                    <Input
                      aria-label="totalMineTonnesPerYear"
                      type="number"
                      min="0"
                      step="1000"
                      value={minePlan.totalMineTonnesPerYear}
                      onChange={(e) =>
                        setMinePlan({
                          totalMineTonnesPerYear: Math.max(
                            0,
                            Number(e.target.value) || 0
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Operational Factors */}
            <Card>
              <div className="p-6">
                <h2 className="mb-1 text-xl font-semibold text-slate-100">
                  Operational Factors
                </h2>
                <p className="mb-4 text-sm text-slate-400">
                  Efficiency multipliers (availability × efficiency × utilization)
                </p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Availability (%)</Label>
                    <Input
                      aria-label="availabilityPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={toPercent(operational.availability)}
                      onChange={(e) =>
                        setOperational({
                          ...operational,
                          availability: Math.min(
                            1,
                            Math.max(0, fromPercent(Number(e.target.value) || 0))
                          ),
                        })
                      }
                    />
                    <p className="text-xs text-slate-500">Default: 90%</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Efficiency (%)</Label>
                    <Input
                      aria-label="efficiencyPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={toPercent(operational.efficiency)}
                      onChange={(e) =>
                        setOperational({
                          ...operational,
                          efficiency: Math.min(
                            1,
                            Math.max(0, fromPercent(Number(e.target.value) || 0))
                          ),
                        })
                      }
                    />
                    <p className="text-xs text-slate-500">Default: 60%</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Utilization (%)</Label>
                    <Input
                      aria-label="utilizationPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={toPercent(operational.utilization)}
                      onChange={(e) =>
                        setOperational({
                          ...operational,
                          utilization: Math.min(
                            1,
                            Math.max(0, fromPercent(Number(e.target.value) || 0))
                          ),
                        })
                      }
                    />
                    <p className="text-xs text-slate-500">Default: 90%</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Error Display */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-4">
                <ErrorText>
                  <span data-testid="calc-error">{error}</span>
                </ErrorText>
              </div>
            )}

            {/* Calculate Button */}
            <Button
              onClick={onCalculate}
              className="w-full py-3 text-lg font-semibold"
              aria-label="calculate-button"
            >
              Calculate Fleet Requirements
            </Button>
          </div>

          {/* Right Column: Results & Scenarios */}
          <div className="space-y-6">
            {/* Results Panel */}
            <Card>
              <div className="p-6">
                <h2 className="mb-4 text-xl font-semibold text-slate-100">
                  Results
                </h2>

                {!results && (
                  <p className="text-sm text-slate-400">
                    Enter parameters and click &quot;Calculate&quot; to see results.
                  </p>
                )}

                {results && (
                  <div className="space-y-4">
                    {/* Cycle Time */}
                    <div className="rounded-lg border border-white/5 bg-slate-900/40 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-400">
                        Cycle Time
                      </div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span
                          className="text-2xl font-bold text-slate-100"
                          data-testid="cycle-time-seconds"
                        >
                          {results.cycleTimeSeconds.toFixed(0)}
                        </span>
                        <span className="text-sm text-slate-400">seconds</span>
                      </div>
                      <div
                        className="mt-0.5 text-sm text-slate-400"
                        data-testid="cycle-time-minutes"
                      >
                        ({results.cycleTimeMinutes.toFixed(1)} minutes)
                      </div>
                    </div>

                    {/* Productivity Metrics */}
                    <div className="space-y-3 rounded-lg border border-white/5 bg-slate-900/40 p-4">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          Tonnes per Hour
                        </div>
                        <div
                          className="mt-1 text-xl font-semibold text-slate-100"
                          data-testid="tonnes-per-hour"
                        >
                          {results.tonnesPerHour.toFixed(1)} tph
                        </div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          Annual Capacity per Truck
                        </div>
                        <div
                          className="mt-1 text-xl font-semibold text-slate-100"
                          data-testid="tonnes-per-truck-year"
                        >
                          {results.tonnesPerTruckYear.toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          t/year
                        </div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-wide text-slate-400">
                          Effective Factor
                        </div>
                        <div className="mt-1 text-xl font-semibold text-slate-100">
                          {toPercent(results.effectiveFactor)}%
                        </div>
                      </div>
                    </div>

                    {/* Fleet Size - Highlight */}
                    <div className="rounded-xl border-2 border-brand-500/30 bg-gradient-to-br from-brand-950/40 to-slate-900/40 p-5">
                      <div className="text-xs uppercase tracking-wide text-brand-300">
                        Fleet Size Required
                      </div>
                      <div className="mt-2 flex items-baseline gap-3">
                        <span
                          className="text-4xl font-bold text-brand-400"
                          data-testid="trucks-required"
                        >
                          {results.trucksRequired}
                        </span>
                        <span className="text-lg text-slate-300">trucks</span>
                      </div>
                      <div className="mt-2 text-xs text-slate-400">
                        Raw calculation:{" "}
                        <span data-testid="raw-trucks">
                          {results.rawTrucks.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Scenario Management */}
            <Card>
              <div className="p-6">
                <h2 className="mb-4 text-xl font-semibold text-slate-100">
                  Scenarios
                </h2>

                {/* Save Scenario */}
                <div className="mb-4 space-y-2">
                  <Label>Scenario Name</Label>
                  <Input
                    aria-label="scenario-name"
                    type="text"
                    placeholder="e.g., Base Case"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                  />
                  <Button
                    onClick={onSaveScenario}
                    className="w-full"
                    aria-label="save-scenario"
                    disabled={!results || !scenarioName.trim()}
                  >
                    Save Current Scenario
                  </Button>
                </div>

                {/* Scenario List */}
                {scenarios.length === 0 && (
                  <p className="text-sm text-slate-400">
                    No saved scenarios yet.
                  </p>
                )}

                {scenarios.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-300">
                      Saved Scenarios
                    </div>
                    <div className="max-h-96 space-y-2 overflow-y-auto">
                      {scenarios.map((scenario) => (
                        <div
                          key={scenario.id}
                          className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-900/40 p-3"
                          data-testid={`scenario-${scenario.id}`}
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium text-slate-200">
                              {scenario.name}
                            </div>
                            <div className="text-xs text-slate-400">
                              {scenario.trucksRequired} trucks •{" "}
                              {new Date(scenario.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Button
                            onClick={() => onLoadScenario(scenario)}
                            className="px-3 py-1 text-sm"
                            aria-label={`load-scenario-${scenario.id}`}
                          >
                            Load
                          </Button>
                          <button
                            onClick={() => onDeleteScenario(scenario.id)}
                            className="rounded px-2 py-1 text-sm text-slate-400 hover:bg-red-950/30 hover:text-red-400"
                            aria-label={`delete-scenario-${scenario.id}`}
                          >
                            ×
                          </button>
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
