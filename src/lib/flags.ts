/**
 * Feature flags. The app grew to 30+ pages; only the core loop is shown by
 * default so new users aren't lost. Hidden features stay routable by URL and
 * can be switched back on per browser without a rebuild:
 *
 *   localStorage.setItem('flag:social', '1')   // enable
 *   localStorage.setItem('flag:social', '0')   // disable
 */
export const FLAG_DEFAULTS = {
  /** Channels, lobby, parties, templates marketplace. Needs a real backend. */
  social: false,
  /** Constellations, nebulae, demons, oldest dream, dream board. */
  lore: false,
  /** Life path, mood map, vault. */
  insights: false,
  /** Roadmap, SWOT, R&D (Founder OS skin). */
  founder: false,
  /** Pomodoro training room. */
  training: false,
} as const;

export type FlagName = keyof typeof FLAG_DEFAULTS;

export function isFlagEnabled(flag: FlagName): boolean {
  try {
    const override = localStorage.getItem(`flag:${flag}`);
    if (override === '1') return true;
    if (override === '0') return false;
  } catch {
    // localStorage can throw (private mode); fall through to the default.
  }
  return FLAG_DEFAULTS[flag];
}
