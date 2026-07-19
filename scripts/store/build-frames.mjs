// App Store 用マーケティングフレームの生成（朱雀パレット）
// 440×956 の論理サイズで組み、Chrome の 3x レンダリングで 1320×2868 に出力する。
//
// 構成は「方位盤」。朱雀はコンパスなので、掲載画も計器の面立てにしている。
//  - 上端に方位読み（実際の方位角と方位名）と、方位テープ（目盛り＋現在位置）
//  - 画面を貫く細い方位線。その角度は本当にその目的地への方位
//  - 端末は中央に置かず、左右へ振ってわずかに傾ける
// 方位角は撮影ハーネスと同じ座標から算出した実数値。コンパスのアプリで
// 架空の数値を載せるわけにはいかないため。
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = process.argv[2];
const SHOTS = process.argv[3];
mkdirSync(OUT, { recursive: true });

// 朱雀のデザインシステム
const C = {
  ink: '#181311',
  surface: '#FCFBF8',
  accent: '#9F3327',
  muted: '#8A817C',
  sand: '#F4EFE7',
  sand2: '#EBE4D9',
};

// 背景ごとの配色（文字色・ハイライトの地と字）
const THEMES = {
  ink:    { bg: C.ink,    fg: C.surface, hlBg: C.accent,  hlFg: C.surface },
  sand:   { bg: C.sand,   fg: C.ink,     hlBg: C.accent,  hlFg: C.surface },
  accent: { bg: C.accent, fg: C.surface, hlBg: C.surface, hlFg: C.accent  },
  sand2:  { bg: C.sand2,  fg: C.ink,     hlBg: C.accent,  hlFg: C.surface },
};

// 5枚の構成: 濃→淡→朱→淡→濃 でリズムを作る。
// 文字位置は上/下、端末は右/左で交互に振る。
// bearing は撮影地点（渋谷 35.6595,139.7005）から各目的地への実方位。
const FRAMES = [
  { id: '01-direction', shot: 'compass', theme: 'ink',    layout: 'top',    side: 'right', bearing: 91,  pt: { ja: '東', en: 'E' } },
  { id: '02-find',      shot: 'sights',  theme: 'sand',   layout: 'bottom', side: 'left',  bearing: 169, pt: { ja: '南', en: 'S' } },
  { id: '03-aligned',   shot: 'aligned', theme: 'accent', layout: 'top',    side: 'left',  bearing: 357, pt: { ja: '北', en: 'N' } },
  { id: '04-glance',    shot: 'glance',  theme: 'sand2',  layout: 'bottom', side: 'right', bearing: 339, pt: { ja: '北北西', en: 'NNW' } },
  { id: '05-arrive',    shot: 'arrived', theme: 'ink',    layout: 'top',    side: 'right', bearing: 31,  pt: { ja: '北北東', en: 'NNE' } },
];

// 方位テープの目盛りに振る文字
const CARDINALS = {
  ja: ['北', '東', '南', '西', '北'],
  en: ['N', 'E', 'S', 'W', 'N'],
};

