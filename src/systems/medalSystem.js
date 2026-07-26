// src/systems/medalSystem.js
// Pure medal logic — leveling, bonuses, target computation.
// No Vue imports. Receives entity data, returns results.

import { LEVEL_BASE, LEVEL_MULT, getMedalDefById, JOB_MEDAL_DEFS } from '../config/jobMedalData.js'

/**
 * Check all medals in a JobMedalSystemEntity for level-ups against current hero stats.
 * @param {Object} medalSystem - JobMedalSystemEntity
 * @param {Object} heroStats - { Str, Spi, Int, Con, Dex }
 * @returns {string[]} medalIds that leveled up
 */
export function checkAllMedals(medalSystem, heroStats) {
  const leveledUp = []
  if (!medalSystem || !medalSystem.medalSlots) return leveledUp
  for (const medal of medalSystem.medalSlots) {
    if (medal.isMaxLevel) continue
    let didLevelUp = false
    while (checkMedalLevelUp(medal, heroStats)) {
      didLevelUp = true
      if (medal.isMaxLevel) break
    }
    if (didLevelUp) {
      leveledUp.push(medal.medalId)
    }
  }
  return leveledUp
}

/**
 * Check if a single medal should level up (increments by ONE level).
 * @param {Object} medal - JobMedalEntity
 * @param {Object} heroStats
 * @returns {boolean}
 */
export function checkMedalLevelUp(medal, heroStats) {
  if (medal.isMaxLevel) return false
  if (getMedalStatValue(medal, heroStats) >= getMedalTarget(medal)) {
    medal.level++
    return true
  }
  return false
}

/**
 * Get the current stat points for a medal (SUM of tracked stat values).
 * @param {Object} medal - JobMedalEntity
 * @param {Object} heroStats
 * @returns {number}
 */
export function getMedalStatValue(medal, heroStats) {
  if (!medal || !heroStats) return 0
  const def = getMedalDefById(medal.medalId)
  if (!def) return 0
  const stats = def.stats || []
  if (stats.length === 0) return 0
  let total = 0
  for (const s of stats) {
    total += heroStats[s] || 0
  }
  return total
}

/**
 * Get the stat-points target for the next medal level.
 * @param {Object} medal - JobMedalEntity
 * @returns {number}
 */
export function getMedalTarget(medal) {
  if (medal.isMaxLevel) return Infinity
  let t = LEVEL_BASE
  for (let i = 0; i < medal.level; i++) {
    t = Math.ceil(t * LEVEL_MULT)
  }
  return t
}

/**
 * Get current progress fraction (0..1) toward next medal level.
 * @param {Object} medal - JobMedalEntity
 * @param {Object} heroStats
 * @returns {number}
 */
export function getMedalProgress(medal, heroStats) {
  if (medal.isMaxLevel) return 1
  const val = getMedalStatValue(medal, heroStats)
  const tgt = getMedalTarget(medal)
  if (tgt <= 0) return 1
  return Math.min(1, Math.max(0, val / tgt))
}

// ─── Job Medal Passive Bonuses ───

const JOB_PASSIVE_BASE = {
  vantageAutoRate: 0.05,
  armyPerSecond: 2,
  critDamage: 0.15,
  doubleCrit: 0.15,
  goldPerSecond: 1,
  idleDamageMult: 0.05,
  statPerCompletion: 0.01,
  preferredStatBonus: 0.01
}

const P10 = ['vantageAutoRate','armyPerSecond','critDamage','critDamage','doubleCrit','goldPerSecond','idleDamageMult','statPerCompletion','preferredStatBonus','doubleCrit']

function buildP(rot) {
  const base = P10
  const items = []
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < 10; i++) {
      items.push(base[(i + rot) % 10])
    }
  }
  const g = []
  for (let i = 0; i < 10; i++) g.push(items.slice(i * 3, i * 3 + 3))
  return g
}

