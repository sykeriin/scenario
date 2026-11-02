# Config

All tooling settings live here. The root keeps **two local entry points** (`vite.config.ts`, `vitest.config.ts`) that are gitignored and auto-created by `npm install` — Vite/Vitest only discover config at the project root.

| File | Tool |
|------|------|
| `vite.config.ts` | Dev server, build, PWA |
| `vitest.config.ts` | Tests |
| `tailwind.config.ts` | Theme & utilities |
| `postcss.config.js` | CSS pipeline |
| `eslint.config.js` | Lint rules |
| `components.json` | shadcn/ui CLI |
| `tsconfig.app.json` | TypeScript — `src/` |
| `tsconfig.node.json` | TypeScript — configs |
