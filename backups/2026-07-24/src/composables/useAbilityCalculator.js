// src/composables/useAbilityCalculator.js
// Resolves class/gem passive bonuses for the class system.
// No active skills — all gem effects are passive modifiers.
// Ashbeam (blues) gems: grant crit chance and vantage crit chance.
// Voltkin (reds) gems: grant crit damage % and vantage damage % increase.
// Crypsis (oranges) gems: grant final damage % increase.
// Keeps computeAshbeamCritStats(), computeVoltkinDamageStats(), computeCrypsisDamageMult(), and rollAbilityForColor() for the class system.

import { classDefinitions } from '../config/gameData.js'

/**
 * Compute the combined crit chance and vantage crit chance from all equipped
 * Tactician (blues) gems. Chances stack additively across equipped blue gems.
 *
 * @param {Array} gemSlots - array of gem UUIDs (or null) from hero.gemSlots
 * @param {Object} collectedGems - the Inventory instance to look up gems by UUID
 * @returns {{ critChance: number, vantageCritChance: number }}
 */
export function computeAshbeamCritStats(gemSlots, collectedGems) {
  let critChance = 0
  let vantageCritChance = 0

  if (!gemSlots || !collectedGems) return { critChance, vantageCritChance }

  for (const gemId of gemSlots) {
    if (!gemId) continue
    const gem = collectedGems.getGem(gemId)
    if (!gem || !gem.hasClass || gem.color !== 'blues') continue
    const def = gem.classDef
    if (!def) continue

    if (def.critChance) {
      if (Array.isArray(def.critChance)) {
        const [min, max] = def.critChance
        if (gem._rolledCritChance === undefined) {
          gem._rolledCritChance = min + Math.random() * (max - min)
        }
        critChance += gem._rolledCritChance / 100
      } else {
        critChance += def.critChance
      }
    }
    if (def.vantageCritChance) {
      if (Array.isArray(def.vantageCritChance)) {
        const [min, max] = def.vantageCritChance
        if (gem._rolledVantageCritChance === undefined) {
          gem._rolledVantageCritChance = min + Math.random() * (max - min)
        }
        vantageCritChance += gem._rolledVantageCritChance / 100
      } else {
        vantageCritChance += def.vantageCritChance
      }
    }
  }

  return { critChance, vantageCritChance }
}

/**
 * Compute the combined crit damage % and double crit flag from all equipped
 * Vanguard (reds) gems. Values stack additively across equipped red gems.
 *
 * @param {Array} gemSlots - array of gem UUIDs (or null) from hero.gemSlots
 * @param {Object} collectedGems - the Inventory instance to look up gems by UUID
 * @returns {{ critDamage: number, doubleCrit: number }}
 */
export function computeVoltkinDamageStats(gemSlots, collectedGems) {
  let critDamage = 0
  let doubleCrit = 0

  if (!gemSlots || !collectedGems) return { critDamage, doubleCrit }

  for (const gemId of gemSlots) {
    if (!gemId) continue
    const gem = collectedGems.getGem(gemId)
    if (!gem || !gem.hasClass || gem.color !== 'reds') continue
    const def = gem.classDef
    if (!def) continue

    if (def.critDamage) {
      critDamage += def.critDamage
    }
    if (def.doubleCrit) {
      doubleCrit += def.doubleCrit
    }
  }
return { critDamage, doubleCrit }
}

/**
* Compute the combined final damage % increase from all equipped
* Rogue (oranges) gems. Values stack additively across equipped orange gems.
* damageMult is now a rollable gem modifier, not a class property.
*
* @param {Array} gemSlots - array of gem UUIDs (or null) from hero.gemSlots
* @param {Object} collectedGems - the Inventory instance to look up gems by UUID
* @returns {number} total damage multiplier bonus (e.g., 0.15 = +15% final damage)
*/
export function computeCrypsisDamageMult(gemSlots, collectedGems) {
let totalMult = 0

if (!gemSlots || !collectedGems) return totalMult

for (const gemId of gemSlots) {
  if (!gemId) continue
  const gem = collectedGems.getGem(gemId)
  if (!gem || !gem.hasClass || gem.color !== 'oranges') continue

  if (gem.hasModifier('damageMult')) {
    totalMult += gem.getModifierValue('damageMult')
  }
}

return totalMult
}


/**
 * Roll a random class weighted by each class's weight.
 * All classes are available to all gems regardless of color.
 * @returns {string|null} class id, or null if no classes are defined
 */
export function rollAbilityForColor() {
  const pool = classDefinitions
  if (pool.length === 0) return null

  const totalWeight = pool.reduce((s, c) => s + c.weight, 0)
  let roll = Math.random() * totalWeight

  for (const cls of pool) {
    roll -= cls.weight
    if (roll <= 0) return cls.id
  }
  return pool[pool.length - 1].id
}

/**
 * Format damage number for display (kept for backward compat with damage popups).
 * @param {number} damage
 * @param {boolean} isCrit
 * @returns {string}
 */
export function formatDamage(damage, isCrit = false) {
  if (damage < 1000) return Math.floor(damage).toString()
  const suffixes = ["", "K", "M", "B", "T"]
  const tier = Math.min(suffixes.length - 1, Math.floor(Math.log10(damage) / 3))
  const scaled = damage / Math.pow(10, tier * 3)
  return (scaled < 10 ? scaled.toFixed(1) : Math.floor(scaled).toString()) + suffixes[tier]
}
