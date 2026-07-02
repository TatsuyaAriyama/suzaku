// MapTiler 共通設定。地図スタイル URL とキー。

const KEY = import.meta.env.VITE_MAPTILER_KEY;

export function hasMapTiler(): boolean {
  return Boolean(KEY);
}

/**
 * 地図スタイル URL。ミニマルな light 系（dataviz-light）を採用し、
 * 読み込み後にブランドのオフホワイトへ再スタイルする（restyleToBrand）。
 */
export function mapStyleUrl(): string {
  return `https://api.maptiler.com/maps/dataviz-light/style.json?key=${KEY}`;
}

export const BRAND = {
  surface: '#FCFBF8',
  ink: '#181311',
  accent: '#9F3327',
  muted: '#8A817C',
  water: '#EFEAE1',
  land: '#FCFBF8',
} as const;
