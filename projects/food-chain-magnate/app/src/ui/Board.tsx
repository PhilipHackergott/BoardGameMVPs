import { parseTile, PRODUCTS, type GameState } from '../engine';
import { COMPANY_COLORS, PRODUCT_COLOR } from '../render/theme';

const TILE = 74;

export function Board({ state }: { state: GameState }) {
  const { rows, cols } = state.map;
  const W = cols * TILE;
  const H = rows * TILE;
  const center = (t: string) => {
    const { row, col } = parseTile(t);
    return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
  };

  return (
    <div className="board">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="city board">
        {/* tile grid */}
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => (
            <rect key={`t${r}-${c}`} x={c * TILE} y={r * TILE} width={TILE} height={TILE} fill="none" stroke="#e3d7b6" />
          )),
        )}
        {/* roads */}
        {[...state.map.roads].map((edge) => {
          const [a, b] = edge.split('|');
          const A = center(a);
          const B = center(b);
          return <line key={edge} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#cfd3d6" strokeWidth={9} strokeLinecap="round" />;
        })}
        {/* drink sources */}
        {state.map.drinkSources.map((d, i) => {
          const p = center(d.tile);
          return <circle key={`d${i}`} cx={p.x + 22} cy={p.y - 22} r={6} fill={PRODUCT_COLOR[d.drink]} stroke="#2B2118" strokeWidth={1.5} />;
        })}
        {/* houses */}
        {state.map.houses.map((h) => {
          const p = center(h.tile);
          const demand = PRODUCTS.flatMap((prod) => Array(h.demand[prod]).fill(prod));
          return (
            <g key={`h${h.id}`} transform={`translate(${p.x - 16}, ${p.y - 12})`}>
              {h.garden && <rect x={-8} y={2} width={48} height={26} rx={4} fill="rgba(85,122,46,.22)" stroke="#557A2E" strokeDasharray="4 3" />}
              <path d="M0 8 l16 -14 16 14 v18 h-32z" fill="#fff" stroke="#2B2118" strokeWidth={2} />
              <text x={16} y={24} fontSize={11} fontWeight={700} textAnchor="middle">{h.id}</text>
              {demand.slice(0, 5).map((prod, i) => (
                <circle key={i} cx={2 + i * 8} cy={-8} r={4} fill={PRODUCT_COLOR[prod]} stroke="#2B2118" strokeWidth={1} />
              ))}
            </g>
          );
        })}
        {/* restaurants (open + coming-soon) */}
        {state.companies.flatMap((co) =>
          [...co.restaurants.map((t) => ({ t, soon: false })), ...co.pendingRestaurants.map((t) => ({ t, soon: true }))].map(
            ({ t, soon }, i) => {
              const p = center(t);
              return (
                <g key={`r${co.id}-${i}`} transform={`translate(${p.x - 18}, ${p.y - 4})`}>
                  <rect width={36} height={22} rx={3} fill={COMPANY_COLORS[co.id]} stroke="#2B2118" strokeWidth={2} opacity={soon ? 0.55 : 1} />
                  <text x={18} y={15} fontSize={7} fill="#fff" textAnchor="middle" fontFamily="Anton, sans-serif">
                    {soon ? 'SOON' : co.name.replace('Company ', 'CO ')}
                  </text>
                </g>
              );
            },
          ),
        )}
        {/* marketing pieces */}
        {state.marketing.map((m) => {
          const p = center(m.tile);
          return (
            <rect key={`m${m.id}`} x={p.x - 26} y={p.y - 26} width={10} height={10} fill={PRODUCT_COLOR[m.product]} stroke="#2B2118" strokeWidth={1.5} />
          );
        })}
      </svg>
    </div>
  );
}
