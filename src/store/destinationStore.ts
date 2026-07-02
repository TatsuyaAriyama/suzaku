import { create } from 'zustand';
import { KEYS, loadJSON, saveJSON } from '../lib/storage';
import type { Place } from '../lib/geocoding';

export interface Destination {
  name: string;
  lat: number;
  lon: number;
}

interface DestinationState {
  current: Destination | null;
  history: Destination[];
  favorites: Destination[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setDestination: (d: Destination | Place) => void;
  toggleFavorite: (d: Destination | Place) => void;
  clear: () => void;
}

const HISTORY_MAX = 8;
const FAVORITES_MAX = 20;

function toDest(d: Destination | Place): Destination {
  return { name: d.name, lat: d.lat, lon: d.lon };
}

/** 同一地点判定（緯度経度がほぼ一致）。 */
export function sameSpot(a: Destination, b: Destination): boolean {
  return Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lon - b.lon) < 1e-6;
}

export const useDestination = create<DestinationState>((set, get) => ({
  current: null,
  history: [],
  favorites: [],
  hydrated: false,

  async hydrate() {
    const [current, history, favorites] = await Promise.all([
      loadJSON<Destination | null>(KEYS.destination, null),
      loadJSON<Destination[]>(KEYS.history, []),
      loadJSON<Destination[]>(KEYS.favorites, []),
    ]);
    set({ current, history, favorites, hydrated: true });
  },

  setDestination(input) {
    const d = toDest(input);
    const history = [d, ...get().history.filter((h) => !sameSpot(h, d))].slice(
      0,
      HISTORY_MAX
    );
    set({ current: d, history });
    void saveJSON(KEYS.destination, d);
    void saveJSON(KEYS.history, history);
  },

  toggleFavorite(input) {
    const d = toDest(input);
    const existing = get().favorites;
    const isFav = existing.some((f) => sameSpot(f, d));
    const favorites = isFav
      ? existing.filter((f) => !sameSpot(f, d))
      : [d, ...existing].slice(0, FAVORITES_MAX);
    set({ favorites });
    void saveJSON(KEYS.favorites, favorites);
  },

  clear() {
    set({ current: null });
    void saveJSON(KEYS.destination, null);
  },
}));
