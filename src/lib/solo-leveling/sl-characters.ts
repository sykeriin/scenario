export interface SlCharacter {
  name: string;
  title: string;
  voice: string;
  triggers: string[];
  bonusMp?: number;
}

export const SL_CHARACTERS: SlCharacter[] = [
  {
    name: 'Sung Jinwoo',
    title: 'The Shadow Monarch',
    voice: 'quiet, measured, rarely speaks, but when he does it is decisive and powerful',
    triggers: ['gate_cleared', 'shadow_milestone', 'penalty_zone'],
    bonusMp: 25,
  },
  {
    name: 'Cha Hae-In',
    title: 'S-Rank Hunter',
    voice: 'precise, respectful, quietly confident',
    triggers: ['high_sense', 'streak_milestone'],
    bonusMp: 20,
  },
  {
    name: 'Go Gunhee',
    title: 'The Chairman',
    voice: 'warm but authoritative, grandfather-like, believes in human potential',
    triggers: ['low_rank_potential', 'first_guild'],
    bonusMp: 15,
  },
  {
    name: 'Thomas Andre',
    title: 'The Strongest',
    voice: 'direct, competitive, no small talk, only respects strength and results',
    triggers: ['high_str', 'duel_streak'],
    bonusMp: 20,
  },
  {
    name: 'Hwang Dongsoo',
    title: 'The Antagonist',
    voice: 'contemptuous, challenging, uses negativity as a dark mirror',
    triggers: ['penalty_zone', 'failed_gates'],
    bonusMp: 50,
  },
  {
    name: 'Lim Tae-Gyu',
    title: 'The Assassin',
    voice: 'analytical, efficient, mission-focused',
    triggers: ['technical_quest', 'high_agi'],
    bonusMp: 15,
  },
];

export function getSlCharacterByName(name: string) {
  return SL_CHARACTERS.find((c) => c.name === name);
}
