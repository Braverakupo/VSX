// src/systems/saveSystem.js
// Pure save/load orchestration — serializes entities and calls SaveService.
// No direct Vue imports (calls external SaveService for I/O).

import { charTemplates } from '../config/gameData.js'
import { CharacterEntity } from '../entities/CharacterEntity.js'
import { GemEntity } from '../entities/GemEntity.js'
import { InventoryEntity } from '../entities/InventoryEntity.js'
import { ObjectiveEntity } from '../entities/ObjectiveEntity.js'
import { rollAbilityForColor } from './gemSystem.js'
import * as SaveService from '../services/SaveService.js'

/**
 * Serialize and save the full game state.
 * @param {Object} gameState - reactive game state
 * @param {Object} heroRegistry - { heroName: CharacterEntity }
 * @returns {Promise<boolean>}
 */
export async function saveGame(gameState, heroRegistry) {
  try {
    const collectedGemsSerialized = gameState.collectedGems instanceof InventoryEntity
      ? gameState.collectedGems.toJSON()
      : gameState.collectedGems

    const heroesSerialized = {}
    charTemplates.forEach(name => {
      const h = heroRegistry[name]
      heroesSerialized[name] = h instanceof CharacterEntity ? h.toJSON() : {
        name: h.name,
        level: h.level, xp: h.xp, maxXp: h.maxXp,
        baseVantage: h.baseVantage,
        grade: h.grade, vantageRating: h.vantageRating,
        lastRebirthStage: h.lastRebirthStage,
        stats: { ...h.stats },
        preferredStats: [...h.preferredStats],
        gemSlots: [...(h.gemSlots || [])],
        inventory: h.inventory?.toJSON ? h.inventory.toJSON() : h.inventory,
        jobMedals: h.jobMedals?.toJSON ? h.jobMedals.toJSON() : h.jobMedals,
        mp4Index: h.mp4Index ?? 0
      }
    })

    const gameData = {
      gold: gameState.gold,
      rebirthStones: gameState.rebirthStones,
      totalCompletions: gameState.totalCompletions,
      totalGoldEarned: gameState.totalGoldEarned,
      collectedGems: collectedGemsSerialized,
      heroes: heroesSerialized,
      objectives: gameState.objectives.map(obj => ({
        id: obj.id, name: obj.name, generation: obj.generation,
        grade: obj.grade, heroArmy: obj.heroArmy,
        enemyArmyMax: obj.enemyArmyMax, enemyArmyCurrent: obj.enemyArmyCurrent,
        completed: obj.completed,
        totalCompletionsNeeded: obj.totalCompletionsNeeded,
        portraitUrl: obj.portraitUrl, barUrl: obj.barUrl, mp4Url: obj.mp4Url,
        combatAccumulator: obj.combatAccumulator || 0,
        totalDamageDealt: obj.totalDamageDealt || 0
      }))
    }

    return await SaveService.saveGame(gameData)
  } catch (e) {
    console.warn('[saveSystem] Save failed', e)
    return false
  }
}

/**
 * Load and restore full game state into reactive objects.
 * @param {Object} gameState - reactive target
 * @param {Object} heroRegistry - reactive target
 * @param {Object} flags - { isLoaded, lastSaveTime } etc.
 * @returns {Promise<boolean>}
 */
export async function loadGame(gameState, heroRegistry) {
  try {
    const gameData = await SaveService.loadGame()
    if (!gameData) return false

    gameState.gold = gameData.gold || 0
    gameState.rebirthStones = gameData.rebirthStones || 0
    gameState.totalCompletions = gameData.totalCompletions || 0
    gameState.totalGoldEarned = gameData.totalGoldEarned || 0

    // Restore collectedGems
    const restoredInventory = InventoryEntity.fromJSON(gameData.collectedGems)
    gameState.collectedGems = restoredInventory

    // Restore heroes
    if (gameData.heroes) {
      charTemplates.forEach(name => {
        const hd = gameData.heroes[name]
        if (!hd) return
        const restored = CharacterEntity.fromJSON({ name, ...hd })
        const h = heroRegistry[name]
        if (h) {
          Object.assign(h, restored)
        }
      })
    }

    // Backward compat: restore old equippedGems
    if (gameData.equippedGems && !gameData.heroes?.[charTemplates[0]]?.gemSlots) {
      charTemplates.forEach(name => {
        const arr = gameData.equippedGems[name]
        if (arr) {
          const hero = heroRegistry[name]
          if (hero) {
            for (let i = 0; i < arr.length; i++) {
              hero.gemSlots[i] = arr[i]
            }
          }
        }
      })
    }

    // Restore objectives
    if (gameData.objectives) {
      gameState.objectives.splice(0, gameState.objectives.length)
      gameData.objectives.forEach(od => {
        const obj = new ObjectiveEntity({
          ...od,
          dmgPopupTimer: 0,
          videoReady: false,
          autoDmgId: 0
        })
        gameState.objectives.push(obj)
      })
    }

    return true
  } catch (e) {
    console.warn('[saveSystem] Load failed', e)
    return false
  }
}

/**
 * Save gem-related changes.
 * @param {Object} gameState
 * @param {Object} heroRegistry
 * @returns {Promise<boolean>}
 */
export async function saveGemChanges(gameState, heroRegistry) {
  return saveGame(gameState, heroRegistry)
}
