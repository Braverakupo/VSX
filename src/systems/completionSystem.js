// src/systems/completionSystem.js
// Unified completion logic — called by both tap and auto-strike.
// Pure logic: receives entities, mutates them, returns debug info.

import { localImages } from '../config/gameData.js'
import * as combatSystem from './combatSystem.js'
import * as medalSystem from './medalSystem.js'
import * as rebirthSystem from './rebirthSystem.js'
import * as xpSystem from './xpSystem.js'

/**
 * Process an objective completion (enemy HP reached 0).
 * Unifies tap + auto-strike codepaths so both award identical rewards.
 *
 * @param {Object} obj     - ObjectiveEntity (mutated in-place)
 * @param {Object} hero    - CharacterEntity (mutated in-place)
 * @param {Object} bonuses - pre-computed from getTotalHeroBonuses
 * @param {Object} gameState - reactive game state (mutated in-place)
 * @param {Object} heroRegistry - { heroName: CharacterEntity }
 * @returns {{ completed: number, newMax: number, leveledUp: string[], goldReward: number }}
 *          debug info so callers can log HP reset values
 */
export function processCompletion(obj, hero, bonuses, gameState, heroRegistry) {
  if (!obj || !hero) {
    console.warn('[completion] SKIP — missing obj or hero')
    return null
  }

  // ── 1. Increment completion counters ──
  obj.completed++
  gameState.totalCompletions++

  // ── 2. Gold reward ──
  const goldReward = rebirthSystem.getGoldPerCompletion(obj.completed) * obj.grade
  gameState.totalGoldEarned += goldReward
  gameState.gold = (gameState.gold || 0) + goldReward

  // ── 3. Preferred stat bonus ──
  if (hero.preferredStats.length > 0) {
    hero.preferredStats.forEach(s => {
      const gain = 0.01 + (bonuses.preferredStatBonus ?? 0)
      hero.stats[s] = Math.round((hero.stats[s] + gain) * 100) / 100
    })
  }

  // ── 4. Gem class stat-per-completion bonuses ──
  if (hero.gemSlots) {
    const jobMedalStatPerComp = (bonuses.statPerCompletion ?? 0) - (bonuses.mysticAuraStatPerCompletion ?? 0)
    for (const gemId of hero.gemSlots) {
      if (!gemId) continue
      const gem = hero.inventory?.getGem(gemId)
      if (!gem || !gem.classId) continue
      const def = combatSystem.getGemClassDef(gem)
      if (!def) continue

      // Base stat gain from class definition
      const statGain = (def.statPerCompletion !== undefined ? def.statPerCompletion : 0.01)
        + Math.max(0, jobMedalStatPerComp)

      // Apply to the class's flatStats keys
      if (def.flatStats) {
        for (const statKey of Object.keys(def.flatStats)) {
          if (hero.stats[statKey] !== undefined) {
            hero.stats[statKey] = Math.round((hero.stats[statKey] + statGain) * 100) / 100
          }
        }
      }

      // Preferred stat bonus from class definition (e.g. Ranger, Strategist)
      if (def.preferredStatBonus && hero.preferredStats.length > 0) {
        const preferredGain = Math.max(0.01, Math.min(0.05, def.preferredStatBonus))
        hero.preferredStats.forEach(s => {
          if (hero.stats[s] !== undefined) {
            hero.stats[s] = Math.round((hero.stats[s] + preferredGain) * 100) / 100
          }
        })
      }
    }
  }

  // ── 5. Modifier-based completionStat (targeted per-stat bonus from guaranteed 1st modifier) ──
  const completionPerStat = bonuses.completionPerStat ?? null
  if (completionPerStat) {
    for (const [statKey, gain] of Object.entries(completionPerStat)) {
      if (gain > 0 && hero.stats[statKey] !== undefined) {
        hero.stats[statKey] = Math.round((hero.stats[statKey] + gain) * 100) / 100
      }
    }
  }

  // ── 6. Mystic Aura modifier (+0.10 to ALL stats per completion) ──
  const mysticAuraBonus = bonuses.mysticAuraStatPerCompletion ?? 0
  if (mysticAuraBonus > 0) {
    for (const statKey of ['Str', 'Spi', 'Int', 'Con', 'Dex']) {
      if (hero.stats[statKey] !== undefined) {
        hero.stats[statKey] = Math.round((hero.stats[statKey] + mysticAuraBonus) * 100) / 100
      }
    }
  }

  // ── 7. Job medal level-up check (with MP4 advancement) ──
  const leveledUp = []
  if (hero.jobMedals) {
    const effectiveStats = combatSystem.getEffectiveStats(hero)
    const result = medalSystem.checkAllMedals(hero.jobMedals, effectiveStats)
    if (result.length > 0) {
      leveledUp.push(...result)
      // Advance cinematic MP4 on medal level-up
      if (localImages[hero.name]?.starred?.length > 0) {
        const pool = localImages[hero.name].starred
        hero.mp4Index = (hero.mp4Index + 1) % pool.length
        obj.mp4Url = pool[hero.mp4Index]
      }
    }
  }

  // ── 8. Reset enemy HP to next stage's max ──
  const previousMax = obj.enemyArmyMax
  obj.enemyArmyMax = rebirthSystem.getEnemyMaxForCompletion(obj.grade, obj.completed)
  obj.enemyArmyCurrent = obj.enemyArmyMax

  // ── 9. Log HP reset for debugging ──
  console.log(
    `[completion] ${obj.name} stage ${obj.completed}: HP ${previousMax.toFixed(0)} → ${obj.enemyArmyMax.toFixed(0)} ` +
    `(×${(obj.enemyArmyMax / previousMax).toFixed(3)}), gold +${goldReward}` +
    (leveledUp.length > 0 ? `, medals up: ${leveledUp.join(',')}` : '')
  )

  return {
    completed: obj.completed,
    newMax: obj.enemyArmyMax,
    leveledUp,
    goldReward
  }
}
