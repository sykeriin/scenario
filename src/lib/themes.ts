export type ThemeName =
  | "Black & Yellow"
  | "Black & Blue"
  | "Black & Purple"
  | "Black & Red"
  | "Black & Grey"
  | "White & Purple"
  | "White & Yellow"
  | "White & Grey";

export interface ThemeColors {
  bg: string;
  surface: string;
  card: string;
  border: string;
  accent: string;
  accentText: string;
  text: string;
  muted: string;
  dim: string;
  red: string;
  green: string;
  blue: string;
  glow: string;
  isDark: boolean;
}

// All values in HSL format for CSS variables
export const themes: Record<ThemeName, ThemeColors> = {
  "Black & Yellow": {
    bg: "40 100% 2%",
    surface: "40 10% 7%",
    card: "40 8% 10%",
    border: "40 10% 16%",
    accent: "52 100% 48%",
    accentText: "40 100% 2%",
    text: "45 20% 90%",
    muted: "40 10% 50%",
    dim: "40 5% 18%",
    red: "0 80% 55%",
    green: "120 60% 45%",
    blue: "210 80% 55%",
    glow: "52 100% 48%",
    isDark: true,
  },
  "Black & Blue": {
    bg: "210 100% 4%",
    surface: "210 30% 8%",
    card: "210 25% 11%",
    border: "210 20% 18%",
    accent: "197 100% 50%",
    accentText: "210 100% 4%",
    text: "210 20% 90%",
    muted: "210 15% 50%",
    dim: "210 10% 18%",
    red: "0 80% 55%",
    green: "160 60% 45%",
    blue: "197 100% 50%",
    glow: "197 100% 50%",
    isDark: true,
  },
  "Black & Purple": {
    bg: "270 100% 3%",
    surface: "270 20% 8%",
    card: "270 18% 11%",
    border: "270 15% 18%",
    accent: "270 100% 64%",
    accentText: "0 0% 100%",
    text: "270 15% 90%",
    muted: "270 10% 50%",
    dim: "270 8% 18%",
    red: "0 80% 55%",
    green: "150 60% 45%",
    blue: "220 80% 60%",
    glow: "270 100% 64%",
    isDark: true,
  },
  "Black & Red": {
    bg: "0 100% 3%",
    surface: "0 15% 8%",
    card: "0 12% 11%",
    border: "0 10% 18%",
    accent: "0 100% 60%",
    accentText: "0 0% 100%",
    text: "0 10% 90%",
    muted: "0 8% 50%",
    dim: "0 5% 18%",
    red: "0 100% 60%",
    green: "120 60% 45%",
    blue: "210 80% 55%",
    glow: "0 100% 60%",
    isDark: true,
  },
  "Black & Grey": {
    bg: "0 0% 3%",
    surface: "0 0% 7%",
    card: "0 0% 10%",
    border: "0 0% 16%",
    accent: "0 0% 67%",
    accentText: "0 0% 3%",
    text: "0 0% 88%",
    muted: "0 0% 45%",
    dim: "0 0% 18%",
    red: "0 70% 55%",
    green: "120 40% 45%",
    blue: "210 60% 55%",
    glow: "0 0% 67%",
    isDark: true,
  },
  "White & Purple": {
    bg: "270 100% 99%",
    surface: "270 40% 96%",
    card: "0 0% 100%",
    border: "270 20% 88%",
    accent: "270 100% 57%",
    accentText: "0 0% 100%",
    text: "270 30% 12%",
    muted: "270 10% 50%",
    dim: "270 15% 88%",
    red: "0 80% 50%",
    green: "150 60% 38%",
    blue: "220 80% 50%",
    glow: "270 100% 57%",
    isDark: false,
  },
  "White & Yellow": {
    bg: "50 80% 96%",
    surface: "50 40% 93%",
    card: "0 0% 100%",
    border: "40 25% 84%",
    accent: "40 88% 42%",
    accentText: "0 0% 100%",
    text: "40 30% 12%",
    muted: "40 15% 45%",
    dim: "40 15% 85%",
    red: "0 80% 50%",
    green: "150 60% 35%",
    blue: "210 70% 50%",
    glow: "40 88% 42%",
    isDark: false,
  },
  "White & Grey": {
    bg: "0 0% 96%",
    surface: "0 0% 93%",
    card: "0 0% 100%",
    border: "0 0% 85%",
    accent: "0 0% 20%",
    accentText: "0 0% 100%",
    text: "0 0% 12%",
    muted: "0 0% 45%",
    dim: "0 0% 85%",
    red: "0 80% 50%",
    green: "150 50% 35%",
    blue: "210 60% 45%",
    glow: "0 0% 20%",
    isDark: false,
  },
};

export const themeNames = Object.keys(themes) as ThemeName[];

export function applyTheme(name: ThemeName) {
  const t = themes[name];
  const root = document.documentElement;
  
  root.style.setProperty("--background", t.bg);
  root.style.setProperty("--foreground", t.text);
  root.style.setProperty("--card", t.card);
  root.style.setProperty("--card-foreground", t.text);
  root.style.setProperty("--popover", t.card);
  root.style.setProperty("--popover-foreground", t.text);
  root.style.setProperty("--primary", t.accent);
  root.style.setProperty("--primary-foreground", t.accentText);
  root.style.setProperty("--secondary", t.surface);
  root.style.setProperty("--secondary-foreground", t.text);
  root.style.setProperty("--muted", t.surface);
  root.style.setProperty("--muted-foreground", t.muted);
  root.style.setProperty("--accent", t.surface);
  root.style.setProperty("--accent-foreground", t.text);
  root.style.setProperty("--destructive", t.red);
  root.style.setProperty("--destructive-foreground", "0 0% 100%");
  root.style.setProperty("--border", t.border);
  root.style.setProperty("--input", t.border);
  root.style.setProperty("--ring", t.accent);
  root.style.setProperty("--surface", t.surface);
  root.style.setProperty("--dim", t.dim);
  root.style.setProperty("--glow", t.glow);
  root.style.setProperty("--theme-red", t.red);
  root.style.setProperty("--theme-green", t.green);
  root.style.setProperty("--theme-blue", t.blue);
  
  if (t.isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
