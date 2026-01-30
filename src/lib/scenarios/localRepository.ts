import type { ScenarioRepository } from "./repository";
import type { Scenario } from "@/core";

const LS_KEY = "presales:scenarios:v1";

function readAll(): Scenario[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Scenario[];
  } catch {
    return [];
  }
}

function writeAll(list: Scenario[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

export class LocalScenarioRepository implements ScenarioRepository {
  async save(incoming: Scenario): Promise<void> {
    const list = readAll();
    const idx = list.findIndex((s) => s.id === incoming.id);
    if (idx >= 0) {
      list[idx] = incoming;
    } else {
      list.push(incoming);
    }
    writeAll(list);
  }

  async list(): Promise<Scenario[]> {
    return readAll();
  }

  async get(id: string): Promise<Scenario | null> {
    const list = readAll();
    return list.find((s) => s.id === id) ?? null;
  }

  async remove(id: string): Promise<void> {
    const list = readAll().filter((s) => s.id !== id);
    writeAll(list);
  }

  // convenience helper to create new scenario metadata
  createNew(base: Omit<Scenario, "id" | "createdAt" | "updatedAt" | "version">): Scenario {
    const now = new Date().toISOString();
    return {
      ...base,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
  }
}