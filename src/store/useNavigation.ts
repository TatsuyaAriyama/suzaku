// 派生値のセレクタ。bearing / distance / needle / offset / isAligned / hasArrived。

import { useRef } from 'react';
import { useLocation } from './locationStore';
import { useHeading } from './headingStore';
import { useDestination } from './destinationStore';
import { useSettings } from './settingsStore';
import { bearing, distance, angleDelta, normalize360, type LatLon } from '../lib/geo';

// 整列はヒステリシス付き: ±10° で入り、±15° を超えるまで出ない。
// 境界での明滅とハプティクス連打を防ぐ。
export const ALIGN_ENTER_DEG = 10;
export const ALIGN_EXIT_DEG = 15;
// 到着もヒステリシス付き: 35m 以内で入り、45m を超えるまで出ない。
// GPS ジッターで境界を跨いで到着表示が明滅し、到着ハプティクスが連打するのを防ぐ。
export const ARRIVE_THRESHOLD_M = 35;
export const ARRIVE_EXIT_M = 45;

export interface NavDerived {
  hasDestination: boolean;
  hasFix: boolean;
  bearingTrue: number | null; // 目的地への真北基準方位
  distanceM: number | null;
  /** 針の回転角（度）。0 = 正面（目的地方向が真上）。時計回り正。 */
  needle: number | null;
  /** 目的地方向との符号付きズレ（−180..180°）。正 = 右に回れば合う。 */
  offsetDeg: number | null;
  isAligned: boolean;
  hasArrived: boolean;
}

export function useNavigation(): NavDerived {
  const fix = useLocation((s) => s.fix);
  const dest = useDestination((s) => s.current);
  const smoothedMagnetic = useHeading((s) => s.smoothedMagnetic);
  const declination = useHeading((s) => s.declination);
  const northRef = useSettings((s) => s.northRef);
  const alignedRef = useRef(false);
  const arrivedRef = useRef(false);

  const hasDestination = Boolean(dest);
  const hasFix = Boolean(fix);

  if (!fix || !dest) {
    alignedRef.current = false;
    arrivedRef.current = false;
    return {
      hasDestination,
      hasFix,
      bearingTrue: null,
      distanceM: null,
      needle: null,
      offsetDeg: null,
      isAligned: false,
      hasArrived: false,
    };
  }

  const from: LatLon = fix;
  const bearingTrue = bearing(from, dest);
  const distanceM = distance(from, dest);
  const hasArrived = arrivedRef.current
    ? distanceM <= ARRIVE_EXIT_M
    : distanceM <= ARRIVE_THRESHOLD_M;
  arrivedRef.current = hasArrived;

  let needle: number | null = null;
  let offsetDeg: number | null = null;
  let isAligned = false;

  if (smoothedMagnetic != null) {
    // 端末ヘディングを設定に合わせた基準へ。
    // magnetic を真北基準へ: trueHeading = magnetic + declination
    const headingTrue = normalize360(smoothedMagnetic + declination);
    // 目的地方位も基準を揃える。
    const targetBearing =
      northRef === 'true' ? bearingTrue : normalize360(bearingTrue - declination);
    const deviceHeading = northRef === 'true' ? headingTrue : smoothedMagnetic;

    // 針 = (目的地方位 − 端末ヘディング) を 0..360 に。
    const raw = normalize360(targetBearing - deviceHeading);
    needle = raw;
    offsetDeg = angleDelta(raw, 0);
    const abs = Math.abs(offsetDeg);
    isAligned = alignedRef.current ? abs <= ALIGN_EXIT_DEG : abs <= ALIGN_ENTER_DEG;
    alignedRef.current = isAligned;
  } else {
    alignedRef.current = false;
  }

  return {
    hasDestination,
    hasFix,
    bearingTrue,
    distanceM,
    needle,
    offsetDeg,
    isAligned,
    hasArrived,
  };
}
