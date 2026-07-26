// src/systems/xpSystem.js
// Pure XP/leveling logic. No Vue imports.

/**
 * Add XP to a hero and handle level-ups.
 * @param {Object} hero - CharacterEntity
 * @param {number} amount - XP amount
 */
export function addXP(hero, amount) {
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
 * @param {number} level
 * @returns {number}
 */
export function getXpForLevel(level) {
  return Math.floor(100 * Math.pow(1.35, level - 1))
}
