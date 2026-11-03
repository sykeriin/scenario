/**
 * One place for tactile feedback so effects can be added or muted centrally.
 * - Haptics: navigator.vibrate works on Android Chrome only. iOS Safari ignores it
 *   (it returns false), so the visual and sound must carry the moment on their own.
 * - Sound: a short synthesized thunk via Web Audio. Browsers require a user gesture
 *   before audio plays, which a tap on a quest already is.
 */
const MUTE_KEY = 'feedback:muted';

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Storage can be unavailable (private mode); the choice just won't persist.
  }
}

export function haptic(pattern: number | number[] = 18): boolean {
  if (isMuted()) return false;
  try {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
      ? navigator.vibrate(pattern)
      : false;
  } catch {
    return false;
  }
}

let ctx: AudioContext | null = null;

/** Low, short "stamp on paper" thud. */
export function playThunk(): void {
  if (isMuted() || typeof window === 'undefined') return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  try {
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  } catch {
    // Audio is a nicety; never let it break the interaction.
  }
}

/** The stamp moment: sound plus haptic. The visual is driven by the component. */
export function stampFeedback(): void {
  playThunk();
  haptic(18);
}
