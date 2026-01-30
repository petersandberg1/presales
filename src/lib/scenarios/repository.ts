import type { Scenario } from "@/core";

export interface ScenarioRepository {
  save(scenario: Scenario): Promise<void>;
  list(): Promise<Scenario[]>;
  get(id: string): Promise<Scenario | null>;
  remove(id: string): Promise<void>;
}