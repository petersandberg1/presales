/**
 * Scenario Repository - localStorage persistence for calculator scenarios
 */
import type { CostModelInput } from "@/lib/cost/calcCost";

export interface ProductionPlanRow {
  year: number;
  tonnesPerYear: number;
}

export interface CalculatorScenario {
  id: string;
  name: string;
  createdAt: string;

  // Haul cycle inputs
  distanceLoaded: number;
  distanceUnloaded: number;
  speedLoaded: number;
  speedUnloaded: number;
  loadingTime: number;
  unloadingTime: number;

  // Truck input
  payloadTonnes: number;

  // Operational factors (stored as 0..1)
  availability: number;
  efficiency: number;
  utilization: number;

  // Production plan
  productionPlan: ProductionPlanRow[];

  // Cost model (optional – absent in scenarios saved before this feature)
  costModel?: CostModelInput;

  // Computed results (stored for display)
  cycleTimeSeconds: number;
  tonnesPerHour: number;
  tonnesPerTruckYear: number;
  effectiveFactor: number;
}

const STORAGE_KEY = 'calculator-scenarios';

export const scenarioRepository = {
  /**
   * Get all scenarios from localStorage
   */
  getAll(): CalculatorScenario[] {
    if (typeof window === 'undefined') return [];

    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data) as CalculatorScenario[];
    } catch (error) {
      console.error('Failed to load scenarios:', error);
      return [];
    }
  },

  /**
   * Save a new scenario
   */
  save(scenario: Omit<CalculatorScenario, 'id' | 'createdAt'>): CalculatorScenario {
    const newScenario: CalculatorScenario = {
      ...scenario,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    const scenarios = this.getAll();
    scenarios.push(newScenario);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
      return newScenario;
    } catch (error) {
      console.error('Failed to save scenario:', error);
      throw new Error('Failed to save scenario');
    }
  },

  /**
   * Delete a scenario by ID
   */
  delete(id: string): void {
    const scenarios = this.getAll().filter(s => s.id !== id);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    } catch (error) {
      console.error('Failed to delete scenario:', error);
      throw new Error('Failed to delete scenario');
    }
  },

  /**
   * Get a single scenario by ID
   */
  getById(id: string): CalculatorScenario | undefined {
    return this.getAll().find(s => s.id === id);
  },
};
