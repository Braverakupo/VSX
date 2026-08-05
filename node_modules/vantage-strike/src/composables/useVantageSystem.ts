// src/composables/useVantageSystem.ts
// Reactive vantage system — cinematic MP4 triggers and timer management.
// Wraps vantage-related logic with timer cleanup.

import { heroRegistry, gameState } from './useGameState'
import type { GameObjective } from './useGameState'

// Cinematic active flags (per-objective)
const cinematicActive: Record<string, boolean> = {}
const cinematicHeroTimers: Record<string, ReturnType<typeof setTimeout>> = {}  // { [heroName]: timerId }

/**
 * Trigger the cinematic MP4 for an objective when vantage hits 99.
 * @param obj - objective entity
 */
export function triggerCinematicMP4(obj: GameObjective): void {
  const hero = heroRegistry[obj.name]
  if (!hero) return

  if (cinematicActive[obj.id]) return
  cinematicActive[obj.id] = true

  // Clear any stale timer for this hero
  if (cinematicHeroTimers[obj.name]) {
    clearTimeout(cinematicHeroTimers[obj.name])
  }

  // Reset vantage after 30s
  const timerId = setTimeout(() => {
    hero.vantageRating = 0
    delete cinematicActive[obj.id]
    delete cinematicHeroTimers[obj.name]
  }, 30000)
  cinematicHeroTimers[obj.name] = timerId
}

/**
 * Check if a cinematic is active for a given objective ID.
 * @param objId
 * @returns true when the cinematic is currently active
 */
export function isCinematicActive(objId: string): boolean {
  return !!cinematicActive[objId]
}

/**
 * Clear cinematic state for a given objective (used during rebirth).
 * @param obj - objective entity
 */
export function clearCinematic(obj: GameObjective): void {
  if (cinematicActive[obj.id]) {
    delete cinematicActive[obj.id]
  }
  if (cinematicHeroTimers[obj.name]) {
    clearTimeout(cinematicHeroTimers[obj.name])
    delete cinematicHeroTimers[obj.name]
  }
}

/**
 * Reset all cinematic state (used during cleanup).
 */
export function clearAllCinematics(): void {
  for (const name of Object.keys(cinematicHeroTimers)) {
    clearTimeout(cinematicHeroTimers[name])
  }
  for (const key of Object.keys(cinematicActive)) {
    delete cinematicActive[key]
  }
  for (const key of Object.keys(cinematicHeroTimers)) {
    delete cinematicHeroTimers[key]
  }
}
