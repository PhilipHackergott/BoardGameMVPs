// The campaign calendar — DATA. Set drops and Banned/Limited announcements fire on given days and
// reshape the legal Format mid-run (the "live game" feel; tcg-design §1–2). PURE: currentFormat(day)
// folds every B&R change up to `day` onto the base format, so deck legality shifts as the year goes on.
// (With one launch set live, the meaningful events are B&R; the set-drop machinery is ready for more.)

import { Format, STANDARD_FORMAT } from "./format";

export type CampaignEvent =
  | { day: number; type: "setdrop"; setId: string; headline: string; body: string }
  | { day: number; type: "banlist"; headline: string; body: string; ban?: string[]; limit?: Record<string, 1 | 2> };

export const CAMPAIGN: CampaignEvent[] = [
  { day: 1, type: "setdrop", setId: "pr1", headline: "First Light is here!", body: "PRISM's launch set hits shelves. Five Affinities, fresh archetypes — the metagame begins today." },
  { day: 3, type: "setdrop", setId: "pr2", headline: "Set 2: Tideturn drops!", body: "Tideturn arrives with go-wide Rally and Vengeance reach. Boosters are on the shelf and the meta just shifted." },
  {
    day: 7, type: "banlist", headline: "B&R Update: World Titan limited",
    body: "The committee has limited World Titan to 1 per deck — Verdant ramp was warping every Friday. Ramp pilots, time to rebuild.",
    limit: { pr1_world_titan: 1 },
  },
  { day: 8, type: "setdrop", setId: "pr3", headline: "Set 3: Deeproots drops!", body: "Deeproots brings Momentum growth — and a wave of new removal to answer it. The format opens up." },
  {
    day: 14, type: "banlist", headline: "B&R Update: Aegis Protocol restricted",
    body: "Aegis Protocol drops to 1 copy — unbreakable Guard walls were grinding games to dust. Aggro breathes a little easier.",
    limit: { pr1_aegis_protocol: 1 },
  },
];

/** Sets legal on `day` = those whose set-drop has happened (always at least the launch set). */
export function legalSetsOn(day: number): string[] {
  const dropped = CAMPAIGN.filter((e) => e.type === "setdrop" && e.day <= day).map((e) => (e as { setId: string }).setId);
  return dropped.length ? dropped : ["pr1"];
}

/** The legal format on `day` = base Standard, restricted to dropped sets + every B&R change so far. */
export function currentFormat(day: number): Format {
  const banned = [...STANDARD_FORMAT.banned];
  const limited: Record<string, 1 | 2> = { ...STANDARD_FORMAT.limited };
  for (const ev of CAMPAIGN) {
    if (ev.day > day || ev.type !== "banlist") continue;
    for (const id of ev.ban ?? []) if (!banned.includes(id)) banned.push(id);
    for (const [id, n] of Object.entries(ev.limit ?? {})) limited[id] = n;
  }
  return { ...STANDARD_FORMAT, legalSetIds: legalSetsOn(day), banned, limited };
}

/** Calendar events announced up to `day`, most recent first — the in-fiction news feed. */
export function newsUpTo(day: number): CampaignEvent[] {
  return CAMPAIGN.filter((e) => e.day <= day).sort((a, b) => b.day - a.day);
}
