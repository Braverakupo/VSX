// src/composables/useGameLoop.ts
// Game loop composable — runs systems each tick via setInterval.
// Accepts state references to avoid circular dependencies.

import { isLoaded, cheatActive } from '../flags'
import * as combatSystem from '../systems/combatSystem'
import * as medalSystem from '../systems/medalSystem'
import * as xpSystem from '../systems/xpSystem'
import * as saveSystem from '../systems/saveSystem'
import * as completionSystem from '../systems/completionSystem'
import { triggerCinematicMP4 } from './useVantageSystem'
import { VANTAGE_STRIKE_THRESHOLD } from '../config/gameData'
import type { GameState, GameObjective, Hero, HeroRegistry, GemBonuses } from './useGameState'

const GAME_TICK_MS = 100
const GAME_TICK_SEC = GAME_TICK_MS / 1000
const SAVE_INTERVAL_MS = 30000

let gameIntervalId: ReturnType<typeof setInterval> | null = null
let autoSaveIntervalId: ReturnType<typeof setInterval> | null = null

/**
 * Bonus totals as consumed by the tick loop — the canonical GemBonuses
 * plus the optional AOE splash share the gameTick reads defensively
 * (currently only ever present if a medal passive adds it).
 */
type BonusLike = GemBonuses & { aoeDamageShare?: number }

function gameTick(gameState: GameState, heroRegistry: HeroRegistry): void {
  gameState.objectives.forEach(obj => {
    try {
      const hero = heroRegistry[obj.name]
      if (!hero) return

      const gemBonuses = combatSystem.getTotalGemBonuses(hero) as BonusLike
      const bonuses = medalSystem.getTotalHeroBonuses(hero, gemBonuses) as BonusLike

      // Force generation from job medal passives
      if (bonuses.armyPerSecond > 0) {
        obj.heroArmy = (obj.heroArmy || 1) + bonuses.armyPerSecond * GAME_TICK_SEC
      }

      // Auto-strike
      obj.combatAccumulator += GAME_TICK_SEC
      if (obj.combatAccumulator >= 1) {
        obj.combatAccumulator -= 1
        const autoDmg = combatSystem.calculateAutoStrikeDamage(hero, obj, bonuses, cheatActive.value)
        obj.enemyArmyCurrent = Math.round(Math.max(0, obj.enemyArmyCurrent - autoDmg) * 100) / 100
        obj.totalDamageDealt = (obj.totalDamageDealt || 0) + autoDmg
        xpSystem.addXP(hero, autoDmg / 1000)
        obj.autoDmgPopup = { dmg: autoDmg, t: Date.now() }

        // Kailin AOE splash
        if (obj.name === 'Kailin') {
          const aoeShare = bonuses.aoeDamageShare ?? 0
          if (aoeShare > 0) {
            const splashDmg = autoDmg * aoeShare
            for (const otherObj of gameState.objectives) {
              if (otherObj.name !== 'Kailin') {
                otherObj.enemyArmyCurrent = Math.round(Math.max(0, otherObj.enemyArmyCurrent - splashDmg) * 100) / 100
              }
            }
          }
        }
      }

      obj.dmgPopupTimer += GAME_TICK_SEC

      // Vantage auto-fill
      if (hero.vantageRating < 99 || (bonuses.vantageCapBoost ?? 0) > 0) {
        const maxVantage = 99 + (bonuses.vantageCapBoost ?? 0)
        const vantagePerSecond = 1 + (bonuses.vantageAutoRate ?? 0)
        hero.vantageRating = Math.min(maxVantage, hero.vantageRating + vantagePerSecond * GAME_TICK_SEC)
        if (hero.vantageRating >= VANTAGE_STRIKE_THRESHOLD) {
          triggerCinematicMP4(obj)
        }
      }

      // Check completion — uses unified system
      if (obj.enemyArmyCurrent <= 0 && obj.enemyArmyMax > 0) {
        completionSystem.processCompletion(obj, hero, bonuses, gameState, heroRegistry)
      }

      // Passive gold
      const passiveGold = obj.completed * obj.grade * GAME_TICK_SEC
      gameState.gold = (gameState.gold || 0) + passiveGold
      if (bonuses.goldPerSecond > 0) {
        gameState.gold = (gameState.gold || 0) + bonuses.goldPerSecond * GAME_TICK_SEC
      }
    } catch (e) {
      console.warn(`[gameTick] error for ${obj?.name || 'unknown'}:`, e)
    }
  })
}

/** Track the active gameState/heroRegistry for the tick callback */
let activeGameState: GameState | null = null
let activeHeroRegistry: HeroRegistry | null = null

export function useGameLoop(): {
  startGameLoop: (gs: GameState, hr: HeroRegistry) => void
  stopGameLoop: () => void
} {
  function startGameLoop(gs: GameState, hr: HeroRegistry): void {
    if (gameIntervalId) return
    activeGameState = gs
    activeHeroRegistry = hr

    gameIntervalId = setInterval(() => {
      if (activeGameState && activeHeroRegistry) {
        gameTick(activeGameState, activeHeroRegistry)
      }
    }, GAME_TICK_MS)

    autoSaveIntervalId = setInterval(() => {
      if (isLoaded.value && activeGameState && activeHeroRegistry) {
        saveSystem.saveGame(activeGameState, activeHeroRegistry)
      }
    }, SAVE_INTERVAL_MS)
  }

  function stopGameLoop(): void {
    if (gameIntervalId) {
      clearInterval(gameIntervalId)
      gameIntervalId = null
    }
    if (autoSaveIntervalId) {
      clearInterval(autoSaveIntervalId)
      autoSaveIntervalId = null
    }
    activeGameState = null
    activeHeroRegistry = null
  }

  return { startGameLoop, stopGameLoop }
}