const JOB_MEDAL_PASSIVES = {
  vanguard:      buildP(0)[0],  berserker:     buildP(0)[1],
  blademaster:   buildP(0)[2],  fury:          buildP(0)[3],
  ravager:       buildP(0)[4],  tempest:       buildP(0)[5],
  inferno:       buildP(0)[6],  warlord:       buildP(0)[7],
  onslaught:     buildP(0)[8],  overlord:      buildP(0)[9],
  tactician:     buildP(1)[0],  ranger:        buildP(1)[1],
  gunslinger:    buildP(1)[2],  spotter:       buildP(1)[3],
  strategist:    buildP(1)[4],  sharpshooter:  buildP(1)[5],
  patrol:        buildP(1)[6],  falcon:        buildP(1)[7],
  scope:         buildP(1)[8],  ace:           buildP(1)[9],
  rogue:         buildP(2)[0],  assassin:      buildP(2)[1],
  trickster:     buildP(2)[2],  scout:         buildP(2)[3],
  bandit:        buildP(2)[4],  shadowblade:   buildP(2)[5],
  poacher:       buildP(2)[6],  marauder:      buildP(2)[7],
  corsair:       buildP(2)[8],  shadow_king:   buildP(2)[9],
  mystic:        buildP(3)[0],  arcanist:      buildP(3)[1],
  enchanter:     buildP(3)[2],  sage:          buildP(3)[3],
  oracle:        buildP(3)[4],  aegis:         buildP(3)[5],
  seer:          buildP(3)[6],  weaver:        buildP(3)[7],
  luminary:      buildP(3)[8],  archon:        buildP(3)[9],
  brawler:       buildP(4)[0],  juggernaut:    buildP(4)[1],
  reaver:        buildP(4)[2],  pugilist:      buildP(4)[3],
  gladiator:     buildP(4)[4],  brute:         buildP(4)[5],
  colossus:      buildP(4)[6],  ironclad:      buildP(4)[7],
  titan:         buildP(4)[8],  war_master:    buildP(4)[9],
  executor:      buildP(5)[0],  voidcaller:    buildP(5)[1],
  doombringer:   buildP(5)[2],  judge:         buildP(5)[3],
  harbinger:     buildP(5)[4],  reaper:        buildP(5)[5],
  inquisitor:    buildP(5)[6],  fallen:        buildP(5)[7],
  eclipse:       buildP(5)[8],  death:         buildP(5)[9],
}

/**
 * Get bonus contributions from a single job medal.
 * @param {Object} medal - JobMedalEntity
 * @returns {Object}
 */
export function getJobMedalBonuses(medal) {
  if (!medal || medal.level <= 0) return {}
  const parts = medal.medalId.split('_')
  if (parts.length < 2) return {}
  const classId = parts.slice(1).join('_')
  const keys = JOB_MEDAL_PASSIVES[classId]
  if (!keys) return {}
  const lvl = Math.max(1, medal.level)
  const result = {}
  for (const key of keys) {
    const baseVal = JOB_PASSIVE_BASE[key] || 0
    result[key] = (result[key] || 0) + baseVal * lvl
  }
  return result
}

/**
 * Sum total bonuses from gem passives + job medals.
 * @param {Object} hero - CharacterEntity with gemBonuses
 * @param {Object} gemBonuses - from combatSystem.getTotalGemBonuses
 * @returns {Object}
 */
export function getTotalHeroBonuses(hero, gemBonuses) {
  if (!hero) return {}
  const bonuses = { ...gemBonuses }
  if (hero.jobMedals && hero.jobMedals.medalSlots) {
    for (const medal of hero.jobMedals.medalSlots) {
      if (!medal || medal.level <= 0) continue
      const medalBonuses = getJobMedalBonuses(medal)
      for (const [key, val] of Object.entries(medalBonuses)) {
        if (bonuses[key] !== undefined) {
          bonuses[key] += val
        }
      }
    }
  }
  return bonuses
}

/**
 * Get the stat keys tracked for a given medal index (0-9).
 * @param {number} index
 * @returns {string[]}
 */
export function getStatKeysForIndex(index) {
  const order = ['Str', 'Str', 'Dex', 'Dex', 'Spi', 'Spi', 'Int', 'Int', 'Con', 'Con']
  return [order[index] || 'Str']
}

/**
 * Compute the stat-points target for a medal level.
 * @param {number} level
 * @returns {number}
 */
export function getLevelTarget(level) {
  let t = LEVEL_BASE
  for (let i = 0; i < level; i++) {
    t = Math.ceil(t * LEVEL_MULT)
  }
  return t
}
