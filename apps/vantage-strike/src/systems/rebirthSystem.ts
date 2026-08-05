// src/systems/rebirthSystem.ts
// Pure rebirth logic. No Vue imports.

import { ALL_GEMS, GEMS_PER_COLOR, CHAR_GEM_COLOR, localImages } from '../config/gameData'
import { GemEntity } from '../entities/GemEntity'
import { ObjectiveEntity } from '../entities/ObjectiveEntity'
import { computeGemForceGain } from './combatSystem'
import { rollAbilityForColor, rollModifiers } from './gemSystem'
import type { Hero } from './combatSystem'

/** The objective fields rebirth logic reads (structural — accepts ObjectiveEntity or UI-facing shapes). */
export interface RebirthObjective {
  name: string
  grade: number
  generation: number
  completed: number
  totalCompletionsNeeded: number
}

/**
 * Check if a hero can rebirth.
 */
export function canRebirth(objective: RebirthObjective | null | undefined, hero: Hero | null | undefined): boolean {
  if (!objective || !hero) return false
  return objective.completed >= objective.totalCompletionsNeeded
}

export interface RebirthResult {
  newObjective: ObjectiveEntity
  gemAwarded: GemEntity | null
  stoneGain: number
}

/**
 * Process a rebirth for an objective.
 */
export function processRebirth(
  objective: RebirthObjective | null | undefined,
  hero: Hero | null | undefined,
  gameState: { rebirthStones: number }
): RebirthResult | null {
  if (!objective || !hero) return null
  if (!canRebirth(objective, hero)) return null

  const stoneGain = Math.max(1, objective.completed)
  gameState.rebirthStones += stoneGain
  hero.lastRebirthStage++

  // Award a gem
  const gemColor = (CHAR_GEM_COLOR[objective.name as keyof typeof CHAR_GEM_COLOR] || 'reds') as ConstructorParameters<typeof GemEntity>[0]
  const gemPool = ALL_GEMS[gemColor as keyof typeof ALL_GEMS]
  let gemAwarded: GemEntity | null = null

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

    const filledSlots = hero.gemSlots.filter((s): s is string => s !== null).length
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
  if (localImages[hero.name as keyof typeof localImages]?.starred?.length > 0) {
    const pool = localImages[hero.name as keyof typeof localImages].starred
    hero.mp4Index = (hero.mp4Index + 1) % pool.length
  }

  return { newObjective, gemAwarded, stoneGain }
}

/**
 * Compute enemy max HP based on grade.
 */
export function getBaseEnemyMax(grade: number): number {
  return 1000 * Math.pow(2, grade - 1)
}

/**
 * Compute enemy max HP for a given completion count.
 */
export function getEnemyMaxForCompletion(grade: number, completed: number): number {
  return getBaseEnemyMax(grade) * Math.pow(1.6, completed)
}

/**
 * Get gold reward for a completion.
 */
export function getGoldPerCompletion(completed: number): number {
  return 10 + completed * 2
}

/**
 * Get total completions needed for a rebirth.
 */
export function getTotalForRebirth(grade: number, lastRebirthStage: number): number {
  return 10 + lastRebirthStage
}
