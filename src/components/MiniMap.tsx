// コンパスの"脇役"ミニマップ。現在地・目的地・両者を結ぶ線を表示。
// MapLibre GL + MapTiler。ブランドのオフホワイトに再スタイルする。

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { hasMapTiler, mapStyleUrl, BRAND } from '../lib/maptiler';
import type { LatLon } from '../lib/geo';

interface Props {
  me: LatLon | null;
  destination: LatLon | null;
  /** 端末ヘディング（真北基準, 度）。現在地マーカーの向き表示に使う。 */
  heading: number | null;
}

// スタイル読込後、ブランド配色へ寄せる（"完全に再スタイル"の第一歩）。
function restyleToBrand(map: maplibregl.Map) {
  const style = map.getStyle();
  if (!style?.layers) return;
  for (const layer of style.layers) {
    const id = layer.id;
    try {
      if (layer.type === 'background') {
        map.setPaintProperty(id, 'background-color', BRAND.surface);
      } else if (/water|ocean|sea|river|lake/i.test(id)) {
        if (layer.type === 'fill') map.setPaintProperty(id, 'fill-color', BRAND.water);
        if (layer.type === 'line') map.setPaintProperty(id, 'line-color', BRAND.water);
      } else if (layer.type === 'fill' && /land|earth|background/i.test(id)) {
        map.setPaintProperty(id, 'fill-color', BRAND.surface);
      } else if (layer.type === 'symbol') {
        map.setPaintProperty(id, 'text-color', BRAND.muted);
        map.setPaintProperty(id, 'text-halo-color', BRAND.surface);
      }
    } catch {
      // レイヤーによっては該当プロパティが無い → 無視
    }
  }
}

function meElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'map-me';
  el.innerHTML = `
    <span class="map-me__wedge"></span>
    <span class="map-me__dot"></span>
  `;
  return el;
}

function destElement(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'map-dest';
  return el;
}

export function MiniMap({ me, destination, heading }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const meMarker = useRef<maplibregl.Marker | null>(null);
  const destMarker = useRef<maplibregl.Marker | null>(null);
  const wedgeRef = useRef<HTMLElement | null>(null);
  const readyRef = useRef(false);
  const framedRef = useRef(false);

  // 初期化（1回）
  useEffect(() => {
    if (!containerRef.current || !hasMapTiler()) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyleUrl(),
      center: me ? [me.lon, me.lat] : [139.767, 35.681],
      zoom: 13,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      'bottom-left'
    );
    mapRef.current = map;

    map.on('load', () => {
      restyleToBrand(map);
      readyRef.current = true;
      // 目的地への直線
      map.addSource('link', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      });
      map.addLayer({
        id: 'link',
        type: 'line',
        source: 'link',
        paint: {
          'line-color': BRAND.accent,
          'line-width': 2,
          'line-dasharray': [2, 2],
          'line-opacity': 0.7,
        },
      });
      sync();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
      framedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // マーカー・線・フレーミングの同期
  const sync = () => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    // 現在地マーカー
    if (me) {
      if (!meMarker.current) {
        const el = meElement();
        wedgeRef.current = el.querySelector('.map-me__wedge');
        meMarker.current = new maplibregl.Marker({ element: el })
          .setLngLat([me.lon, me.lat])
          .addTo(map);
      } else {
        meMarker.current.setLngLat([me.lon, me.lat]);
      }
    }

    // 目的地マーカー
    if (destination) {
      if (!destMarker.current) {
        destMarker.current = new maplibregl.Marker({ element: destElement(), anchor: 'bottom' })
          .setLngLat([destination.lon, destination.lat])
          .addTo(map);
      } else {
        destMarker.current.setLngLat([destination.lon, destination.lat]);
      }
    } else if (destMarker.current) {
      destMarker.current.remove();
      destMarker.current = null;
    }

    // 直線
    const link = map.getSource('link') as maplibregl.GeoJSONSource | undefined;
    if (link) {
      const coords = me && destination
        ? [[me.lon, me.lat], [destination.lon, destination.lat]]
        : [];
      link.setData({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} });
    }

    // 初回のみ両点にフレーミング
    if (!framedRef.current && me && destination) {
      const b = new maplibregl.LngLatBounds(
        [me.lon, me.lat],
        [me.lon, me.lat]
      );
      b.extend([destination.lon, destination.lat]);
      map.fitBounds(b, { padding: 56, maxZoom: 15, duration: 600 });
      framedRef.current = true;
    } else if (!framedRef.current && me) {
      map.easeTo({ center: [me.lon, me.lat], zoom: 14, duration: 400 });
    }
  };

  // 位置・目的地が変わったら同期
  useEffect(() => {
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.lat, me?.lon, destination?.lat, destination?.lon]);

  // 目的地が変わったら再フレーミングを許可
  useEffect(() => {
    framedRef.current = false;
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination?.lat, destination?.lon]);

  // ヘディングでウェッジを回転
  useEffect(() => {
    if (wedgeRef.current && heading != null) {
      wedgeRef.current.style.transform = `translate(-50%, -100%) rotate(${heading}deg)`;
    }
  }, [heading]);

  if (!hasMapTiler()) {
    return <div className="minimap minimap--empty" />;
  }
  return <div className="minimap" ref={containerRef} />;
}
