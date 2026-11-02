import { writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const stubs = {
  "vite.config.ts": `// Auto-generated — Vite requires a root config entry point.
// Real config: config/vite.config.ts
export { default } from "./config/vite.config.ts";
`,
  "vitest.config.ts": `// Auto-generated — Vitest requires a root config entry point.
// Real config: config/vitest.config.ts
export { default } from "./config/vitest.config.ts";
`,
};

for (const [file, content] of Object.entries(stubs)) {
  const path = resolve(root, file);
  if (!existsSync(path)) {
    writeFileSync(path, content, "utf8");
    console.log(`created ${file}`);
  }
}
