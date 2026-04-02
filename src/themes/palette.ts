import { PaletteMode } from '@mui/material';

const blue  = ['#e6f4ff','#bae0ff','#91caff','#69b1ff','#4096ff','#1677ff','#0958d9','#003eb3','#002c8c','#001d66'];
const gold  = ['#fffbe6','#fff1b8','#ffe58f','#ffd666','#ffc53d','#faad14','#d48806','#ad6800','#874d00','#613400'];
const red   = ['#fff1f0','#ffccc7','#ffa39e','#ff7875','#ff4d4f','#f5222d','#cf1322','#a8071a','#820014','#5c0011'];
const cyan  = ['#e6fffb','#b5f5ec','#87e8de','#5cdbd3','#36cfc9','#13c2c2','#08979c','#006d75','#00474f','#002329'];
const green = ['#f6ffed','#d9f7be','#b7eb8f','#95de64','#73d13d','#52c41a','#389e0d','#237804','#135200','#092b00'];

// Fixed: explicit named grey values instead of merged array with unpredictable indices
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
  primary: {
    light:        blue[2],
    main:         blue[5],
    dark:         blue[7],
    contrastText: '#fff',
  },
  secondary: {
    light:        gold[3],
    main:         gold[5],
    dark:         gold[7],
    contrastText: '#fff',
  },
  error:   { light: red[2],   main: red[5],   dark: red[7],   contrastText: '#fff' },
  warning: { light: gold[3],  main: gold[5],  dark: gold[7],  contrastText: '#fff' },
  info:    { light: cyan[3],  main: cyan[5],  dark: cyan[7],  contrastText: '#fff' },
  success: { light: green[3], main: green[5], dark: green[7], contrastText: '#fff' },
  grey,
  text: {
    primary:   grey[7],
    secondary: grey[6],
    disabled:  grey[5],
  },
  action:     { disabled: grey[4] },
  divider:    grey[3],
  background: { paper: grey[0], default: grey[1] },
});

export default Palette;