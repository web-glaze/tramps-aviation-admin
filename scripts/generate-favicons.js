/* eslint-disable no-console */
/**
 * Tramps Aviation — favicon / PWA icon generator
 *
 * Reads `public/logo.svg` and writes:
 *   public/logo192.png   (192×192, transparent bg)
 *   public/logo512.png   (512×512, transparent bg)
 *   public/favicon.ico   (32×32 + 16×16 multi-size ICO)
 *   public/apple-touch-icon.png (180×180, brand-blue rounded background)
 *
 * Run once any time logo.svg changes:
 *
 *   yarn add -D sharp png-to-ico
 *   node scripts/generate-favicons.js
 *
 * That's it — commit the regenerated PNG/ICO files and the favicon will pick
 * them up next reload. CRA serves /public/* directly so no build is required.
 */
const fs   = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const SVG_PATH   = path.join(PUBLIC_DIR, 'logo.svg');

const BRAND_BLUE = '#209ACD'; // sampled from logo.svg

async function main() {
  const sharp    = require('sharp');
  const pngToIco = require('png-to-ico');

  if (!fs.existsSync(SVG_PATH)) {
    console.error(`✖ logo.svg not found at ${SVG_PATH}`);
    process.exit(1);
  }

  const svg = fs.readFileSync(SVG_PATH);

  const writePng = async (size, outName, options = {}) => {
    const out = path.join(PUBLIC_DIR, outName);
    let pipeline = sharp(svg, { density: 384 }).resize(size, size, {
      fit: 'contain',
      background: options.background || { r: 0, g: 0, b: 0, alpha: 0 },
    });
    if (options.flatten) {
      pipeline = pipeline.flatten({ background: options.background });
    }
    await pipeline.png().toFile(out);
    console.log(`✓ ${outName}  (${size}×${size})`);
    return out;
  };

  // PWA icons — transparent background
  await writePng(192, 'logo192.png');
  await writePng(512, 'logo512.png');

  // Apple touch icon — solid brand-blue rounded square
  await writePng(180, 'apple-touch-icon.png', {
    background: BRAND_BLUE,
    flatten: true,
  });

  // favicon.ico — bundle 16/32/48 sizes
  const tmp16 = await writePng(16, '_tmp_fav16.png');
  const tmp32 = await writePng(32, '_tmp_fav32.png');
  const tmp48 = await writePng(48, '_tmp_fav48.png');

  const ico = await pngToIco([tmp16, tmp32, tmp48]);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), ico);
  console.log('✓ favicon.ico (16, 32, 48)');

  // cleanup
  [tmp16, tmp32, tmp48].forEach((p) => fs.unlinkSync(p));

  console.log('\nDone. Hard-refresh the browser tab (Ctrl+Shift+R) to see the new icons.');
}

main().catch((err) => {
  console.error(err);
  console.error(
    '\nIf the error mentions "sharp" or "png-to-ico" not found, install them first:\n' +
      '  yarn add -D sharp png-to-ico\n'
  );
  process.exit(1);
});
