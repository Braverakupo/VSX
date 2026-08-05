// src/systems/saveSystem.ts
// Pure save/load orchestration — serializes entities and calls SaveService.
// No direct Vue imports (calls external SaveService for I/O).

import { charTemplates } from '../config/gameData'
import { CharacterEntity } from '../entities/CharacterEntity'
import { InventoryEntity } from '../entities/InventoryEntity'
import { ObjectiveEntity } from '../entities/ObjectiveEntity'
import * as SaveService from '../services/SaveService'
import type { Hero, HeroRegistry, HeroStats } from './combatSystem'

export interface SerializedHero {
  name: string
  level?: number
  xp?: number
  maxXp?: number
  baseVantage?: number
  grade?: number
  vantageRating?: number
  lastRebirthStage?: number
  stats?: Partial<HeroStats>
  preferredStats?: string[]
  gemSlots?: (string | null)[]
  inventory?: unknown
  jobMedals?: unknown
  mp4Index?: number
}

export interface SerializedObjective {
  id: string
  name: string
  generation: number
  grade: number
  heroArmy: number
  enemyArmyMax: number
  enemyArmyCurrent: number
  completed: number
  totalCompletionsNeeded: number
  portraitUrl: string | null
  barUrl: string | null
  mp4Url: string | null
  combatAccumulator: number
  totalDamageDealt: number
}

export interface SaveGameData {
  gold: number
  rebirthStones: number
  totalCompletions: number
  totalGoldEarned: number
  collectedGems: unknown
  heroes: Record<string, SerializedHero>
  objectives: SerializedObjective[]
  equippedGems?: Record<string, (string | null)[]>
}

export interface GameState {
  gold: number
  rebirthStones: number
  totalCompletions: number
  totalGoldEarned: number
  /** Serializable objective shape — accepts ObjectiveEntity instances or UI-facing objective interfaces. */
  objectives: SerializedObjective[]
  /** Either an InventoryEntity instance or an already-serialized gem map. */
  collectedGems: unknown
}

/**
 * Serialize and save the full game state.
 */
export async function saveGame(gameState: GameState, heroRegistry: HeroRegistry): Promise<boolean> {
  try {
    const collectedGemsSerialized = gameState.collectedGems instanceof InventoryEntity
      ? gameState.collectedGems.toJSON()
      : gameState.collectedGems

    const heroesSerialized: Record<string, SerializedHero> = {}
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
        inventory: typeof h.inventory?.toJSON === 'function' ? h.inventory.toJSON() : h.inventory,
        jobMedals: h.jobMedals ? (typeof h.jobMedals.toJSON === 'function' ? h.jobMedals.toJSON() : h.jobMedals) : null,
        mp4Index: h.mp4Index ?? 0
      }
    })

    const gameData: SaveGameData = {
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
 */
export async function loadGame(gameState: GameState, heroRegistry: HeroRegistry): Promise<boolean> {
  try {
    const gameData = (await SaveService.loadGame()) as SaveGameData | null
    if (!gameData) return false

    gameState.gold = gameData.gold || 0
    gameState.rebirthStones = gameData.rebirthStones || 0
    gameState.totalCompletions = gameData.totalCompletions || 0
    gameState.totalGoldEarned = gameData.totalGoldEarned || 0

    // Restore collectedGems
    const restoredInventory = InventoryEntity.fromJSON(gameData.collectedGems as unknown as Parameters<typeof InventoryEntity.fromJSON>[0])
    gameState.collectedGems = restoredInventory

    // Restore heroes
    if (gameData.heroes) {
      charTemplates.forEach(name => {
        const hd = gameData.heroes[name]
        if (!hd) return
        const restored = CharacterEntity.fromJSON({ ...hd, name } as unknown as Parameters<typeof CharacterEntity.fromJSON>[0])
        const h = heroRegistry[name]
        if (h) {
          Object.assign(h, restored)
        }
      })
    }

    // Backward compat: restore old equippedGems
    const equippedGems = gameData.equippedGems
    if (equippedGems && !gameData.heroes?.[charTemplates[0]]?.gemSlots) {
      charTemplates.forEach(name => {
        const arr = equippedGems[name]
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
 */
export async function saveGemChanges(gameState: GameState, heroRegistry: HeroRegistry): Promise<boolean> {
  return saveGame(gameState, heroRegistry)
}
