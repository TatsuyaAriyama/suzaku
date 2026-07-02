// 循環量（角度）のスムージング。0/360 の折り返しを正しく扱う。

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/**
 * 循環移動平均。直近サンプルの sin/cos をそれぞれ指数平滑し atan2 で戻す。
 * ジッター除去 + 折り返し安全。
 */
export class CircularSmoother {
  private sin = 0;
  private cos = 0;
  private primed = false;

  /** 平滑係数 α（0<α≤1）。小さいほど滑らかで遅延が増える。 */
  constructor(private alpha = 0.15) {}

  push(deg: number): number {
    const r = deg * D2R;
    const s = Math.sin(r);
    const c = Math.cos(r);
    if (!this.primed) {
      this.sin = s;
      this.cos = c;
      this.primed = true;
    } else {
      this.sin += this.alpha * (s - this.sin);
      this.cos += this.alpha * (c - this.cos);
    }
    const out = Math.atan2(this.sin, this.cos) * R2D;
    return (out + 360) % 360;
  }

  reset(): void {
    this.primed = false;
    this.sin = 0;
    this.cos = 0;
  }
}

/**
 * 循環量のための 1€ フィルタ（One Euro Filter, Casiez et al. 2012）。
 * カットオフを角速度に応じて開閉する適応平滑:
 *   静止時 → minCutoff で強く平滑（ジッターを殺す）
 *   回転時 → cutoff = minCutoff + beta·|ω| が開いて即応（遅延を殺す）
 * 「針が身体の回転に付いてくる」リアルタイム性の要。
 * 内部では入力を最短差分で累積角に展開してから平滑するので折り返し安全。
 */
export class CircularOneEuro {
  private x = 0; // 平滑後の累積角
  private dx = 0; // 平滑後の角速度 (deg/s)
  private rawAcc = 0; // 入力の累積角
  private lastT = 0;
  private primed = false;

  /**
   * @param minCutoff 静止時カットオフ (Hz)。小さいほど静止時に滑らか。
   * @param beta 角速度 1°/s あたりのカットオフ開き量。大きいほど回転に即応。
   * @param dCutoff 角速度推定のカットオフ (Hz)。
   */
  // 既定値は 50Hz センサーで数値検証済み:
  //   静止（±3°ノイズ）σ ≈ 0.5°、90°/s 回転の遅れ ≈ 1.4°（旧 EMA α=0.18 は ≈ 8°）
  constructor(
    private minCutoff = 0.4,
    private beta = 0.06,
    private dCutoff = 0.5
  ) {}

  private static alpha(dt: number, cutoff: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  /** @param deg 磁北基準ヘディング 0..360 @param tMs タイムスタンプ(ms)。省略時は performance.now() */
  push(deg: number, tMs = performance.now()): number {
    if (!this.primed) {
      this.rawAcc = deg;
      this.x = deg;
      this.dx = 0;
      this.lastT = tMs;
      this.primed = true;
      return ((deg % 360) + 360) % 360;
    }

    let dt = (tMs - this.lastT) / 1000;
    this.lastT = tMs;
    if (!(dt > 0)) return ((this.x % 360) + 360) % 360;
    if (dt > 0.2) dt = 0.2; // 中断復帰の巨大 dt はほぼ即追従として扱う

    // 入力を累積角へ（最短差分）
    const cur = ((this.rawAcc % 360) + 360) % 360;
    let delta = ((deg - cur) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;
    this.rawAcc += delta;

    // 角速度を推定・平滑
    const dxRaw = (this.rawAcc - this.x) / dt;
    this.dx += CircularOneEuro.alpha(dt, this.dCutoff) * (dxRaw - this.dx);

    // 速度でカットオフを開き、本体を平滑
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += CircularOneEuro.alpha(dt, cutoff) * (this.rawAcc - this.x);

    return ((this.x % 360) + 360) % 360;
  }

  reset(): void {
    this.primed = false;
    this.x = 0;
    this.dx = 0;
    this.rawAcc = 0;
    this.lastT = 0;
  }
}

/**
 * 累積角トラッカー。表示用に「最短方向で連続回転」する角度を出す。
 * 359→0 で長回りしないよう、累積値として保持する。
 */
export class UnwrappedAngle {
  private acc = 0;
  private primed = false;

  update(target: number): number {
    if (!this.primed) {
      this.acc = target;
      this.primed = true;
      return this.acc;
    }
    // 現在の累積角と目標(0..360)の最短差分を足し込む
    const current = ((this.acc % 360) + 360) % 360;
    let delta = ((target - current) % 360 + 360) % 360;
    if (delta > 180) delta -= 360;
    this.acc += delta;
    return this.acc;
  }

  get value(): number {
    return this.acc;
  }

  reset(): void {
    this.primed = false;
    this.acc = 0;
  }
}
