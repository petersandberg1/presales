"use client";

import React, { useState } from "react";
import {
  type MinePlan,
  type HaulParams,
  type TruckSizingResult,
  sizeTrucksFromMinePlan,
} from "@/core";
import { Button, Card, Input, Label } from "@/components/ui";

export default function CalculatorClient() {
  const [plan, setPlan] = useState<MinePlan>({
    millionTonsPerYear: 10,
  });

  const [params, setParams] = useState<HaulParams>({
    operatingDaysPerYear: 365,
    operatingHoursPerDay: 20,
    payloadTons: 90,
    cycleTimeMinutes: 30,
    availability: 0.85,
    utilization: 0.8,
  });

  const [result, setResult] = useState<TruckSizingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onCalculate() {
    setError(null);
    try {
      const r = sizeTrucksFromMinePlan(plan, params);
      setResult(r);
    } catch (e: any) {
      setResult(null);
      setError(e?.message ?? "Fel i input");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-4 text-2xl font-semibold text-slate-100">  Truck Fleet Sizing Calculator</h1>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Vänster: Input */}
        <Card>
          <div className="space-y-5 p-6">
            <div>
             <h2 className="text-lg font-semibold text-slate-100">Mine Plan</h2>
             <p className="text-sm text-slate-400">
               Annual production target used for fleet sizing.
             </p>
              <div className="mt-3 space-y-1.5">
                <Label>Miljoner ton per år (Mtpa)</Label>
                <Input
                  aria-label="mtpa"
                  type="number"
                  value={plan.millionTonsPerYear}
                  onChange={(e) =>
                    setPlan({
                      ...plan,
                      millionTonsPerYear: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-100">Operating Parameters</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Driftdagar per år</Label>
                  <Input
                    aria-label="operatingDaysPerYear"
                    type="number"
                    value={params.operatingDaysPerYear}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        operatingDaysPerYear: Math.max(1, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-semibold text-slate-100">Haul Truck Parameters</h2>
                  <Input
                    aria-label="operatingHoursPerDay"
                    type="number"
                    value={params.operatingHoursPerDay}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        operatingHoursPerDay: Math.max(1, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Truck / haul</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Payload (ton)</Label>
                  <Input
                    aria-label="payloadTons"
                    type="number"
                    value={params.payloadTons}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        payloadTons: Math.max(1, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Cykeltid (minuter)</Label>
                  <Input
                    aria-label="cycleTimeMinutes"
                    type="number"
                    value={params.cycleTimeMinutes}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        cycleTimeMinutes: Math.max(1, Number(e.target.value) || 0),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Availability (0–1)</Label>
                  <Input
                    aria-label="availability"
                    type="number"
                    step="0.01"
                    value={params.availability}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        availability: Math.min(
                          1,
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Utilization (0–1)</Label>
                  <Input
                    aria-label="utilization"
                    type="number"
                    step="0.01"
                    value={params.utilization}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        utilization: Math.min(
                          1,
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400" data-testid="calc-error">
                {error}
              </p>
            )}

            <Button onClick={onCalculate} className="w-full">
              Beräkna antal lastbilar
            </Button>
          </div>
        </Card>

        {/* Höger: Resultat */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold">Resultat</h2>

            {!result && (
              <p className="mt-3 text-sm text-slate-400">
                Ange mineplan och parametrar, klicka sedan &quot;Beräkna&quot;.
              </p>
            )}

            {result && (
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Årlig tonnage</span>
                  <span className="font-medium">
                    {Math.round(result.tonsPerYear).toLocaleString("sv-SE")} ton/år
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Krav på ton per timme</span>
                  <span className="font-medium">
                    {result.requiredTph.toFixed(1)} ton/h
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Effektiv kapacitet per lastbil</span>
                  <span className="font-medium">
                    {result.effectiveTphPerTruck.toFixed(1)} ton/h
                  </span>
                </div>

                <div className="mt-4 flex items-baseline justify-between rounded-xl bg-slate-900/70 px-4 py-3">
                  <span className="text-sm text-slate-400">Antal lastbilar som krävs</span>
                  <span className="text-2xl font-semibold text-brand-400">
                    {result.trucksRequired}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}