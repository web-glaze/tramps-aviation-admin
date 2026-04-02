import { ReactNode, useMemo } from 'react';
import { CssBaseline, StyledEngineProvider } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Palette from './palette';

export default function ThemeCustomization({ children }: { children: ReactNode }) {
  // ✅ FIX: Palette() ab plain object return karta hai — seedha createTheme() ko do
  const themeInstance = useMemo(
    () =>
      createTheme({
        palette: Palette('light') as any,
        breakpoints: { values: { xs: 0, sm: 768, md: 1024, lg: 1266, xl: 1536 } },
        mixins: { toolbar: { minHeight: 60, paddingTop: 8, paddingBottom: 8 } },
        shape: { borderRadius: 8 },
        typography: {
          fontFamily: `'Inter', 'Public Sans', sans-serif`,
          h1: { fontSize: '2.25rem', fontWeight: 600 },
          h2: { fontSize: '1.875rem', fontWeight: 600 },
          h3: { fontSize: '1.5rem', fontWeight: 600 },
          h4: { fontSize: '1.25rem', fontWeight: 600 },
          h5: { fontSize: '1.0625rem', fontWeight: 600 },
          h6: { fontSize: '0.875rem', fontWeight: 600 },
          body1: { fontSize: '0.875rem' },
          body2: { fontSize: '0.75rem' },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: { fontWeight: 500, borderRadius: 8, textTransform: 'none' as const },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: { borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: { borderColor: '#f0f0f0', padding: '10px 16px' },
              head: { fontWeight: 600, backgroundColor: '#fafafa' },
            },
          },
          MuiChip: {
            styleOverrides: { root: { borderRadius: 6, fontWeight: 500 } },
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