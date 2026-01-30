import { z } from "zod";

export const ScenarioInputSchema = z.object({
  // Exempelparametrar – byt till dina riktiga
  trucks: z.number().int().min(1),
  hoursPerDay: z.number().min(1).max(24),
  costPerHour: z.number().min(0),
});

export type ScenarioInput = z.infer<typeof ScenarioInputSchema>;

export type ScenarioResult = {
  totalHoursPerDay: number;
  dailyCost: number;
};

export type Scenario = {
  id: string;
  name: string;
  input: ScenarioInput;
  result: ScenarioResult;
  createdAt: string;
  updatedAt: string;
  version: number;
};