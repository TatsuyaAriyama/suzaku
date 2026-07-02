import { create } from 'zustand';
import { headingSource, type PermissionState } from '../lib/heading';
import { CircularOneEuro } from '../lib/smoothing';
import { declinationAt } from '../lib/declination';
import type { LatLon } from '../lib/geo';

interface HeadingState {
  /** 生の磁北基準ヘディング。 */
  rawMagnetic: number | null;
  /** 平滑化後の磁北基準ヘディング。 */
  smoothedMagnetic: number | null;
  /** 現在地に基づく偏角（度、東偏が正）。 */
  declination: number;
  lowAccuracy: boolean;
  permission: PermissionState;
  subscribed: boolean;
  request: () => Promise<PermissionState>;
  start: () => void;
  stop: () => void;
  updateDeclination: (at: LatLon) => void;
}

// 1€ フィルタ: 静止時はジッターを殺し、身体の回転には即応する（固定αのEMAより
// 「針が世界に張り付いている」感触に近づく）。
const smoother = new CircularOneEuro();
let unsub: (() => void) | null = null;

// 静止時のサブ度数の揺れで React を毎イベント再レンダーしないための閾値。
const EMIT_EPSILON_DEG = 0.05;

export const useHeading = create<HeadingState>((set, get) => ({
  rawMagnetic: null,
  smoothedMagnetic: null,
  declination: 0,
  lowAccuracy: false,
  permission: 'unknown',
  subscribed: false,

  async request() {
    const p = await headingSource.requestPermission();
    set({ permission: p });
    return p;
  },

  start() {
    if (get().subscribed) return;
    set({ subscribed: true });
    smoother.reset();
    unsub = headingSource.subscribe(({ magnetic, lowAccuracy }) => {
      const smoothed = smoother.push(magnetic);
      const prev = get();
      // 変化が閾値未満（静止中のノイズ）なら set を省き、センサーレートの再レンダーを防ぐ
      if (
        prev.smoothedMagnetic != null &&
        prev.lowAccuracy === lowAccuracy &&
        Math.abs(((smoothed - prev.smoothedMagnetic + 540) % 360) - 180) <
          EMIT_EPSILON_DEG
      ) {
        return;
      }
      set({ rawMagnetic: magnetic, smoothedMagnetic: smoothed, lowAccuracy });
    });
  },

  stop() {
    if (unsub) {
      unsub();
      unsub = null;
    }
    set({ subscribed: false });
  },

  updateDeclination(at) {
    set({ declination: declinationAt(at) });
  },
}));
