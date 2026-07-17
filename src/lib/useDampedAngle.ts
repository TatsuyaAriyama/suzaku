// 針の連続回転 + ダンピング。累積角で最短方向に追従し、
// requestAnimationFrame でクリティカルダンプ気味に補間する。

import { useEffect, useRef, useState } from 'react';
import { UnwrappedAngle } from './smoothing';

/**
 * @param target 目標角（0..360, null なら停止）
 * @param stiffness 追従の速さ（大きいほど速い）。
 *   ランプ追従の定常遅れ ≈ 2·角速度/stiffness。上流が 1€ フィルタで
 *   ジッターを処理する前提で、遅延最小のため高めが既定。
 */
export function useDampedAngle(target: number | null, stiffness = 12): number {
  const [display, setDisplay] = useState(0);
  const unwrap = useRef(new UnwrappedAngle());
  const posRef = useRef(0);
  const velRef = useRef(0);
  const targetRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);
  const snappedRef = useRef(false);
  const lastSetRef = useRef(0);
  // モーション過敏設定時は針をスイープさせず即座にスナップさせる（方向は伝える）。
  const reducedRef = useRef(false);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;
    const onChange = () => {
      reducedRef.current = mq.matches;
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const tick = (now: number) => {
      const last = lastRef.current || now;
      let dt = (now - last) / 1000;
      lastRef.current = now;
      if (dt > 0.05) dt = 0.05; // 大きな飛びを抑制

      const tgt = targetRef.current;
      if (tgt != null) {
        const goal = unwrap.current.update(tgt);
        if (!snappedRef.current) {
          // 初回はスイープせず即座に合わせる
          posRef.current = goal;
          velRef.current = 0;
          snappedRef.current = true;
          lastSetRef.current = goal;
          setDisplay(goal);
        } else if (reducedRef.current) {
          // モーション過敏設定: スイープせず目標へ即スナップ（向きは即座に伝える）
          if (Math.abs(goal - lastSetRef.current) > 0.02) {
            posRef.current = goal;
            velRef.current = 0;
            lastSetRef.current = goal;
            setDisplay(goal);
          }
        } else {
          // クリティカルダンプのばね
          const k = stiffness * stiffness;
          const c = 2 * stiffness;
          const a = k * (goal - posRef.current) - c * velRef.current;
          velRef.current += a * dt;
          posRef.current += velRef.current * dt;
          // 収束後は再レンダーしない（静止時に 60fps で描画し続けない）
          if (Math.abs(posRef.current - lastSetRef.current) > 0.02) {
            lastSetRef.current = posRef.current;
            setDisplay(posRef.current);
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stiffness]);

  return display;
}