// ** ** で囲んだ部分がハイライト。行は配列で渡す。
const COPY = {
  ja: {
    '01-direction': { h: ['**方角**だけで、', '街は歩ける。'],
      s: '地図を読まなくていい。目的地への方向と距離だけ。' },
    '02-find': { h: ['名所は、', '**近い順に**。'],
      s: '観光スポットも寺社も、カテゴリからすぐ。駅や店は名前でも探せます。' },
    '03-aligned': { h: ['合っていれば、', '**この方向です**。'],
      s: '針が赤くなり、手のひらにも合図します。' },
    '04-glance': { h: ['**針と距離**、', 'それだけ。'],
      s: 'いちばん静かな表示。ひと目見て、しまえます。' },
    '05-arrive': { h: ['着いたら、', '**そっと知らせる**。'],
      s: '目的地を決めれば、あとはオフラインでも動きます。' },
  },
  en: {
    '01-direction': { h: ['Only the **direction**.', 'Nothing more.'],
      s: 'No map to read — just the way to go and how far.' },
    '02-find': { h: ['The sights,', '**nearest first**.'],
      s: 'Browse sights and temples by category — or search any station by name.' },
    '03-aligned': { h: ['When it lines up,', '**you’ll know**.'],
      s: 'The needle turns red — and your palm feels it.' },
    '04-glance': { h: ['A needle and', 'a **distance**.'],
      s: 'The quietest view. Glance at it, then put it away.' },
    '05-arrive': { h: ['A quiet nudge', '**when you arrive**.'],
      s: 'Pick a destination — it keeps working offline.' },
  },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const mark = (line) =>
  esc(line).replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>');

/** 端末モックアップ（ステータスバーとダイナミックアイランドを重ねる） */
function phone(shotPath, cls) {
  return `
  <div class="phone ${cls}">
    <div class="screen">
      <img src="${shotPath}">
      <div class="island"></div>
      <div class="sbar"><span>9:41</span>
        <span class="r"><span class="bars"><i></i><i></i><i></i><i></i></span>
        <svg class="wifi" viewBox="0 0 20 14" fill="none" stroke="currentColor"
             stroke-width="2.1" stroke-linecap="round">
          <path d="M2.6 5.1a11 11 0 0 1 14.8 0"/><path d="M5.9 8.3a6.5 6.5 0 0 1 8.2 0"/>
          <circle cx="10" cy="11.7" r="1.15" fill="currentColor" stroke="none"/>
        </svg><span class="batt"></span></span>
      </div>
    </div>
  </div>`;
}

function html({ shotPath, theme, layout, side, bearing, point, h, s, lang }) {
  const t = THEMES[theme];
  // 日本語と英語で最適な字送りが違うので少しだけ変える
  const headFont = lang === 'ja' ? 33 : 34;
  const headTrack = lang === 'ja' ? '.005em' : '-.015em';
  const family = lang === 'ja'
    ? `'Hiragino Sans','Hiragino Kaku Gothic ProN',-apple-system,sans-serif`
    : `-apple-system,'SF Pro Text','Helvetica Neue',sans-serif`;
  const mono = `'SF Mono','Menlo',ui-monospace,monospace`;

  const deg = String(Math.round(bearing)).padStart(3, '0');
  // 方位線は上向きを 0 度として時計回り。要素は既定で下向きに伸びるため 180 度ずらす。
  const axis = (bearing + 180) % 360;
  const cards = CARDINALS[lang]
    .map((c, i) => `<span style="left:${i * 25}%">${c}</span>`)
    .join('');

  return `<!doctype html><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:440px;height:956px;overflow:hidden}
  body{background:${t.bg};color:${t.fg};font-family:${family};position:relative}

  /* 画面を貫く方位線。実際の方位角で引いている。 */
  /* 起点から先へ向かって薄れさせ、ただの罫線ではなく「向き」に見せる */
  .axis{position:absolute;left:50%;top:50%;width:1px;height:1400px;
        background:linear-gradient(to bottom,currentColor,transparent 66%);
        opacity:.22;transform-origin:top center;
        transform:rotate(${axis}deg)}
  .axis::before{content:"";position:absolute;top:-3px;left:-2.5px;
                width:6px;height:6px;border-radius:50%;
                background:currentColor;opacity:.55}

  /* 計器ヘッダ：方位読み＋方位テープ */
  .inst{position:relative;padding:52px 40px 0;z-index:2}
  .read{display:flex;align-items:baseline;justify-content:space-between}
  .deg{font:300 40px/1 ${mono};letter-spacing:.02em;font-variant-numeric:tabular-nums}
  .pt{font-size:14px;font-weight:600;letter-spacing:.16em;opacity:.75}
  .tape{position:relative;margin-top:18px;height:9px;
        background:repeating-linear-gradient(to right,
          currentColor 0 1px, transparent 1px 11px);
        opacity:.3}
  .tape .mk{position:absolute;top:-5px;width:2px;height:19px;
            background:${t.hlBg};opacity:1}
  .cards{position:relative;height:16px;margin-top:7px;
         font-size:10px;letter-spacing:.14em;opacity:.45}
  .cards span{position:absolute;transform:translateX(-50%)}
  .rule{margin-top:2px;height:1px;background:currentColor;opacity:.18}

  /* 見出し */
  .copy{position:relative;z-index:2;padding:0 40px}
  .copy.top{padding-top:38px}
  .copy.bottom{margin-top:auto;padding-bottom:78px}
  h1{font-size:${headFont}px;line-height:1.46;font-weight:700;
     letter-spacing:${headTrack};white-space:nowrap}
  .hl{background:${t.hlBg};color:${t.hlFg};
      padding:.06em .3em;border-radius:5px;
      box-decoration-break:clone;-webkit-box-decoration-break:clone}
  .sub{margin-top:16px;font-size:13.5px;line-height:1.62;font-weight:500;
       opacity:.66;letter-spacing:.01em}

  /* 端末：中央に置かず左右へ振り、わずかに傾ける */
  .stage{position:relative;flex:1;display:flex;z-index:1}
  .phone{position:relative;flex:0 0 auto;
         border-radius:44px;background:#0B0A09;padding:5px;
         box-shadow:0 26px 54px rgba(0,0,0,.30), 0 3px 10px rgba(0,0,0,.18)}
  .phone.bleed{width:352px;margin-top:auto;margin-bottom:-232px}
  .phone.full{width:258px;margin-top:22px}
  .phone.right{margin-left:auto;margin-right:26px;transform:rotate(1.6deg)}
  .phone.left{margin-right:auto;margin-left:26px;transform:rotate(-1.6deg)}
  .screen{position:relative;border-radius:39px;overflow:hidden;
          aspect-ratio:1320/2868;background:${C.surface};
          container-type:inline-size}
  .screen img{width:100%;display:block}

  /* ステータスバーとダイナミックアイランド */
  .island{position:absolute;top:2.35%;left:50%;transform:translateX(-50%);
          width:31%;height:2.6%;background:#000;border-radius:99px}
  .sbar{position:absolute;top:2.3%;left:0;right:0;height:3%;
        display:flex;align-items:center;justify-content:space-between;
        padding:0 8.5%;color:${C.ink};
        font:600 3.4cqw/1 -apple-system,sans-serif}
  .sbar .r{display:flex;align-items:center;gap:4.5%}
  .bars{display:flex;align-items:flex-end;gap:1.2px;height:3.2cqw}
  .bars i{width:1.05cqw;background:currentColor;border-radius:.4cqw}
  .bars i:nth-child(1){height:38%}.bars i:nth-child(2){height:58%}
  .bars i:nth-child(3){height:79%}.bars i:nth-child(4){height:100%}
  .batt{width:6.6cqw;height:3.2cqw;border:.42cqw solid currentColor;
        border-radius:1cqw;position:relative;opacity:.95}
  .batt::after{content:"";position:absolute;inset:.5cqw;background:currentColor;border-radius:.4cqw}
  .batt::before{content:"";position:absolute;right:-1.1cqw;top:32%;bottom:32%;
                width:.7cqw;background:currentColor;border-radius:0 1cqw 1cqw 0;opacity:.5}
  .wifi{width:4.8cqw;height:3.5cqw;display:block}

  .frame{display:flex;flex-direction:column;height:100%}
</style>
<body>
<div class="axis"></div>
<div class="frame">
  <div class="inst">
    <div class="read"><span class="deg">${deg}°</span><span class="pt">${esc(point)}</span></div>
    <div class="tape"><div class="mk" style="left:${(bearing / 360) * 100}%"></div></div>
    <div class="cards">${cards}</div>
    <div class="rule"></div>
  </div>
${layout === 'top' ? `
  <div class="copy top">
    <h1>${h.map(mark).join('<br>')}</h1>
    <p class="sub">${esc(s)}</p>
  </div>
  <div class="stage">${phone(shotPath, `bleed ${side}`)}</div>
` : `
  <div class="stage">${phone(shotPath, `full ${side}`)}</div>
  <div class="copy bottom">
    <h1>${h.map(mark).join('<br>')}</h1>
    <p class="sub">${esc(s)}</p>
  </div>
`}
</div>
</body>`;
}

for (const lang of ['ja', 'en']) {
  for (const f of FRAMES) {
    const c = COPY[lang][f.id];
    const shotPath = resolve(SHOTS, `${lang}-${f.shot}.png`);
    const out = resolve(OUT, `${lang}-${f.id}.html`);
    writeFileSync(out, html({
      shotPath: 'file://' + shotPath,
      theme: f.theme, layout: f.layout, side: f.side,
      bearing: f.bearing, point: f.pt[lang],
      h: c.h, s: c.s, lang,
    }));
  }
}
console.log(`generated ${FRAMES.length * 2} frame files in ${OUT}`);
