// Sets are DATA (tcg-design §1): the rules engine is fixed; the card pool grows. The MVP ships ONE
// launch set, but the model accepts the campaign's ~6–10 small drops without an engine change.

export interface PrismSet {
  id: string;
  name: string;
  code: string;
  releaseLabel: string;
  themes: string[];
  newKeywords: string[];
}

export const SETS: PrismSet[] = [
  {
    id: "pr1",
    name: "First Light",
    code: "FL",
    releaseLabel: "Launch set",
    themes: ["the five Affinities arrive", "establish each archetype's identity"],
    newKeywords: ["haste", "guard", "drain", "pierce", "shield", "volatile", "lifegain", "refractplus"],
  },
  {
    id: "pr2",
    name: "Tideturn",
    code: "TT",
    releaseLabel: "Set 2",
    themes: ["go-wide", "reach on death"],
    newKeywords: ["rally", "vengeance"],
  },
  {
    id: "pr3",
    name: "Deeproots",
    code: "DR",
    releaseLabel: "Set 3",
    themes: ["growth / go-tall", "more answers (removal)"],
    newKeywords: ["momentum"],
  },
];

export const LAUNCH_SET_ID = "pr1";
export const ALL_SET_IDS = ["pr1", "pr2", "pr3"];
