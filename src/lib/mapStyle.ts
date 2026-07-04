// MapLibre 再スタイル。朱雀（Suzaku）のデザイン言語（オフホワイト + ink + accent + muted）に
// 合わせて MapTiler ベクタータイルを最小限に塗り直した地図スタイル。
// 地図は目的地選択のためだけに使う（コンパス本体はオフライン動作）。

import type { StyleSpecification } from 'maplibre-gl';

const SURFACE = '#fcfbf8';
const INK = '#181311';
const ACCENT = '#9f3327';
const MUTED = '#8a817c';
const WATER = '#e6e2da'; // surface より一段沈めた面。水域を静かに示す。
const LAND = '#f4efe7'; // 公園・緑地。ごく淡く。
const HAIRLINE = '#e7e1d8'; // 道路の細線。構造だけ残す。

const KEY = import.meta.env.VITE_MAPTILER_KEY;

export function hasMap(): boolean {
  return Boolean(KEY);
}

/**
 * MapTiler の v3 ベクタータイルを朱雀の3色 + 補助グレーで塗り直した style を返す。
 * 「変化させる、足さない」— 面・線・文字だけに絞り、色数を増やさない。
 */
export function buildMapStyle(): StyleSpecification {
  return {
    version: 8,
    name: 'Suzaku',
    glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${KEY}`,
    sources: {
      openmaptiles: {
        type: 'vector',
        url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${KEY}`,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': SURFACE },
      },
      {
        id: 'landcover',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        paint: { 'fill-color': LAND, 'fill-opacity': 0.6 },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        paint: { 'fill-color': LAND, 'fill-opacity': 0.7 },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': WATER },
      },
      {
        id: 'road',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': HAIRLINE,
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 0.4,
            14, 1.2,
            18, 5,
          ],
        },
      },
      {
        id: 'building',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'building',
        minzoom: 15,
        paint: {
          'fill-color': HAIRLINE,
          'fill-opacity': 0.5,
        },
      },
      {
        id: 'place-label',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        layout: {
          'text-field': [
            'coalesce',
            ['get', 'name:ja'],
            ['get', 'name:latin'],
            ['get', 'name'],
          ],
          'text-font': ['Noto Sans Regular'],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 11,
            14, 15,
          ],
          'text-max-width': 8,
        },
        paint: {
          'text-color': INK,
          'text-halo-color': SURFACE,
          'text-halo-width': 1.4,
          'text-opacity': 0.85,
        },
      },
      {
        id: 'road-label',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'transportation_name',
        minzoom: 14,
        layout: {
          'text-field': [
            'coalesce',
            ['get', 'name:ja'],
            ['get', 'name:latin'],
            ['get', 'name'],
          ],
          'text-font': ['Noto Sans Regular'],
          'text-size': 11,
          'symbol-placement': 'line',
        },
        paint: {
          'text-color': MUTED,
          'text-halo-color': SURFACE,
          'text-halo-width': 1.2,
        },
      },
    ],
  };
}

export { ACCENT, INK };
