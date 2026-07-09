<p align="center">
  <strong style="font-size: 2rem; letter-spacing: 0.35em;">SCENARIO</strong>
</p>

<p align="center">
  Turn your life into clearable scenarios.<br />
  Earn XP. Build stats. Unlock titles. Stay on path.
</p>

<p align="center">
  <code>local-first</code> · <code>offline-ready PWA</code> · <code>AI co-pilot</code>
</p>

---

## What is SCENARIO?

SCENARIO is a gamified life operating system. Break goals into **Scenarios** (initiatives), clear **Stages** and **Quests**, and watch your hunter rank climb. Three universe skins share one engine:

| Universe | Vibe |
|----------|------|
| **Solo Leveling** | Gates, daily quests, shadow army, hunter ranks |
| **ORV** | Constellations, scenarios, regression arcs |
| **Founder OS** | Initiatives, vault, roadmaps, founder mode |

Pick your skin. The progression engine stays the same.

---

## Quick start

```sh
git clone https://github.com/sykeriin/scenario.git
cd scenario
npm install
npm run dev
```

Open **http://localhost:8080**

No backend. No accounts. Everything runs in your browser.

---

## First launch

1. **Configure AI** — Groq, OpenAI, OpenRouter, or any OpenAI-compatible endpoint. Or skip and use the app without AI.
2. **Onboarding** — pick a universe, set your vision, create your first scenario, complete your first quest.
3. **Install** — use your browser's *Install app* option to run SCENARIO as a standalone PWA.

---

## Stack

| Layer | Tech |
|-------|------|
| UI | React · Vite · TypeScript · Tailwind · shadcn/ui |
| Data | IndexedDB via Dexie — fully local |
| AI | Browser → your API key → OpenAI-compatible endpoint |
| Deploy | Static build · PWA with offline support |

---

## Data & privacy

All progress lives in **IndexedDB** on your machine. API keys sit in **localStorage** only. Export a JSON backup anytime from **Settings**.

Copy `.env.example` to `.env` if you want default AI env vars at build time — optional.

---

## Scripts

```sh
npm run dev       # dev server on :8080
npm run build     # production build
npm run preview   # preview production build
npm run test      # run tests
```

---

## Project layout

```
scenario/
├── config/          # vite, tailwind, eslint, tsconfig, shadcn
├── public/          # static assets
├── src/             # app source
├── index.html       # entry HTML
├── package.json
└── tsconfig.json    # points at config/
```

---

## License

MIT
