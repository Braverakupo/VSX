// src/systems/rebirthSystem.js
// Pure rebirth logic. No Vue imports.

import { ALL_GEMS, GEMS_PER_COLOR, CHAR_GEM_COLOR, localImages } from '../config/gameData.js'
import { GemEntity } from '../entities/GemEntity.js'
import { ObjectiveEntity } from '../entities/ObjectiveEntity.js'
import { computeGemForceGain, getTotalGemBonuses } from './combatSystem.js'
import { rollAbilityForColor, rollModifiers } from './gemSystem.js'

/**
 * Check if a hero can rebirth.
 * @param {Object} objective - ObjectiveEntity
 * @param {Object} hero - CharacterEntity
 * @returns {boolean}
 */
export function canRebirth(objective, hero) {
  if (!objective || !hero) return false
  return objective.completed >= objective.totalCompletionsNeeded
}

/**
 * Process a rebirth for an objective.
 * @param {Object} objective - ObjectiveEntity
 * @param {Object} hero - CharacterEntity
 * @param {Object} gameState - { rebirthStones }
 * @returns {{ newObjective: Object, gemAwarded: Object|null, stoneGain: number }}
 */
export function processRebirth(objective, hero, gameState) {
  if (!canRebirth(objective, hero)) return null

  const stoneGain = Math.max(1, objective.completed)
  gameState.rebirthStones += stoneGain
  hero.lastRebirthStage++

  // Award a gem
  const gemColor = CHAR_GEM_COLOR[objective.name] || 'reds'
  const gemPool = ALL_GEMS[gemColor]
  let gemAwarded = null

  if (gemPool && gemPool.length > 0) {
    const randomIdx = Math.floor(Math.random() * gemPool.length)
    const classId = rollAbilityForColor()
    const rolledTier = Math.floor(Math.random() * 5) + 1
    const scaledDmg = rolledTier * 20 * (1 + objective.completed * 0.05)

    gemAwarded = new GemEntity(gemColor, randomIdx, {
      tier: rolledTier,
      classId,
      dmg: scaledDmg,
      modifiers: rollModifiers({ tier: rolledTier })
    })
    hero.inventory.addGem(gemAwarded)

    const filledSlots = hero.gemSlots.filter(s => s !== null).length
    if (filledSlots < GEMS_PER_COLOR) {
      const emptyIdx = hero.gemSlots.indexOf(null)
      if (emptyIdx !== -1) {
        hero.gemSlots[emptyIdx] = gemAwarded.id
      }
    }
  }

  // Create new objective
  const gemForceGain = computeGemForceGain(hero)
  const totalStartingArmy = 260 + gemForceGain
  const newObjective = ObjectiveEntity.create(objective.name, objective.grade, {
    generation: objective.generation + 1,
    heroArmy: totalStartingArmy,
    lastRebirthStage: hero.lastRebirthStage
  })

  // Advance cinematic MP4
  if (localImages[hero.name]?.starred?.length > 0) {
    const pool = localImages[hero.name].starred
    hero.mp4Index = (hero.mp4Index + 1) % pool.length
  }

  return { newObjective, gemAwarded, stoneGain }
}

/**
 * Compute enemy max HP based on grade.
 * @param {number} grade
 * @returns {number}
 */
export function getBaseEnemyMax(grade) {
  return 1000 * Math.pow(2, grade - 1)
}

/**
 * Compute enemy max HP for a given completion count.
 * @param {number} grade
 * @param {number} completed
 * @returns {number}
 */
export function getEnemyMaxForCompletion(grade, completed) {
  return getBaseEnemyMax(grade) * Math.pow(1.6, completed)
}

/**
 * Get gold reward for a completion.
 * @param {number} completed
 * @returns {number}
 */
export function getGoldPerCompletion(completed) {
  return 10 + completed * 2
}

/**
 * Get total completions needed for a rebirth.
 * @param {number} grade
 * @param {number} lastRebirthStage
 * @returns {number}
 */
export function getTotalForRebirth(grade, lastRebirthStage) {
  return 10 + lastRebirthStage
}
