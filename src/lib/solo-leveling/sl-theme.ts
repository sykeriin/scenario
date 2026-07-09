const SL_VARS: Record<string, string> = {
  '--primary': '200 100% 50%',
  '--background': '240 20% 2%',
  '--card': '240 25% 5%',
  '--glow': '200 100% 50%',
  '--sl-accent': '#00b4ff',
};

let savedVars: Record<string, string> = {};

export function applySlTheme() {
  const root = document.documentElement;
  savedVars = {};
  for (const [key, val] of Object.entries(SL_VARS)) {
    savedVars[key] = root.style.getPropertyValue(key);
    root.style.setProperty(key, val);
  }
  root.classList.add('sl-universe');
}

export function removeSlTheme() {
  const root = document.documentElement;
  root.classList.remove('sl-universe');
  for (const [key, val] of Object.entries(savedVars)) {
    if (val) root.style.setProperty(key, val);
    else root.style.removeProperty(key);
  }
  savedVars = {};
}

export function applyRankAccent(rank: string) {
  const colors: Record<string, string> = {
    E: '0 0% 50%',
    D: '120 60% 45%',
    C: '200 100% 50%',
    B: '270 70% 55%',
    A: '45 100% 50%',
    S: '45 100% 60%',
    NL: '0 80% 50%',
    Monarch: '0 0% 0%',
  };
  const c = colors[rank] ?? colors.E;
  document.documentElement.style.setProperty('--primary', c);
}
