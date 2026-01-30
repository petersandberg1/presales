"use client";

import React, { useEffect, useState } from "react";
import { calculate, type ScenarioInput, type ScenarioResult, type Scenario } from "@/core";
import { LocalScenarioRepository } from "@/lib/scenarios/localRepository";
import { Button, Card, Input, Label } from "@/components/ui";

const repo = new LocalScenarioRepository();

export default function CalculatorClient() {
  const [input, setInput] = useState<ScenarioInput>({
    trucks: 1,
    hoursPerDay: 8,
    costPerHour: 100,
  });

  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [name, setName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setScenarios(await repo.list());
    })();
  }, []);

  function onCalculate() {
    setError(null);
    try {
      const r = calculate(input);
      setResult(r);
    } catch (e: any) {
      setError(e?.message ?? "Fel i input");
      setResult(null);
    }
  }

  async function onSave() {
    if (!result) {
      setError("Beräkna först innan du sparar.");
      return;
    }
    const now = new Date().toISOString();
    const newScenario: Scenario = {
      id: crypto.randomUUID(),
      name: name || `Scenario ${new Date().toLocaleString()}`,
      input,
      result,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await repo.save(newScenario);
    setScenarios(await repo.list());
    setName("");
  }

  async function onLoad(id: string) {
    const s = await repo.get(id);
    if (!s) return;
    setInput(s.input);
    setResult(s.result);
  }

  async function onDelete(id: string) {
    await repo.remove(id);
    setScenarios(await repo.list());
    if (result && scenarios.find((x) => x.id === id)) {
      setResult(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-4 text-2xl font-semibold">Kalkylator</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Form */}
        <Card>
          <div className="space-y-4 p-6">
            <div>
              <Label>Antal truckar</Label>
              <Input
                aria-label="trucks"
                type="number"
                value={input.trucks}
                onChange={(e) =>
                  setInput({
                    ...input,
                    trucks: Math.max(1, Number(e.target.value) || 0),
                  })
                }
              />
            </div>

            <div>
              <Label>Timmar per dag</Label>
              <Input
                aria-label="hoursPerDay"
                type="number"
                value={input.hoursPerDay}
                onChange={(e) =>
                  setInput({
                    ...input,
                    hoursPerDay: Math.max(1, Number(e.target.value) || 0),
                  })
                }
              />
            </div>

            <div>
              <Label>Kostnad per timme</Label>
              <Input
                aria-label="costPerHour"
                type="number"
                value={input.costPerHour}
                onChange={(e) =>
                  setInput({
                    ...input,
                    costPerHour: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </div>

            {error && (
              <p className="text-sm text-red-400" data-testid="calc-error">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button onClick={onCalculate}>Beräkna</Button>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Namn för scenario (valfritt)"
                className="flex-1 rounded-xl border border-white/10 bg-slate-900/40 px-3 py-2 text-slate-100"
                aria-label="scenario-name"
              />
              <Button
                onClick={onSave}
                className="bg-green-500 hover:bg-green-600"
              >
                Spara
              </Button>
            </div>
          </div>
        </Card>

        {/* Result + list */}
        <div className="space-y-4">
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold">Resultat</h2>
              {result ? (
                <div className="mt-3 space-y-2">
                  <div>
                    Total hours / dag:{" "}
                    <strong>{result.totalHoursPerDay}</strong>
                  </div>
                  <div>
                    Dagkostnad: <strong>{result.dailyCost}</strong>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-slate-400">
                  Kör en beräkning för att se resultat här.
                </p>
              )}
            </div>
          </Card>

            <Card>
              <div className="p-6">
                <h3 className="font-semibold">Sparade scenarion</h3>
                <div className="mt-3 space-y-2">
                  {scenarios.length === 0 && (
                    <div className="text-slate-400">Inga sparade scenarion</div>
                  )}
                  {scenarios.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 border-t border-white/5 py-2"
                    >
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-sm text-slate-400">
                          {new Date(s.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          aria-label={`load-${s.id}`}
                          onClick={() => onLoad(s.id)}
                          className="rounded bg-slate-800/60 px-3 py-1 text-sm"
                        >
                          Ladda
                        </button>
                        <button
                          aria-label={`delete-${s.id}`}
                          onClick={() => onDelete(s.id)}
                          className="rounded bg-red-600/70 px-3 py-1 text-sm"
                        >
                          Ta bort
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
        </div>
      </div>
    </div>
  );
}