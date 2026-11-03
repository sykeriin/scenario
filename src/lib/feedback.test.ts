import { describe, it, expect, beforeEach, vi } from 'vitest';
import { haptic, isMuted, setMuted } from './feedback';

describe('feedback', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('persists mute', () => {
    expect(isMuted()).toBe(false);
    setMuted(true);
    expect(isMuted()).toBe(true);
  });

  it('haptic calls vibrate when available and not muted', () => {
    const vibrate = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    expect(haptic(20)).toBe(true);
    expect(vibrate).toHaveBeenCalledWith(20);
  });

  it('haptic does nothing when muted', () => {
    const vibrate = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    setMuted(true);
    expect(haptic()).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('haptic is a safe no-op without the API (iOS Safari)', () => {
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
    expect(haptic()).toBe(false);
  });
});
