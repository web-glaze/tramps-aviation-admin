# CRA → Vite Migration Plan (Admin)

**Status (June 2026): FLIPPED ON.**

`package.json` scripts now point `start` / `dev` / `build` at Vite.
The CRA fallback is kept as `start:cra` / `build:cra` so you can roll
back without touching files.

## One-time setup

```bash
cd tramps-aviation-admin
yarn install            # picks up vite + @vitejs/plugin-react
yarn start              # boots Vite dev server (http://localhost:3000)
```

## Rollback

`yarn start:cra` runs the original react-scripts dev server. The old
`src/index.tsx` and `public/index.html` are intentionally left in
place so the rollback path keeps working without any file moves.

---

## Original migration plan (kept for reference)

This document tracks the migration of the admin dashboard from
Create React App to Vite. The migration is **opt-in** - the existing
CRA setup keeps working until you flip the package.json scripts.

## Why migrate

| | CRA | Vite |
|---|---|---|
| Dev server start | 30+ sec | < 2 sec |
| Hot module reload | 2-4 sec | < 200 ms |
| Production build | 4-6 min | 60-90 sec |
| Maintenance status | Unmaintained since 2022 | Active |
| Bundle splitting | Manual | Built-in |

## Pre-flight check

Run `yarn` to confirm the lockfile is healthy. Then commit the current
state so the rollback is one `git revert` away.

```bash
yarn install
git status
git add . && git commit -m "snapshot before vite migration"
```

## Step-by-step

### 1. Install Vite + plugins

```bash
yarn add -D vite @vitejs/plugin-react vite-tsconfig-paths
yarn add -D vite-plugin-svgr   # only if you import SVGs as React components
```

### 2. Move index.html

Vite expects `index.html` at the project root, not under `public/`.

```bash
mv public/index.html index.html
```

Then edit `index.html`:
- Remove `%PUBLIC_URL%` references - Vite handles this differently.
  Replace `%PUBLIC_URL%/favicon.ico` with `/favicon.ico` etc.
- Add the module script tag right before `</body>`:

```html
<script type="module" src="/src/main.tsx"></script>
```

### 3. Rename entry file

```bash
mv src/index.tsx src/main.tsx
```

### 4. Update package.json scripts

Replace:
```json
"start": "react-scripts start",
"build": "react-scripts build",
"test": "react-scripts test",
"eject": "react-scripts eject"
```

With:
```json
"start": "vite",
"dev": "vite",
"build": "tsc --noEmit && vite build",
"preview": "vite preview"
```

Remove `react-scripts` from `devDependencies`.

### 5. Rename env vars

CRA uses `REACT_APP_*` prefix. Vite uses `VITE_*`. The included
`vite.config.ts` reads BOTH prefixes during the transition - but you
should rename everything eventually:

```bash
# Rename .env vars
sed -i.bak 's/REACT_APP_/VITE_/g' .env
sed -i.bak 's/REACT_APP_/VITE_/g' .env.production

# Update source references
grep -r "process.env.REACT_APP_" src/
# Then for each match, change `process.env.REACT_APP_X` -> `import.meta.env.VITE_X`
```

### 6. Fix TypeScript references

CRA's `react-app-env.d.ts` references `react-scripts` types. Replace
its content with:

```ts
/// <reference types="vite/client" />
```

### 7. Test

```bash
yarn start
# Server should boot in < 2 sec on http://localhost:3000

yarn build
# Should complete in 60-90 sec
```

### 8. Deploy verification

The build output stays at `build/` (matching CRA), so the existing
GitHub Actions workflow that syncs `./build/` to S3 keeps working.
No CI change needed.

## Common gotchas

| Symptom | Cause | Fix |
|---|---|---|
| Blank page on dev | `index.html` not at root | Move it |
| `process is not defined` | Code still references `process.env.X` | Switch to `import.meta.env.X` |
| `.scss/.sass` files don't load | Vite needs the preprocessor explicitly | `yarn add -D sass` |
| CSS modules not working | Suffix needed | Rename `Foo.css` -> `Foo.module.css` |
| Build fails on `require()` | Vite is ESM-only | Convert to `import` |
| Public folder assets 404 | URL changed | `/logo.png` works as-is; `process.env.PUBLIC_URL` doesn't |

## Rollback

If anything blocks production deployment:

```bash
git reset --hard HEAD~1
yarn install
yarn start  # back on CRA
```
