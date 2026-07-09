# Config

Tooling configuration for SCENARIO. Kept out of the project root to reduce clutter.

| File | Purpose |
|------|---------|
| `vite.config.ts` | Dev server, build, PWA |
| `vitest.config.ts` | Unit tests |
| `tailwind.config.ts` | Tailwind theme & animations |
| `postcss.config.js` | Tailwind + Autoprefixer pipeline |
| `eslint.config.js` | Lint rules |
| `components.json` | shadcn/ui CLI paths |
| `tsconfig.app.json` | TypeScript — app (`src/`) |
| `tsconfig.node.json` | TypeScript — config files |

Root `tsconfig.json` only points here. `package.json` scripts pass `--config` paths.
