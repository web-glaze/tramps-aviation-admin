import { PaletteMode } from '@mui/material';

// ─────────────────────────────────────────────────────────────────────────────
// Tramps Aviation — brand palette
//
// Colours are sampled directly from `public/logo.svg` so the UI matches the
// logo exactly. Every consumer should pull from `theme.palette` first; only
// reach for the raw hex values via the exported `brand` object when MUI
// can't express what you need (e.g. a chart series, a custom gradient).
//
//   PRIMARY  (#209ACD blue)   — 80% of the surface: AppBar, sidebar, links,
//                              primary buttons, headings, focus rings.
//   SECONDARY(#CF4D26 orange) — 20% accent: CTAs, highlight chips, save
//                              buttons, key callouts, charts.
//
// "Use ~20% orange" was an explicit ask, so warning toasts also lean on the
// orange family rather than gold (gold + orange in the same view starts to
// look muddy).
// ─────────────────────────────────────────────────────────────────────────────

// Blue ramp built around the logo blue #209ACD (index 5 = brand main).
// Shades 0-4 are tints (mix with white), 6-9 are shades (mix with black).
const blue = [
  '#e8f6fc', // 0 — tint, page-section background
  '#c4e7f5', // 1 — tint, alert/info background
  '#9cd6ee', // 2 — light, primary.light
  '#6dc1e3', // 3 — light, hover surfaces
  '#3eaad7', // 4 — mid
  '#209ACD', // 5 — primary.main  (LOGO BLUE)
  '#1c83af', // 6 —
  '#176c91', // 7 — primary.dark
  '#125573', // 8 —
  '#0d3e54', // 9 — darkest, headings on light
];

// Orange ramp built around the logo orange #CF4D26 (index 5 = brand main).
const orange = [
  '#fdece6', // 0 — tint, soft surfaces
  '#fbcfc0', // 1 — tint
  '#f7ad94', // 2 — secondary.light
  '#f3886a', // 3 —
  '#e26a45', // 4 —
  '#CF4D26', // 5 — secondary.main (LOGO ORANGE)
  '#b04020', // 6 —
  '#92341a', // 7 — secondary.dark
  '#732915', // 8 —
  '#551e10', // 9 — darkest
];

// Supporting ramps (Ant Design conventions, kept untouched for non-brand UI)
const red   = ['#fff1f0','#ffccc7','#ffa39e','#ff7875','#ff4d4f','#f5222d','#cf1322','#a8071a','#820014','#5c0011'];
const cyan  = ['#e6fffb','#b5f5ec','#87e8de','#5cdbd3','#36cfc9','#13c2c2','#08979c','#006d75','#00474f','#002329'];
const green = ['#f6ffed','#d9f7be','#b7eb8f','#95de64','#73d13d','#52c41a','#389e0d','#237804','#135200','#092b00'];
const gold  = ['#fffbe6','#fff1b8','#ffe58f','#ffd666','#ffc53d','#faad14','#d48806','#ad6800','#874d00','#613400'];

const grey = {
  0:  '#ffffff',
  1:  '#fafafa',
  2:  '#f5f5f5',
  3:  '#f0f0f0',
  4:  '#d9d9d9',
  5:  '#bfbfbf',
  6:  '#8c8c8c',
  7:  '#595959',
  8:  '#262626',
  9:  '#141414',
  10: '#000000',
} as Record<number, string>;

const Palette = (mode: PaletteMode) => ({
  mode,
  common: { black: '#000', white: '#fff' },

  // Blue is the dominant brand colour (~80% of UI)
  primary: {
    lighter:      blue[0],    // #e8f6fc — pale blue tint for soft surfaces
    light:        blue[2],    // #9cd6ee
    main:         blue[5],    // #209ACD ← LOGO BLUE
    dark:         blue[7],    // #176c91
    contrastText: '#fff',
  },

  // Orange is the accent (~20% of UI)
  secondary: {
    lighter:      orange[0],  // #fdece6 — pale orange tint for soft surfaces
    light:        orange[2],  // #f7ad94
    main:         orange[5],  // #CF4D26 ← LOGO ORANGE
    dark:         orange[7],  // #92341a
    contrastText: '#fff',
  },

  error:   { lighter: red[0],    light: red[2],    main: red[5],    dark: red[7],    contrastText: '#fff' }, // pale red
  warning: { lighter: orange[0], light: orange[2], main: orange[5], dark: orange[7], contrastText: '#fff' }, // brand orange
  info:    { lighter: blue[0],   light: blue[2],   main: blue[5],   dark: blue[7],   contrastText: '#fff' }, // brand blue
  success: { lighter: green[0],  light: green[3],  main: green[5],  dark: green[7],  contrastText: '#fff' }, // pale green
  grey,
  text: {
    primary:   grey[8],   // darker, more readable
    secondary: grey[6],
    disabled:  grey[5],
  },
  action:     { disabled: grey[4] },
  divider:    grey[3],
  background: { paper: grey[0], default: grey[1] },
});

// ─────────────────────────────────────────────────────────────────────────────
// Brand exports — use these in components when you need raw colour values
// instead of MUI theme tokens (charts, gradients, hardcoded SVG fills).
//
//   import { BRAND } from '../themes/palette';
//   sx={{ background: BRAND.GRADIENT_BLUE }}
//   stroke={BRAND.ORANGE}
// ─────────────────────────────────────────────────────────────────────────────
export const BRAND = {
  BLUE:           '#209ACD',
  BLUE_DARK:      '#176c91',
  BLUE_LIGHT:     '#9cd6ee',
  BLUE_TINT:      '#e8f6fc',

  ORANGE:         '#CF4D26',
  ORANGE_DARK:    '#92341a',
  ORANGE_LIGHT:   '#f7ad94',
  ORANGE_TINT:    '#fdece6',

  CREAM:          '#F6F7F1',
  PALE_CYAN:      '#DDF6FA',

  GRADIENT_BLUE:   'linear-gradient(135deg, #209ACD 0%, #176c91 100%)',
  GRADIENT_ORANGE: 'linear-gradient(135deg, #CF4D26 0%, #92341a 100%)',
  GRADIENT_BRAND:  'linear-gradient(135deg, #209ACD 0%, #CF4D26 100%)',
  GRADIENT_SOFT:   'linear-gradient(135deg, #e8f6fc 0%, #fdece6 100%)',
} as const;

// Re-exported colour ramps so individual components can grab specific shades
export const brand = { blue, orange, gold, red, cyan, green };

export default Palette;
