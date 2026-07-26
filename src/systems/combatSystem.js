// src/systems/combatSystem.js
// Pure combat logic — damage calculation, vantage, overcore, crits.
// No Vue imports. Receives entity data, returns results.

import { classDefinitions } from '../config/gameData.js'
import { GEMS_PER_COLOR } from '../config/gameData.js'

const OVERCORE_BASE = 1.12
const SPECTRA_STAT_PER_GEM = 0.03

/**
 * Compute the Overcore (OC) damage multiplier.
 * Scales exponentially with each point of vantageRating above 99.
 * @param {Object} hero - CharacterEntity
 * @param {number} [overcoreBase=OVERCORE_BASE]
 * @returns {number}
 */
export function getOvercoreDmgMult(hero, overcoreBase = OVERCORE_BASE) {
  if (!hero) return 1
  const overcap = Math.max(0, hero.vantageRating - 99)
  if (overcap <= 0) return 1
  return Math.pow(overcoreBase, overcap)
}

/**
 * Get effective hero stats including Spectra (cyan) gem bonuses.
 * @param {Object} hero - CharacterEntity
 * @returns {Object} { Str, Spi, Int, Con, Dex }
 */
export function getEffectiveStats(hero) {
  if (!hero) return { Str: 0, Spi: 0, Int: 0, Con: 0, Dex: 0 }
  const baseStats = { ...hero.stats }
  const spectraBonus = getSpectraGemStatBonus(hero)
  for (const statKey of Object.keys(baseStats)) {
    baseStats[statKey] = baseStats[statKey] + (spectraBonus[statKey] || 0)
  }
  for (const statKey of Object.keys(baseStats)) {
    baseStats[statKey] = Math.round(baseStats[statKey] * 100) / 100
  }
  return baseStats
}

/**
 * Calculate the stat bonuses contributed by equipped Spectra (cyan) gems.
 * @param {Object} hero - CharacterEntity
 * @returns {Object} { Str, Spi, Int, Con, Dex }
 */
export function getSpectraGemStatBonus(hero) {
  const bonus = { Str: 0, Spi: 0, Int: 0, Con: 0, Dex: 0 }
  if (!hero || !hero.gemSlots) return bonus
  for (const gemId of hero.gemSlots) {
    if (!gemId) continue
    const gem = hero.inventory?.getGem(gemId)
    if (!gem || !gem.classId) continue
    if (gem.color === 'cyans') {
      for (const statKey of Object.keys(bonus)) {
        bonus[statKey] += SPECTRA_STAT_PER_GEM
      }
    }
  }
  return bonus
}

/**
 * Get a hero's vantage rating.
 * @param {Object} hero - CharacterEntity
 * @returns {number}
 */
export function getHeroVantage(hero) {
  if (!hero) return 1
  const effectiveStats = getEffectiveStats(hero)
  const statBonus = (effectiveStats.Str + effectiveStats.Spi + effectiveStats.Int + effectiveStats.Con + effectiveStats.Dex) / 25
  return hero.baseVantage + (hero.level - 1) * 0.5 + statBonus
}

/**
 * Get the max vantage rating for a hero (99 + cap boost).
 * @param {Object} hero - CharacterEntity
 * @param {Object} gemBonuses - from getTotalGemBonuses
 * @returns {number}
 */
export function getHeroMaxVantage(hero, gemBonuses) {
  if (!hero) return 99
  return 99 + (gemBonuses.vantageCapBoost ?? 0)
}

/**
 * Get the hero's stat value that matches a class's scalingStat.
 * @param {Object} hero - CharacterEntity
 * @param {Object} classDef - class definition from gameData
 * @returns {number}
 */
export function getHeroScalingStatValue(hero, classDef) {
  if (!hero || !classDef || !classDef.scalingStat) return 0
  const effectiveStats = getEffectiveStats(hero)
  if (classDef.scalingStat === 'total') {
    return Object.values(effectiveStats).reduce((sum, value) => sum + value, 0)
  }
  return effectiveStats[classDef.scalingStat] || 0
}

/**
 * Resolve a class definition by classId from the global pool.
 * @param {string} classId
 * @returns {Object|null}
 */
export function getClassDef(classId) {
  if (!classId) return null
  return classDefinitions.find(c => c.id === classId) || null
}

/**
 * Get a gem's class definition.
 * @param {Object} gem - GemEntity
 * @returns {Object|null}
 */
export function getGemClassDef(gem) {
  if (!gem || !gem.classId) return null
  return getClassDef(gem.classId)
}

/**
 * Get the gem's scaling stat keys based on its class's flatStats.
 * @param {Object} gem - GemEntity
 * @returns {string[]}
 */
export function getGemScalingStats(gem) {
  const def = getGemClassDef(gem)
  if (!def || !def.flatStats) return []
  return Object.keys(def.flatStats)
}

/**
 * Compute combined stat value used for gem damage scaling.
 * @param {Object} gem - GemEntity
 * @param {Object} effectiveStats - { Str, Spi, Int, Con, Dex }
 * @returns {number}
 */
