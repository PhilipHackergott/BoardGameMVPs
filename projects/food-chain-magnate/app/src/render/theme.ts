// Board/UI palette tokens — the canvas/SVG analog of the DOM :root tokens, kept in sync with
// concept/concept.css and 05-game-design-doc.md ("1950s corporate fast-food boom, clean infographic").

export const THEME = {
  cream: '#F4E9D0',
  cream2: '#EADDBF',
  cream3: '#E0D0AC',
  ink: '#2B2118',
  inkSoft: '#6B5E4C',
  chrome: '#C2C7CC',
  chromeDark: '#8A9298',
  turquoise: '#1FAE9C',
  cherry: '#D6342C',
  mustard: '#E8B23A',
  navy: '#1F3A4D',
} as const;

export const COMPANY_COLORS = ['#D6342C', '#1FAE9C', '#E8B23A', '#7A5C9E'];
export const COMPANY_CRESTS = ['◆', '●', '▲', '■'];

export const PRODUCT_COLOR: Record<string, string> = {
  burger: '#B5651D',
  pizza: '#C8472B',
  soda: '#3E7CB1',
  lemonade: '#E8C53A',
  beer: '#C68A2E',
};
export const PRODUCT_GLYPH: Record<string, string> = {
  burger: '🍔',
  pizza: '🍕',
  soda: '🥤',
  lemonade: '🍋',
  beer: '🍺',
};
