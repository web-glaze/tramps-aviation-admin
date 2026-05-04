import { ReactNode, useMemo } from 'react';
import { CssBaseline, StyledEngineProvider } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Palette, { BRAND } from './palette';

export default function ThemeCustomization({ children }: { children: ReactNode }) {
  const themeInstance = useMemo(
    () =>
      createTheme({
        palette: Palette('light') as any,
        breakpoints: { values: { xs: 0, sm: 768, md: 1024, lg: 1266, xl: 1536 } },
        mixins: { toolbar: { minHeight: 60, paddingTop: 8, paddingBottom: 8 } },
        shape: { borderRadius: 8 },
        typography: {
          fontFamily: `'Inter', 'Public Sans', sans-serif`,
          h1: { fontSize: '2.25rem', fontWeight: 700, color: BRAND.BLUE_DARK, letterSpacing: '-0.02em' },
          h2: { fontSize: '1.875rem', fontWeight: 700, color: BRAND.BLUE_DARK, letterSpacing: '-0.02em' },
          h3: { fontSize: '1.5rem',   fontWeight: 700, color: BRAND.BLUE_DARK, letterSpacing: '-0.01em' },
          h4: { fontSize: '1.25rem',  fontWeight: 700, color: BRAND.BLUE_DARK },
          h5: { fontSize: '1.0625rem',fontWeight: 700, color: BRAND.BLUE_DARK },
          h6: { fontSize: '0.875rem', fontWeight: 700, color: BRAND.BLUE_DARK },
          body1: { fontSize: '0.875rem' },
          body2: { fontSize: '0.75rem' },
          // Buttons get a subtle weight bump so the brand-coloured CTAs read clearly
          button: { fontWeight: 600 },
        },
        components: {
          // ─── Buttons ────────────────────────────────────────────────────
          MuiButton: {
            styleOverrides: {
              root: {
                fontWeight: 600,
                borderRadius: 8,
                textTransform: 'none' as const,
                transition: 'all 0.18s ease',
              },
              // Primary contained button = brand blue gradient
              containedPrimary: {
                background: BRAND.GRADIENT_BLUE,
                boxShadow: `0 2px 8px rgba(32, 154, 205, 0.25)`,
                '&:hover': {
                  background: BRAND.GRADIENT_BLUE,
                  boxShadow: `0 4px 14px rgba(32, 154, 205, 0.4)`,
                  transform: 'translateY(-1px)',
                },
              },
              // Secondary contained button = brand orange (the 20% accent)
              containedSecondary: {
                background: BRAND.GRADIENT_ORANGE,
                boxShadow: `0 2px 8px rgba(207, 77, 38, 0.25)`,
                '&:hover': {
                  background: BRAND.GRADIENT_ORANGE,
                  boxShadow: `0 4px 14px rgba(207, 77, 38, 0.4)`,
                  transform: 'translateY(-1px)',
                },
              },
              outlinedPrimary: {
                borderColor: BRAND.BLUE,
                color: BRAND.BLUE,
                borderWidth: 1.5,
                '&:hover': {
                  borderColor: BRAND.BLUE_DARK,
                  background: BRAND.BLUE_TINT,
                  borderWidth: 1.5,
                },
              },
              outlinedSecondary: {
                borderColor: BRAND.ORANGE,
                color: BRAND.ORANGE,
                borderWidth: 1.5,
                '&:hover': {
                  borderColor: BRAND.ORANGE_DARK,
                  background: BRAND.ORANGE_TINT,
                  borderWidth: 1.5,
                },
              },
              textPrimary:   { color: BRAND.BLUE,   '&:hover': { background: BRAND.BLUE_TINT } },
              textSecondary: { color: BRAND.ORANGE, '&:hover': { background: BRAND.ORANGE_TINT } },
            },
          },

          // ─── Cards ──────────────────────────────────────────────────────
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                boxShadow: `0 1px 4px rgba(32, 154, 205, 0.08)`,
                border: `1px solid ${BRAND.BLUE_TINT}`,
              },
            },
          },

          MuiPaper: {
            styleOverrides: {
              elevation0: { boxShadow: 'none' },
            },
          },

          // ─── Tables ─────────────────────────────────────────────────────
          MuiTableCell: {
            styleOverrides: {
              root: { borderColor: '#f0f0f0', padding: '10px 16px' },
              head: {
                fontWeight: 700,
                backgroundColor: BRAND.BLUE_TINT,
                color: BRAND.BLUE_DARK,
                borderBottom: `2px solid ${BRAND.BLUE_LIGHT}`,
                textTransform: 'uppercase' as const,
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
              },
            },
          },

          MuiTableRow: {
            styleOverrides: {
              root: {
                '&:hover': { backgroundColor: `${BRAND.BLUE_TINT}80` },
              },
            },
          },

          // ─── Chips ──────────────────────────────────────────────────────
          MuiChip: {
            styleOverrides: {
              root: { borderRadius: 6, fontWeight: 600 },
              colorPrimary: {
                background: BRAND.BLUE_TINT,
                color: BRAND.BLUE_DARK,
                border: `1px solid ${BRAND.BLUE_LIGHT}`,
              },
              colorSecondary: {
                background: BRAND.ORANGE_TINT,
                color: BRAND.ORANGE_DARK,
                border: `1px solid ${BRAND.ORANGE_LIGHT}`,
              },
            },
          },

          // ─── Tabs ───────────────────────────────────────────────────────
          MuiTabs: {
            styleOverrides: {
              indicator: {
                background: BRAND.GRADIENT_BRAND, // blue → orange transition
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                textTransform: 'none' as const,
                fontWeight: 600,
                color: '#595959',
                '&.Mui-selected': {
                  color: BRAND.BLUE,
                  fontWeight: 700,
                },
              },
            },
          },

          // ─── Form fields — focus state uses brand blue ──────────────────
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: BRAND.BLUE_LIGHT,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: BRAND.BLUE,
                  borderWidth: 2,
                },
              },
            },
          },

          MuiInputLabel: {
            styleOverrides: {
              root: {
                '&.Mui-focused': { color: BRAND.BLUE },
              },
            },
          },

          // ─── Switch — brand orange when ON (20% accent) ─────────────────
          MuiSwitch: {
            styleOverrides: {
              switchBase: {
                '&.Mui-checked': {
                  color: BRAND.ORANGE,
                  '& + .MuiSwitch-track': {
                    backgroundColor: BRAND.ORANGE,
                    opacity: 0.6,
                  },
                },
              },
            },
          },

          // ─── Links ──────────────────────────────────────────────────────
          MuiLink: {
            styleOverrides: {
              root: {
                color: BRAND.BLUE,
                textDecorationColor: BRAND.BLUE_LIGHT,
                fontWeight: 600,
                '&:hover': { color: BRAND.BLUE_DARK },
              },
            },
          },

          // ─── Badge — brand orange dot ───────────────────────────────────
          MuiBadge: {
            styleOverrides: {
              colorPrimary:   { backgroundColor: BRAND.BLUE   },
              colorSecondary: { backgroundColor: BRAND.ORANGE },
            },
          },

          // ─── Divider — subtle blue tint ─────────────────────────────────
          MuiDivider: {
            styleOverrides: {
              root: { borderColor: BRAND.BLUE_TINT },
            },
          },

          // ─── Tooltips ───────────────────────────────────────────────────
          MuiTooltip: {
            styleOverrides: {
              tooltip: {
                background: BRAND.BLUE_DARK,
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: 6,
              },
              arrow: { color: BRAND.BLUE_DARK },
            },
          },

          // ─── Linear progress ────────────────────────────────────────────
          MuiLinearProgress: {
            styleOverrides: {
              colorPrimary: {
                backgroundColor: BRAND.BLUE_TINT,
                '& .MuiLinearProgress-bar': { backgroundColor: BRAND.BLUE },
              },
            },
          },

          // ─── Circular progress ──────────────────────────────────────────
          MuiCircularProgress: {
            styleOverrides: {
              colorPrimary:   { color: BRAND.BLUE   },
              colorSecondary: { color: BRAND.ORANGE },
            },
          },
        },
      }),
    []
  );

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={themeInstance}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
