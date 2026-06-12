/**
 * @deprecated June 2026 — this file is intentionally a thin re-export.
 *
 * The real Vite configuration lives in `vite.config.mts`. We renamed it
 * to `.mts` so Vite 5+ loads it via the native ESM API instead of the
 * deprecated CJS Node API (Vite 6/7 will REMOVE the CJS loader).
 *
 * This .ts file stays around as a no-op fallback in case Vite (or an
 * IDE / linter) picks it up before the .mts version. Both export the
 * same default config object.
 *
 * Safe to delete once you confirm `yarn dev` boots without the warning.
 */
// @ts-ignore — Vite resolves .mts at load time; TS may not follow it.
export { default } from './vite.config.mts';
