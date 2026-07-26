// src/composables/useGameLoop.js
// Game loop composable — runs systems each tick via setInterval.
// Accepts state references to avoid circular dependencies.

import { isLoaded, cheatActive } from '../flags.js'
import * as combatSystem from '../systems/combatSystem.js'
import * as medalSystem from '../systems/medalSystem.js'
import * as xpSystem from '../systems/xpSystem.js'
import * as saveSystem from '../systems/saveSystem.js'
import * as completionSystem from '../systems/completionSystem.js'
import { triggerCinematicMP4 } from './useVantageSystem.js'

const GAME_TICK_MS = 100
const GAME_TICK_SEC = GAME_TICK_MS / 1000
const SAVE_INTERVAL_MS = 30000

let gameIntervalId = null
let autoSaveIntervalId = null

function gameTick(gameState, heroRegistry) {
  gameState.objectives.forEach(obj => {
    try {
      const hero = heroRegistry[obj.name]
      if (!hero) return

      const gemBonuses = combatSystem.getTotalGemBonuses(hero)
      const bonuses = medalSystem.getTotalHeroBonuses(hero, gemBonuses)

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
        if (hero.vantageRating >= 99) {
          triggerCinematicMP4(obj)
        }
      }

      // Check completion — uses unified system
      if (obj.enemyArmyCurrent <= 0 && obj.enemyArmyMax > 0) {
        const info = completionSystem.processCompletion(obj, hero, bonuses, gameState, heroRegistry)
        if (info) {
          // Passive gold for the new stage starts accruing immediately
        }
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
let activeGameState = null
let activeHeroRegistry = null

export function useGameLoop() {
  function startGameLoop(gs, hr) {
    if (gameIntervalId) return
    activeGameState = gs
    activeHeroRegistry = hr

    // @ts-ignore
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

  function stopGameLoop() {
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
