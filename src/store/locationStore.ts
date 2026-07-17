import { create } from 'zustand';
import {
  requestLocationPermission,
  watchLocation,
  type Fix,
  type LocationPermission,
} from '../lib/location';
import { distance } from '../lib/geo';

interface LocationState {
  fix: Fix | null;
  permission: LocationPermission;
  error: string | null;
  watching: boolean;
  request: () => Promise<LocationPermission>;
  start: () => void;
  stop: () => void;
}

const MOVE_THRESHOLD_M = 6; // 移動閾値。これ以下は無視して GPS ジッター抑制。
let unsub: (() => void) | null = null;

export const useLocation = create<LocationState>((set, get) => ({
  fix: null,
  permission: 'unknown',
  error: null,
  watching: false,

  async request() {
    const p = await requestLocationPermission();
    set({ permission: p });
    return p;
  },

  start() {
    if (get().watching) return;
    set({ watching: true, error: null });
    unsub = watchLocation(
      (f) => {
        const prev = get().fix;
        // 移動閾値ベース: 精度が同等以上に良く、動きが小さいときは据え置き。
        // prev.accuracy が 0（＝精度不明のフォールバック値）のときは据え置かない。
        // さもないと accuracy が常に 0 の環境で最初の1点以降ずっと更新されず、
        // 偏角(declination)も再計算されなくなる。
        if (
          prev &&
          distance(prev, f) < MOVE_THRESHOLD_M &&
          prev.accuracy > 0 &&
          f.accuracy >= prev.accuracy
        ) {
          return;
        }
        set({ fix: f, permission: 'granted', error: null });
      },
      (msg) => set({ error: msg })
    );
  },

  stop() {
    if (unsub) {
      unsub();
      unsub = null;
    }
    set({ watching: false });
  },
}));
