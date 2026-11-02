import { describe, it, expect, beforeEach } from 'vitest';
import { isFlagEnabled } from './flags';

describe('isFlagEnabled', () => {
  beforeEach(() => localStorage.clear());

  it('uses the default when there is no override', () => {
    expect(isFlagEnabled('social')).toBe(false);
  });

  it('honours localStorage overrides', () => {
    localStorage.setItem('flag:social', '1');
    expect(isFlagEnabled('social')).toBe(true);
    localStorage.setItem('flag:social', '0');
    expect(isFlagEnabled('social')).toBe(false);
  });
});
