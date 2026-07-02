// アイコン/スプラッシュの SVG から PNG を生成する。
//   - resources/*.png  … 元画像の控え
//   - assets/*.png     … @capacitor/assets（capacitor-assets generate）の入力
//   - store/AppStore-marketing-icon-1024.png … App Store Connect 用（不透明・アルファ無し）
//
// 使い方:  npm run assets:prepare
//   その後、iOS/Android を追加してから  npm run assets:generate  でネイティブへ反映。
//
// sharp は @capacitor/assets の依存として入るため追加インストール不要。

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const BG = '#FCFBF8'; // ブランドのオフホワイト

mkdirSync('assets', { recursive: true });
mkdirSync('store', { recursive: true });

async function rasterize(src, out, size, { flatten = false } = {}) {
  let img = sharp(src, { density: 384 }).resize(size, size);
  if (flatten) img = img.flatten({ background: BG }).removeAlpha();
  await img.png().toFile(out);
  console.log('wrote', out, `${size}x${size}`);
}

// 元画像の控え
await rasterize('resources/icon.svg', 'resources/icon.png', 1024);
await rasterize('resources/splash.svg', 'resources/splash.png', 2732);
await rasterize('resources/splash.svg', 'resources/splash-dark.png', 2732);

// capacitor-assets の入力（単一ロゴ + スプラッシュ）
await rasterize('resources/icon.svg', 'assets/logo.png', 1024);
await rasterize('resources/splash.svg', 'assets/splash.png', 2732);
await rasterize('resources/splash.svg', 'assets/splash-dark.png', 2732);

// App Store Connect 用マーケティングアイコン（1024・アルファ無しが必須）
await rasterize('resources/icon.svg', 'store/AppStore-marketing-icon-1024.png', 1024, {
  flatten: true,
});

console.log('done.');
