// src/systems/xpSystem.ts
// Pure XP/leveling logic. No Vue imports.

export interface XpHero {
  xp: number
  maxXp: number
  level: number
}

/**
 * Add XP to a hero and handle level-ups.
 */
export function addXP(hero: XpHero | null | undefined, amount: number): void {
  if (!hero) return
  hero.xp += amount
  while (hero.xp >= hero.maxXp) {
    hero.xp -= hero.maxXp
    hero.level++
    hero.maxXp = getXpForLevel(hero.level)
  }
}

/**
 * Get the XP required for a given level.
 */
export function getXpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.35, level - 1))
}
