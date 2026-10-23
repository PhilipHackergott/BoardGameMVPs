import { describe, it, expect } from 'vitest';
import { tileDistance, chainDistance, addRoad, type GameMap } from '../../src/engine';

function grid(rows: number, cols: number, full = true): GameMap {
  const map: GameMap = { rows, cols, roads: new Set(), houses: [], drinkSources: [] };
  if (full) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r + 1 < rows) addRoad(map, `${r},${c}`, `${r + 1},${c}`);
        if (c + 1 < cols) addRoad(map, `${r},${c}`, `${r},${c + 1}`);
      }
    }
  }
  return map;
}

describe('tile distance (tile borders crossed along roads)', () => {
  it('is 0 for the same tile', () => {
    expect(tileDistance(grid(3, 3), '1,1', '1,1')).toBe(0);
  });

  it('counts BFS tile borders on a full road grid', () => {
    const g = grid(3, 3);
    expect(tileDistance(g, '0,0', '0,1')).toBe(1);
    expect(tileDistance(g, '0,0', '2,2')).toBe(4); // Manhattan on a grid
    expect(tileDistance(g, '0,0', '1,1')).toBe(2);
  });

  it('returns null when there is no road path', () => {
    const g: GameMap = { rows: 3, cols: 3, roads: new Set(), houses: [], drinkSources: [] };
    addRoad(g, '0,0', '0,1'); // an island pair; the rest disconnected
    expect(tileDistance(g, '0,0', '0,1')).toBe(1);
    expect(tileDistance(g, '0,0', '2,2')).toBeNull();
  });

  it('chainDistance takes the closest restaurant', () => {
    const g = grid(3, 3);
    expect(chainDistance(g, ['0,0', '2,2'], '2,1')).toBe(1); // nearest is 2,2
    expect(chainDistance(g, [], '2,1')).toBeNull(); // no restaurants
  });
});
