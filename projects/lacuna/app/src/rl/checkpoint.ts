// Checkpoint data shapes + (de)serialisation to plain JSON-safe objects. Browser-safe: the
// actual file I/O lives in the excluded rl/io.ts (node:fs). Keeping the shapes here lets the
// browser game load a checkpoint registry for matchmaking and (later) run inference.

// The network architecture, stored with every checkpoint so it can be rebuilt exactly. A
// fully-connected MLP over the flattened board raster + scalars (NO conv — the WASM backend
// lacks the conv-gradient kernel, but matmul gradients are fully supported, so a dense net
// trains entirely on WASM). On a GRID×GRID board a wide MLP that sees the whole board has
// ample capacity. Width/depth are tunable for the strength/speed trade-off.
export interface ArchSpec {
  grid: number; // GRID
  channels: number; // CHANNELS
  scalarSize: number; // SCALAR_SIZE
  policySize: number; // POLICY_SIZE
  maxPlayers: number;
  hidden: number; // shared-trunk dense width
  layers: number; // shared-trunk depth
  valueHidden: number; // value-head dense width
}

// Tensor weights flattened to JSON-safe arrays (one entry per model weight tensor).
export interface SerializedWeights {
  shapes: number[][];
  data: number[][];
}

export interface CheckpointMeta {
  id: string; // e.g. "gen3-a"
  createdAt: string; // ISO
  iter: number; // training iteration it was snapshotted at
  parent: string | null; // lineage (the checkpoint it was trained from)
  playersTrained: number[]; // player counts seen during training (e.g. [2,3,4])
  arch: ArchSpec;
  elo: number; // rating from the arena (1000 = baseline)
  eloGames: number; // games the rating is based on
  bc: number[]; // average behavioral-characteristic (style) vector, BC_SIZE long
  bcCell: string; // MAP-Elites archive cell key
  mctsSims: number; // search budget used to rate it (part of its strength identity)
  note?: string;
}

export interface Checkpoint {
  meta: CheckpointMeta;
  weights: SerializedWeights;
}

// The on-disk index the matchmaker reads: ratings + styles for every stored checkpoint, plus
// the MAP-Elites archive (best checkpoint id per style x strength cell).
export interface Registry {
  updatedAt: string;
  arch: ArchSpec;
  checkpoints: CheckpointMeta[]; // weights stored separately, one file per id
  archive: Record<string, string>; // "styleCell|strengthBand" -> checkpoint id
  playerBaseline: number; // 1000
}
