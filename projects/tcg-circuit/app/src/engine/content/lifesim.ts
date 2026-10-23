// Persona-style life-sim — DATA. A year-level CONTEXT picked at New Game sets your starting stats +
// difficulty; ACTIVITIES spend a day-slot to move money/stats. Five character stats gate dialogue and
// out-of-game checks. Pure: the career reducer applies these deltas deterministically.

export type StatKey = "composure" | "charisma" | "knowledge" | "stamina" | "reputation";
export const STAT_KEYS: StatKey[] = ["composure", "charisma", "knowledge", "stamina", "reputation"];
export const STAT_LABEL: Record<StatKey, string> = {
  composure: "Composure", charisma: "Charisma", knowledge: "Knowledge", stamina: "Stamina", reputation: "Reputation",
};
export const STAT_MAX = 20;

export interface LifeContext {
  id: string;
  name: string;
  desc: string;
  startStats: Record<StatKey, number>;
  examEvery: number; // an exam every N days (0 = none)
  difficulty: number; // a hint applied to opponent skill in story duels (−/+)
}

export const CONTEXTS: LifeContext[] = [
  { id: "hs_soph", name: "High School — Sophomore", desc: "The most free time, the gentlest curve. A relaxed first season on the circuit.", startStats: { composure: 3, charisma: 3, knowledge: 3, stamina: 6, reputation: 1 }, examEvery: 0, difficulty: -0.05 },
  { id: "hs_junior", name: "High School — Junior", desc: "Exams start to bite. A balanced run.", startStats: { composure: 4, charisma: 4, knowledge: 5, stamina: 6, reputation: 2 }, examEvery: 6, difficulty: 0 },
  { id: "hs_senior", name: "High School — Senior", desc: "College looms — exams matter, time is tight, the scene takes you seriously.", startStats: { composure: 5, charisma: 5, knowledge: 7, stamina: 5, reputation: 3 }, examEvery: 5, difficulty: 0.04 },
  { id: "college", name: "College", desc: "Most freedom, hardest crowd. You're an adult now; the locals are sharks.", startStats: { composure: 6, charisma: 6, knowledge: 8, stamina: 7, reputation: 2 }, examEvery: 7, difficulty: 0.08 },
];

export function getContext(id: string): LifeContext {
  return CONTEXTS.find((c) => c.id === id) ?? CONTEXTS[0];
}

/** Is an (untaken) exam due today? */
export function examDue(day: number, contextId: string, flags: Record<string, boolean>): boolean {
  const ctx = getContext(contextId);
  return ctx.examEvery > 0 && day % ctx.examEvery === 0 && !flags[`exam_${day}`];
}

export interface Activity {
  id: string;
  name: string;
  desc: string;
  slotCost: number; // day-slots consumed (usually 1)
  money: number;
  stats: Partial<Record<StatKey, number>>;
  resultText: string;
}

export const ACTIVITIES: Record<string, Activity> = {
  study: { id: "study", name: "Study", desc: "Hit the books — sharpen Knowledge (and pass exams).", slotCost: 1, money: 0, stats: { knowledge: 1, stamina: -1 }, resultText: "You study hard. Knowledge +1." },
  work: { id: "work", name: "Work a shift", desc: "Earn pocket money at a part-time job.", slotCost: 1, money: 8, stats: { stamina: -2, reputation: 0 }, resultText: "A shift done. +◆8, but you're tired (Stamina −2)." },
  socialize: { id: "socialize", name: "Socialize", desc: "Hang at the shop — build Charisma and your local rep.", slotCost: 1, money: 0, stats: { charisma: 1, reputation: 1, stamina: -1 }, resultText: "Good hang. Charisma +1, Reputation +1." },
  train: { id: "train", name: "Practice (solo)", desc: "Goldfish your deck — steadier nerves (Composure).", slotCost: 1, money: 0, stats: { composure: 1, stamina: -1 }, resultText: "Reps in. Composure +1." },
};