export function getGemScalingStatValue(gem, effectiveStats) {
  const stats = getGemScalingStats(gem)
  if (stats.length === 0) return 0
  if (stats.length === 1) return effectiveStats[stats[0]] || 0
  let total = 0
  for (const key of stats) {
    total += effectiveStats[key] || 0
  }
  return total / stats.length
}

/**
 * Compute scaled damage for a gem using effective hero stats.
 * @param {Object} gem - GemEntity
 * @param {Object} effectiveStats
 * @param {number} [perStatFactor=0.5]
 * @returns {number}
 */
export function computeGemScaledDamage(gem, effectiveStats, perStatFactor = 0.5) {
  const statVal = getGemScalingStatValue(gem, effectiveStats)
  return gem.dmg * (1 + statVal * perStatFactor)
}

/**
 * Sum all gem bonuses for a hero (class passives + rollable modifiers).
 * @param {Object} hero - CharacterEntity
 * @returns {Object} bonus totals
 */
export function getTotalGemBonuses(hero) {
  const totals = {
    vantagePerTap: 0,
    vantageAutoRate: 0,
    vantageCapBoost: 0,
    vantage99DmgMult: 2,
    critChance: 0,
    vantageCritChance: 0,
    critDamage: 0,
    doubleCrit: 0,
    damageMult: 0,
    idleDamageMult: 1,
    armyPerSecond: 0,
    goldPerSecond: 0,
    preferredStatBonus: 0,
    mysticAuraStatPerCompletion: 0,
    completionPerStat: { Str: 0, Spi: 0, Int: 0, Con: 0, Dex: 0 }
  }

  if (!hero || !hero.gemSlots) return totals
  const effectiveStats = getEffectiveStats(hero)

  for (const gemId of hero.gemSlots) {
    if (!gemId) continue
    const gem = hero.inventory?.getGem(gemId)
    if (!gem || !gem.classId) continue
    const def = getGemClassDef(gem)
    if (!def) continue

    const scale = getHeroScalingStatValue(hero, def)

    if (def.vantagePerTap !== undefined) {
      totals.vantagePerTap += def.vantagePerTap + scale * 0.02
    }
    if (def.vantageAutoRate !== undefined) {
      totals.vantageAutoRate += def.vantageAutoRate + scale * 0.01
    }
    // vantageCapBoost from gem modifiers
    const capBoost = getModifierValue(gem, 'vantageCapBoost')
    if (capBoost > 0) {
      totals.vantageCapBoost += capBoost
    }
    if (def.vantage99DmgMult !== undefined) {
      totals.vantage99DmgMult = Math.max(totals.vantage99DmgMult, def.vantage99DmgMult + scale * 0.01)
    }
    if (def.critChance !== undefined) {
      if (Array.isArray(def.critChance)) {
        const [min, max] = def.critChance
        const key = `_rc_${gem.id}`
        if (!totals[key]) {
          totals[key] = (min + Math.random() * (max - min)) / 100
        }
        totals.critChance += totals[key]
      } else {
        totals.critChance += def.critChance
      }
    }
    if (def.vantageCritChance !== undefined) {
      if (Array.isArray(def.vantageCritChance)) {
        const [min, max] = def.vantageCritChance
        const key = `_rvc_${gem.id}`
        if (!totals[key]) {
          totals[key] = (min + Math.random() * (max - min)) / 100
        }
        totals.vantageCritChance += totals[key]
      } else {
        totals.vantageCritChance += def.vantageCritChance
      }
    }
    if (def.doubleCrit !== undefined) {
      totals.doubleCrit += def.doubleCrit
    }
    if (def.armyPerSecond !== undefined) {
      totals.armyPerSecond += def.armyPerSecond + scale * 0.01
    }
    if (def.idleDamageMult !== undefined) {
      totals.idleDamageMult += (def.idleDamageMult + scale * 0.01) - 1
    }
    // Rollable modifiers (standard buffs + legendary)
    const dmgMult = getModifierValue(gem, 'damageMult')
    if (dmgMult > 0) {
      totals.damageMult += dmgMult + scale * 0.002
    }
    const vantageAuto = getModifierValue(gem, 'vantageAutoRate')
    if (vantageAuto > 0) {
      totals.vantageAutoRate += vantageAuto
    }
    const armyPS = getModifierValue(gem, 'armyPerSecond')
    if (armyPS > 0) {
      totals.armyPerSecond += armyPS
    }
    const critDmg = getModifierValue(gem, 'critDamage')
    if (critDmg > 0) {
      totals.critDamage += critDmg
    }
    const dblCrit = getModifierValue(gem, 'doubleCrit')
    if (dblCrit > 0) {
      totals.doubleCrit += dblCrit
    }
    const goldPS = getModifierValue(gem, 'goldPerSecond')
    if (goldPS > 0) {
      totals.goldPerSecond += goldPS
    }
    const idleDmg = getModifierValue(gem, 'idleDamageMult')
    if (idleDmg > 0) {
      totals.idleDamageMult += idleDmg
    }
    const prefStat = getModifierValue(gem, 'preferredStatBonus')
    if (prefStat > 0) {
      totals.preferredStatBonus += prefStat
    }
    const mysticAura = getModifierValue(gem, 'statPerCompletion')
    if (mysticAura > 0) {
      totals.mysticAuraStatPerCompletion += mysticAura
    }
    // completionStat: targeted per-completion stat bonus (guaranteed 1st modifier)
    if (gem.modifiers) {
      for (const mod of gem.modifiers) {
        if (mod.type === 'completionStat' && mod.targetStat && mod.value > 0) {
          if (totals.completionPerStat[mod.targetStat] !== undefined) {
            totals.completionPerStat[mod.targetStat] += mod.value
          }
        }
      }
    }
  }

  return totals
}

