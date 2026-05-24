// Checkpoint + registry file I/O (node:fs). Node-only; lives in the excluded rl/ dir. Stores
// one JSON file per checkpoint (meta + weights) plus a registry.json index the matchmaker reads.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Checkpoint, CheckpointMeta, Registry } from "../src/rl/checkpoint";

export const CHECKPOINT_DIR = resolve(process.cwd(), "rl-checkpoints");

function ensureDir(): void {
  if (!existsSync(CHECKPOINT_DIR)) mkdirSync(CHECKPOINT_DIR, { recursive: true });
}

export function saveCheckpoint(cp: Checkpoint): void {
  ensureDir();
  writeFileSync(resolve(CHECKPOINT_DIR, `${cp.meta.id}.json`), JSON.stringify(cp));
}

export function loadCheckpoint(id: string): Checkpoint {
  return JSON.parse(readFileSync(resolve(CHECKPOINT_DIR, `${id}.json`), "utf8")) as Checkpoint;
}

export function listCheckpointIds(): string[] {
  ensureDir();
  return readdirSync(CHECKPOINT_DIR)
    .filter((f) => f.endsWith(".json") && f !== "registry.json")
    .map((f) => f.replace(/\.json$/, ""));
}

export function saveRegistry(reg: Registry): void {
  ensureDir();
  writeFileSync(resolve(CHECKPOINT_DIR, "registry.json"), JSON.stringify(reg, null, 2));
}

export function loadRegistry(): Registry | null {
  const p = resolve(CHECKPOINT_DIR, "registry.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as Registry;
}

// Build the registry index from a set of rated checkpoint metas (best per style×strength cell).
export function buildRegistry(metas: CheckpointMeta[], arch: Registry["arch"], playerBaseline = 1000): Registry {
  const bands = (elo: number): string => `s${Math.round(elo / 150)}`; // ~150-Elo strength bands
  const archive: Record<string, string> = {};
  for (const m of metas) {
    const key = `${m.bcCell}|${bands(m.elo)}`;
    const cur = archive[key];
    if (!cur || (metas.find((x) => x.id === cur)?.elo ?? -Infinity) < m.elo) archive[key] = m.id;
  }
  return {
    updatedAt: new Date().toISOString(),
    arch,
    checkpoints: metas,
    archive,
    playerBaseline,
  };
}
