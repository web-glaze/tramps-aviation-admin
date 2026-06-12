/**
 * Vite config for the admin dashboard (June 2026 — ESM rewrite).
 *
 * Why .mts not .ts?
 *   Vite 5 still loads .ts config files via the deprecated CJS Node
 *   API and prints a "Vite CJS Node API deprecated" warning on every
 *   `yarn dev`. Vite 6/7 will REMOVE the CJS loader entirely. The
 *   `.mts` extension forces Node to treat this file as native ESM —
 *   warning disappears and the config keeps working on Vite 6+.
 *
 * What changed from the old vite.config.ts:
 *   1. Renamed .ts → .mts (Node-ESM signal)
 *   2. __dirname is CJS-only — replaced with the ESM equivalent
 *      `path.dirname(fileURLToPath(import.meta.url))`
 *   3. Everything else (define shim, build chunks, env prefix) is
 *      unchanged.
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM equivalent of CJS's __dirname. Node 20.11+ also exposes
// `import.meta.dirname` directly, but the fileURLToPath approach works
// on every supported Vite/Node combination so we use that.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load every .env value the build needs and build a `process.env`
  // shim. CRA exposed REACT_APP_* on `process.env`; Vite uses
  // `import.meta.env` instead. Adding a `define` block lets the
  // existing source code keep referencing `process.env.REACT_APP_X`
  // without a sweeping rename. This is the standard CRA → Vite
  // compatibility trick.
  const env = loadEnv(mode, process.cwd(), ['REACT_APP_', 'VITE_']);
  const processEnvShim: Record<string, string> = {};
  Object.entries(env).forEach(([k, v]) => {
    processEnvShim[`process.env.${k}`] = JSON.stringify(v);
  });
  // Make sure `process.env.NODE_ENV` is also defined — some libs read
  // it directly and crash if it's undefined.
  processEnvShim['process.env.NODE_ENV'] = JSON.stringify(mode);

  return {
    plugins: [react()],
    define: processEnvShim,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      strictPort: false,
      open: false,
    },
    build: {
      outDir: 'build', // match CRA's output dir so existing CI still works
      sourcemap: false,
      target: 'es2020',
      minify: 'esbuild',
      // Bump the warning threshold to 800 kB — the admin panel is an
      // internal tool, so a single ~400 kB-gzipped chunk is fine; we
      // just don't want Vite shouting on every build.
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          // Function-based manualChunks (June 2026). The previous
          // array-based config crashed on `firebase` because Firebase v9+
          // is a modular SDK — it has no default "." export entry, only
          // sub-paths like firebase/app, firebase/messaging, etc. The
          // function approach matches against the resolved module ID,
          // so it works regardless of how a package exposes its
          // sub-modules.
          manualChunks(id) {
            // node_modules vendor splits — order matters: more-specific
            // matches first so they don't bleed into the generic
            // "vendor" bucket.
            if (id.includes('node_modules')) {
              if (id.includes('@mui/icons-material')) return 'mui-icons';
              if (id.includes('@mui')) return 'mui';
              if (id.includes('recharts') || id.includes('d3-')) return 'charts';
              if (id.includes('@ant-design')) return 'antd';
              if (id.includes('firebase')) return 'firebase';
              if (id.includes('socket.io')) return 'socket';
              if (id.includes('xlsx')) return 'xlsx';
              if (id.includes('react-router')) return 'router';
              if (
                id.includes('simplebar') ||
                id.includes('perfect-scrollbar')
              )
                return 'scrollbar';
              // Everything else from node_modules → small "vendor"
              // chunk (React core, utils, etc.).
              return 'vendor';
            }
            // Application code stays in the default `index` chunk so
            // edits to our own source don't bust vendor caches.
            return undefined;
          },
        },
      },
    },
    // CRA defaults the env prefix to REACT_APP_; we use Vite's default VITE_
    // BUT we also read in the legacy prefix for the duration of the migration
    // so devs don't have to rename everything at once.
    envPrefix: ['VITE_', 'REACT_APP_'],
  };
});