/**
 * Compute the final tap damage for a hero against an objective.
 * @param {Object} hero - CharacterEntity
 * @param {Object} objective - ObjectiveEntity
 * @param {Object} gemBonuses - result of getTotalGemBonuses
 * @param {boolean} cheatActive
 * @returns {number} damage amount
 */
export function calculateTapDamage(hero, objective, gemBonuses, cheatActive) {
  const vantage = getHeroVantage(hero)
  const effectiveArmy = objective.heroArmy || 1
  const overcoreMult = getOvercoreDmgMult(hero)

  let dmg = effectiveArmy * vantage * 0.05
  if (hero.vantageRating >= 99) {
    dmg *= (gemBonuses.vantage99DmgMult ?? 2) * overcoreMult
  }
  if (cheatActive) dmg *= 100

  // Double Crit (vantage crit)
  const doubleCritChance = gemBonuses.vantageCritChance ?? 0
  if (Math.random() < doubleCritChance) {
    dmg *= (1 + (gemBonuses.doubleCrit ?? 1))
  }
  // Regular Crit
  if (Math.random() < (gemBonuses.critChance ?? 0)) {
    dmg *= 2 + (gemBonuses.critDamage ?? 0)
  }

  // FINAL MULTIPLIER — damageMult is the last multiplication
  dmg *= (1 + (gemBonuses.damageMult ?? 0))

  return dmg
}

/**
 * Compute auto-strike damage for a hero.
 * @param {Object} hero - CharacterEntity
 * @param {Object} objective - ObjectiveEntity
 * @param {Object} gemBonuses
 * @param {boolean} cheatActive
 * @returns {number} damage amount
 */
export function calculateAutoStrikeDamage(hero, objective, gemBonuses, cheatActive) {
  const vantage = getHeroVantage(hero)
  const effectiveArmy = objective.heroArmy || 1
  const overcoreMult = getOvercoreDmgMult(hero)
  const maxVantageMult = hero.vantageRating >= 99 ? (gemBonuses.vantage99DmgMult ?? 2) * overcoreMult : 1

  let baseStrikeDps = effectiveArmy * vantage * 0.05 * maxVantageMult
  let autoDmg = baseStrikeDps * (gemBonuses.idleDamageMult ?? 1)
  if (cheatActive) autoDmg *= 100

  if (Math.random() < (gemBonuses.critChance ?? 0)) {
    autoDmg *= 2 + (gemBonuses.critDamage ?? 0)
  }

  // FINAL MULTIPLIER
  autoDmg *= (1 + (gemBonuses.damageMult ?? 0))

  return autoDmg
}

/**
 * Get the total value of a specific modifier type on a gem (summed across duplicates).
 * @param {Object} gem - GemEntity
 * @param {string} type
 * @returns {number}
 */
export function getModifierValue(gem, type) {
  if (!gem || !gem.modifiers) return 0
  let total = 0
  for (const mod of gem.modifiers) {
    if (mod.type === type) total += mod.value
  }
  return total
}

/**
 * Check if a gem has a specific modifier type.
 * @param {Object} gem
 * @param {string} type
 * @returns {boolean}
 */
export function hasModifier(gem, type) {
  if (!gem || !gem.modifiers) return false
  return gem.modifiers.some(m => m.type === type)
}

/**
 * Calculate a gem's raw DPS.
 * @param {Object} gem - GemEntity
 * @returns {number}
 */
export function getGemDPS(gem) {
  if (!gem || !gem.dmg || !gem.cd) return 0
  return gem.dmg / gem.cd
}

/**
 * Compute total force gain from all equipped gems on a hero.
 * @param {Object} hero - CharacterEntity
 * @returns {number}
 */
export function computeGemForceGain(hero) {
  if (!hero || !hero.gemSlots) return 0
  let totalForce = 0
  const effectiveStats = getEffectiveStats(hero)
  for (const gemId of hero.gemSlots) {
    if (!gemId) continue
    const gem = hero.inventory?.getGem(gemId)
    if (!gem || !gem.classId) continue
    const def = getGemClassDef(gem)
    if (!def || !def.scalingStat) continue
    const statVal = getHeroScalingStatValue(hero, def)
    totalForce += gem.dmg * (1 + statVal * 0.01)
  }
  return Math.round(totalForce)
}
