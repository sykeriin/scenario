import { describe, it, expect } from 'vitest';
import { levelFromXp } from './xp';
import { getHunterRank, getNextRank, dropRank } from './solo-leveling/hunter-rank';

describe('levelFromXp', () => {
  it('starts at level 1', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(499)).toBe(1);
  });

  it('advances every 500 XP', () => {
    expect(levelFromXp(500)).toBe(2);
    expect(levelFromXp(999)).toBe(2);
    expect(levelFromXp(1000)).toBe(3);
    expect(levelFromXp(24_500)).toBe(50);
  });
});

describe('hunter rank', () => {
  it.each([
    [0, 'E'],
    [999, 'E'],
    [1000, 'D'],
    [4999, 'D'],
    [5000, 'C'],
    [15_000, 'B'],
    [35_000, 'A'],
    [75_000, 'S'],
    [150_000, 'NL'],
    [300_000, 'Monarch'],
    [10_000_000, 'Monarch'],
  ])('%i XP is rank %s', (xp, rank) => {
    expect(getHunterRank(xp).rank).toBe(rank);
  });

  it('reports the next rank, and null at the top', () => {
    expect(getNextRank(0)?.rank).toBe('D');
    expect(getNextRank(75_000)?.rank).toBe('NL');
    expect(getNextRank(300_000)).toBeNull();
  });

  it('drops one rank, never below E', () => {
    expect(dropRank('S')).toBe('A');
    expect(dropRank('D')).toBe('E');
    expect(dropRank('E')).toBe('E');
  });
});
