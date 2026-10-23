// Domain types for the Food Chain Magnate engine.
//
// M1 established the economic shape (cash/stock/pricing/restaurants/map/bank). M2 adds the company
// org-chart (employee cards), the phase machine, and the job market. M3 adds marketing pieces +
// milestones. The per-turn economic fields on Company (pricing/waitresses/cfo/salaryDue/buyers...)
// are DERIVED from the cards at work each turn (see orgchart.derive); milestone bonuses are PERMANENT
// flags granted once. Determinism: the only randomness is the setup PRNG.

export type Product = 'burger' | 'pizza' | 'soda' | 'lemonade' | 'beer';
export const PRODUCTS: readonly Product[] = ['burger', 'pizza', 'soda', 'lemonade', 'beer'];
export const FOODS: readonly Product[] = ['burger', 'pizza'];
export const DRINKS: readonly Product[] = ['soda', 'lemonade', 'beer'];

export type Goods = Record<Product, number>;
export function emptyGoods(): Goods {
  return { burger: 0, pizza: 0, soda: 0, lemonade: 0, beer: 0 };
}
export function goods(partial: Partial<Goods>): Goods {
  return { ...emptyGoods(), ...partial };
}
export function totalGoods(g: Goods): number {
  return PRODUCTS.reduce((s, p) => s + g[p], 0);
}

export type CompanyId = number;
export type TileId = string; // `${row},${col}`

/** A specific physical card a company owns. `atWork` = in the company structure this turn. */
export interface CardInstance {
  uid: number;
  defId: string;
  atWork: boolean;
  busy?: number; // a marketeer running a campaign is unavailable for this many more turns
}

export interface PricingStaff {
  price: number; // each Pricing Manager: −$1
  discount: number; // each Discount Manager: −$3
  luxury: number; // each Luxuries Manager: +$10
}

export interface Company {
  id: CompanyId;
  name: string;
  kind: 'human' | 'ai';
  aiProfile?: string; // AI personality id (M4)
  cash: number;
  restaurants: TileId[]; // entrance tiles of OPEN restaurants
  pendingRestaurants: TileId[]; // "COMING SOON" — open at clean-up
  stock: Goods;
  cards: CardInstance[]; // everything owned (at work or on the beach)

  // --- derived each turn from cards at work (orgchart.derive) ---
  pricing: PricingStaff;
  waitresses: number;
  cfo: boolean;
  salaryDue: number;

  // --- chosen bank-reserve value (added to bank on the first break) ---
  reserve: number;

  // --- permanent milestone-granted bonuses (granted in M3, default off) ---
  lowerPrices: boolean; // "First to lower prices": unit price −$1
  waitressMilestone: boolean; // "First waitress played": waitresses earn $5
  burgerBonus: boolean; // "First burger marketed": +$5/burger
  pizzaBonus: boolean; // "First pizza marketed": +$5/pizza
  drinkBonus: boolean; // "First drink marketed": +$5/drink
  freezer: boolean; // "First to throw away food/drink": keep up to 10 tokens at clean-up
  eternalMarketing: boolean; // "First billboard placed": campaigns never end + no marketeer salary
  buyerRangeBonus: number; // "First cart operator": +1 range to buyers
  errandBoyBonus: boolean; // "First errand boy": +1 drink per source
  salaryDiscount: number; // "First to train": −$15 salary
  ceoIsCfo: boolean; // "First to $100": CEO also acts as a CFO
  ceoIsCfoPending: boolean; // milestone earned this turn → becomes active next turn
  airplaneSlots: number; // "First airplane": +2 open slots for Order of Business
  radioDouble: boolean; // "First radio": radios place 2 goods
  stackTrainers: boolean; // "First to pay $20 salary": stack trainers on one card
  hireMilestoneCount: number; // hires this turn (for "first to hire 3")
}

export interface House {
  id: number; // house number = Dinnertime serve order
  tile: TileId;
  garden: boolean;
  demand: Goods;
}

/** A drink source printed on a tile (buyers collect from these along their route). */
export interface DrinkSource {
  tile: TileId;
  drink: Product; // one of the DRINKS
}

export interface GameMap {
  rows: number;
  cols: number;
  roads: Set<string>; // canonical "a|b" edge keys (map.ts)
  houses: House[];
  drinkSources: DrinkSource[];
}

export type CampaignType = 'billboard' | 'mailbox' | 'airplane' | 'radio';

export interface MarketingPiece {
  id: number;
  type: CampaignType;
  product: Product;
  ownerId: CompanyId;
  tile: TileId; // origin tile (or board-edge anchor for airplanes)
  axis?: 'row' | 'col'; // airplane orientation
  span?: number; // airplane: 1/3/5 rows/cols
  turnsLeft: number; // remaining duration (Infinity-ish via large number if eternal)
  eternal: boolean;
}

export type Phase =
  | 'restructuring'
  | 'orderOfBusiness'
  | 'working'
  | 'dinnertime'
  | 'payday'
  | 'marketing'
  | 'cleanup';

export interface GameConfig {
  players: number;
  seed: number;
  /** seat kinds; defaults to all human if omitted. */
  seats?: { kind: 'human' | 'ai'; aiProfile?: string }[];
}

/** Shared job market: how many copies of each employee def are available to hire. */
export type JobMarket = Record<string, number>;

export interface GameState {
  config: GameConfig;
  rngState: number;
  turn: number;
  phase: Phase;
  bank: number;
  bankBreaks: 0 | 1 | 2;
  endAfterPhase: boolean;
  companies: Company[];
  map: GameMap;
  jobMarket: JobMarket;
  marketing: MarketingPiece[];
  nextMarketingId: number;
  nextCardUid: number;
  /** milestone id → company ids that have claimed it (claimable by others the SAME turn). */
  milestones: Record<string, CompanyId[]>;
  /** milestone ids locked (claimed last turn) and removed from play. */
  lockedMilestones: string[];
  turnOrder: CompanyId[];
  winner: CompanyId | null;
  ended: boolean;
  log: string[];
  /** the most recent Dinnertime resolution (for the UI "why" view). */
  lastDinnertime?: import('./selling').DinnertimeReport;
}
