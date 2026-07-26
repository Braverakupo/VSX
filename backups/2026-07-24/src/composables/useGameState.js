// src/composables/useGameState.js
// Central reactive game state + all game logic

// ─── Overcore Damage Constants ───
// OC (Overcore) damage scales exponentially as vantageRating exceeds 99.
// Each point above 99 multiplies all damage by OVERCORE_BASE.
// e.g., at base 1.12: 99→1x, 100→1.12x, 110→3.48x, 125→~25x
const OVERCORE_BASE = 1.12

import { reactive, ref, computed, watch } from 'vue'
import { charTemplates, heroThemes, STAT_NAMES, GEMS_PER_COLOR, CHAR_GEM_COLOR, ALL_GEMS, localImages, HP_TICK_COUNT, HP_GRADIENT_ANCHORS, classDefinitions, abilityDefinitions } from '../config/gameData.js'
import { updateVideoForObjective } from './useVideoPool.js'
import { JOB_MEDAL_DEFS, CHAR_UNIT_KEYS } from '../config/jobMedalData.js'
import Gem from '../models/Gem.js'
import Character from '../models/Character.js'
import Inventory from '../models/Inventory.js'
import { rollAbilityForColor } from './useAbilityCalculator.js'
import * as SaveService from '../services/SaveService.js'
import { isLoaded } from './useAutoLoad.js'

// ─── Single local save — no account switching ───
export const currentSaveSlot = ref(0)
export const playerIdentity = 'local'

// ─── Last save timestamp (for autosave display) ───
export const lastSaveTime = ref(null)
export const lastSaveLabel = ref('')

// ─── Event-driven save cooldown (30s) to prevent thrash ───
const EVENT_SAVE_COOLDOWN = 30000
let lastEventSaveTime = 0
function saveGameWithCooldown() {
  const now = Date.now()
  if (now - lastEventSaveTime < EVENT_SAVE_COOLDOWN) return Promise.resolve(false)
  lastEventSaveTime = now
  return saveGame()
}

function updateSaveLabel() {
  if (!lastSaveTime.value) {
    lastSaveLabel.value = ''
    return
  }
  const seconds = Math.floor((Date.now() - lastSaveTime.value) / 1000)
  if (seconds < 5) {
    lastSaveLabel.value = 'saved now'
  } else if (seconds < 60) {
    lastSaveLabel.value = `${seconds}s ago`
  } else {
    const mins = Math.floor(seconds / 60)
    lastSaveLabel.value = `${mins}m ago`
  }
}

// ─── Create hero registry ───
function createHeroRegistry() {
  const reg = {}
  charTemplates.forEach(name => {
    reg[name] = new Character(name)
  })
  return reg
}

// ─── Reactive game state ───
export const heroRegistry = reactive(createHeroRegistry())

export const gameState = reactive({
  gold: 0,
  rebirthStones: 0,
  totalCompletions: 0,
  totalGoldEarned: 0,
  objectives: [],
  collectedGems: new Inventory({}),
  cheatActive: false,
  popoutHero: null // null | heroName
})

// ─── Viewport dimensions for responsive cards ───
export const viewportWidth = ref(window.innerWidth)
export const isMobileView = computed(() => viewportWidth.value < 600)

function onResize() { viewportWidth.value = window.innerWidth }

// ─── Formatting ───
export function formatNotation(n, decimals = 2) {
  if (n === Infinity || n === -Infinity || isNaN(n)) return "0"
  if (n < 0) return "-" + formatNotation(-n, decimals)
  if (n < 1000) {
    // Below 1000, never show decimals — always floor to integer
    return Math.floor(n).toString()
  }
  const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"]
  const tier = Math.min(suffixes.length - 1, Math.floor(Math.log10(n) / 3))
  const suffix = suffixes[tier]
  const scaled = n / Math.pow(10, tier * 3)
  // Format with up to N decimal places
  if (scaled < 10) return parseFloat(scaled.toFixed(decimals)) + suffix
  if (scaled < 100) return parseFloat(scaled.toFixed(decimals)) + suffix
  return Math.floor(scaled) + suffix
}

// ─── HP gradient ───
export function getHPGradientColor(index, total) {
  const anchors = HP_GRADIENT_ANCHORS
  const t = index / (total - 1)
  const scaledT = t * (anchors.length - 1)
  const i = Math.floor(scaledT)
  const subT = scaledT - i
  const start = anchors[i]
  const end = anchors[Math.min(i + 1, anchors.length - 1)]
  const r = Math.round(start.r + (end.r - start.r) * subT)
  const g = Math.round(start.g + (end.g - start.g) * subT)
  const b = Math.round(start.b + (end.b - start.b) * subT)
  return `rgb(${r},${g},${b})`
}

// ─── Gem stat bonuses ───
const SPECTRA_STAT_PER_GEM = 0.03   // +0.03 to all stats per equipped Spectra (cyan) gem
const OTHER_STAT_ON_COMPLETION = 0.01  // +0.01 to all stats per equipped non-cyan gem on completion

/**
 * Calculate the stat bonuses contributed by equipped Spectra (cyan) gems for a hero.
 * Each equipped cyan gem adds +0.03 to all 5 stats continuously.
 * @param {import('../models/Character.js').default} hero
 * @returns {Object} bonus stats { Str, Spi, Int, Con, Dex }
 */
export function getSpectraGemStatBonus(hero) {
  const bonus = { Str: 0, Spi: 0, Int: 0, Con: 0, Dex: 0 }
  if (!hero || !hero.gemSlots) return bonus

  for (const gemId of hero.gemSlots) {
    if (!gemId) continue
    const gem = hero.inventory?.getGem(gemId)
    if (!gem || !gem.hasClass) continue
    if (gem.color === 'cyans') {
      for (const statKey of Object.keys(bonus)) {
        bonus[statKey] += SPECTRA_STAT_PER_GEM
      }
    }
  }
  return bonus
}

/**
 * Get effective hero stats including bonuses from equipped Spectra gems.
 * @param {import('../models/Character.js').default} hero
 * @returns {Object} effective stats { Str, Spi, Int, Con, Dex }
 */
export function getEffectiveStats(hero, objective = null) {
  if (!hero) return { Str: 0, Spi: 0, Int: 0, Con: 0, Dex: 0 }
  const baseStats = { ...hero.stats }
  const spectraBonus = getSpectraGemStatBonus(hero)

  for (const statKey of Object.keys(baseStats)) {
    baseStats[statKey] = baseStats[statKey] + (spectraBonus[statKey] || 0)
  }

  if (objective) {
    // Gem-specific effective stat modifiers go here
  }

  for (const statKey of Object.keys(baseStats)) {
    baseStats[statKey] = Math.round(baseStats[statKey] * 100) / 100
  }
  return baseStats
}

function getHeroScalingStatValue(hero, classDef) {
  if (!hero || !classDef || !classDef.scalingStat) return 0
  const effectiveStats = getEffectiveStats(hero)
  if (classDef.scalingStat === 'total') {
    return Object.values(effectiveStats).reduce((sum, value) => sum + value, 0)
  }
  return effectiveStats[classDef.scalingStat] || 0
}

function getScaledGemValue(hero, classDef, baseValue, perStatFactor) {
  const scale = getHeroScalingStatValue(hero, classDef)
  return baseValue + scale * perStatFactor
}

export function getHeroGemBonuses(hero) {
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
    mysticAuraStatPerCompletion: 0
  }

  if (!hero || !hero.gemSlots) return totals

  for (const gemId of hero.gemSlots) {
    if (!gemId) continue
    const gem = hero.inventory?.getGem(gemId)
    if (!gem || !gem.hasClass) continue
    const def = gem.classDef
    if (!def) continue

    if (def.vantagePerTap !== undefined) {
      totals.vantagePerTap += getScaledGemValue(hero, def, def.vantagePerTap, 0.02)
    }
    if (def.vantageAutoRate !== undefined) {
      totals.vantageAutoRate += getScaledGemValue(hero, def, def.vantageAutoRate, 0.01)
    }
    // vantageCapBoost now comes from gem modifiers (red gems only), not class defs
    if (gem.hasModifier('vantageCapBoost')) {
      totals.vantageCapBoost += gem.getModifierValue('vantageCapBoost')
    }
    if (def.vantage99DmgMult !== undefined) {
      totals.vantage99DmgMult = Math.max(totals.vantage99DmgMult, getScaledGemValue(hero, def, def.vantage99DmgMult, 0.01))
    }
    if (def.critChance !== undefined) {
      if (Array.isArray(def.critChance)) {
        const [min, max] = def.critChance
        if (gem._rolledCritChance === undefined) {
          gem._rolledCritChance = min + Math.random() * (max - min)
        }
        totals.critChance += gem._rolledCritChance / 100
      } else {
        totals.critChance += def.critChance
      }
    }
    if (def.vantageCritChance !== undefined) {
      if (Array.isArray(def.vantageCritChance)) {
        const [min, max] = def.vantageCritChance
        if (gem._rolledVantageCritChance === undefined) {
          gem._rolledVantageCritChance = min + Math.random() * (max - min)
        }
        totals.vantageCritChance += gem._rolledVantageCritChance / 100
      } else {
        totals.vantageCritChance += def.vantageCritChance
      }
    }
    if (def.doubleCrit !== undefined) {
      totals.doubleCrit += def.doubleCrit
    }
    // ── Rollable gem modifiers (affixes) ──
    // damageMult is stat-scaled via class scalingStat.
    if (gem.hasModifier('damageMult')) {
      totals.damageMult += getScaledGemValue(hero, def, gem.getModifierValue('damageMult'), 0.002)
    }
    // mysticaAuraStatPerCompletion (Mystic Aura modifier) — applied to all stats on completion
    if (gem.hasModifier('statPerCompletion')) {
      totals.mysticAuraStatPerCompletion += gem.getModifierValue('statPerCompletion')
    }
    if (def.idleDamageMult !== undefined) {
      totals.idleDamageMult += getScaledGemValue(hero, def, def.idleDamageMult, 0.01) - 1
    }
  }

  return totals
}

// ═══════════════════════════════════════════════════════════════
// JOB MEDALS — STAT TRACKING + FORCE SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Select which medal slot is focused for detail display.
 * @param {string} heroName
 * @param {number} slotIndex - 0..9
 */
export function selectJobMedal(heroName, slotIndex) {
  const hero = heroRegistry[heroName]
  if (!hero || !hero.jobMedals) return
  hero.jobMedals.selectedMedalIndex = slotIndex
}

/**
 * Check all job medals for level-ups based on current hero stats.
 * Called after stats change (e.g., objective completion).
 * @param {string} heroName
 * @param {Object} effectiveStats - current effective hero stats
 * @returns {Array<string>} medalIds that leveled up
 */
export function checkMedalLevelUps(heroName, effectiveStats) {
  const hero = heroRegistry[heroName]
  if (!hero || !hero.jobMedals) return []

  const leveledUp = hero.jobMedals.checkAllMedals(effectiveStats)
  for (const medalId of leveledUp) {
    const def = JOB_MEDAL_DEFS[heroName]?.find(d => d.id === medalId)
    console.log(`[Medal] ${heroName}: ${def?.name || medalId} leveled up!`)
  }
  return leveledUp
}

/**
 * Compute total passives from equipped gems + job medals.
 * @param {import('../models/Character.js').default} hero
 * @returns {Object}
 */
export function getTotalHeroBonuses(hero) {
  if (!hero) return {}
  const bonuses = getHeroGemBonuses(hero)
  // Add job medal contributions
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

// Passive base values for job medal bonuses (matches StatSlidePanel)
const JOB_PASSIVE_BASE = {
  vantageAutoRate: 0.05,
  armyPerSecond: 2,
  critDamage: 0.15,
  doubleCrit: 0.02,
  goldPerSecond: 1,
  idleDamageMult: 0.05,
  statPerCompletion: 0.01,
  preferredStatBonus: 0.01
}

// Same 10 passives, each appearing 3× per character
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
  oracle:        buildP(3)[4],  luminari:      buildP(3)[5],
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

// Get bonus contributions from a single job medal
function getJobMedalBonuses(medal) {
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

export function getHeroVantage(heroName) {
  const hero = heroRegistry[heroName]
  if (!hero) return 1
  const objective = gameState.objectives.find(o => o.name === heroName)
  const effectiveStats = getEffectiveStats(hero, objective)
  const statBonus = (effectiveStats.Str + effectiveStats.Spi + effectiveStats.Int + effectiveStats.Con + effectiveStats.Dex) / 25
  return hero.baseVantage + (hero.level - 1) * 0.5 + statBonus
}

/**
 * Compute the Overcore (OC) damage multiplier.
 * Scales exponentially with each point of vantageRating above 99, uncapped.
 * At base 1.12: vantage 200 → 1.12^101 ≈ 47,000x
 * @param {import('../models/Character.js').default} hero
 * @param {number} [overcoreBase] - exponential base (default: OVERCORE_BASE)
 * @returns {number} OC multiplier (1.0 when at or below 99)
 */
export function getOvercoreDmgMult(hero, overcoreBase = OVERCORE_BASE) {
  if (!hero) return 1
  const overcap = Math.max(0, hero.vantageRating - 99)
  if (overcap <= 0) return 1
  return Math.pow(overcoreBase, overcap)
}

export function getHeroMaxVantage(hero) {
  if (!hero) return 99
  const bonuses = getTotalHeroBonuses(hero)
  return 99 + (bonuses.vantageCapBoost ?? 0)
}

/**
 * Compute the starting army for a hero at the beginning of a rebirth (or new game).
 * Returns a flat 260 starting force, no grade or stat scaling.
 * @param {string} heroName
 * @param {number} grade
 * @returns {number} starting army value
 */
function computeStartingArmy(heroName, grade) {
  return 260
}

/**
 * Calculate total Force gain from all equipped gems on a hero.
 * Each gem contributes its base damage, scaled by the hero's stat matching the gem class's scalingStat.
 * @param {import('../models/Character.js').default} hero
 * @param {Object} objective - the current objective instance (for effective stats)
 * @returns {number} total force gain (rounded)
 */
function computeGemForceGain(hero, objective) {
  if (!hero || !hero.gemSlots) return 0
  let totalForce = 0
  const effectiveStats = getEffectiveStats(hero, objective)
  for (const gemId of hero.gemSlots) {
    if (!gemId) continue
    const gem = hero.inventory?.getGem(gemId)
    if (!gem || !gem.hasClass || !gem.classDef) continue
    const classDef = gem.classDef
    if (!classDef.scalingStat) continue
    const statVal = getHeroScalingStatValue(hero, classDef)
    totalForce += gem.dmg * (1 + statVal * 0.01)
  }
  return Math.round(totalForce)
}

function getBaseEnemyMax(grade) {
  return 1000 * Math.pow(2, grade - 1)
}

function getEnemyMaxForCompletion(grade, completed) {
  return getBaseEnemyMax(grade) * Math.pow(1.6, completed)
}

function getGoldPerCompletion(completed) {
  return 10 + completed * 2
}

function getTotalForRebirth(grade, lastRebirthStage) {
  return 10 + lastRebirthStage
}

// ─── Objective creation ───
export function createObjectiveInstance(heroName, gradeOverride) {
  const hero = heroRegistry[heroName]
  if (!hero) return
  const gen = gameState.objectives.filter(o => o.name === heroName).length + 1
  const grade = gradeOverride || hero.grade || 1
  const baseMax = getBaseEnemyMax(grade)
  const totalCompletionsNeeded = getTotalForRebirth(grade, hero.lastRebirthStage)

  const startingArmy = computeStartingArmy(heroName, grade)

  const obj = reactive({
    id: Math.random().toString(36).substr(2, 9),
    name: heroName,
    generation: gen,
    grade,
    heroArmy: startingArmy,
    enemyArmyMax: baseMax,
    enemyArmyCurrent: baseMax,
    completed: 0,
    totalCompletionsNeeded,
    portraitUrl: null,
    barUrl: null,
    mp4Url: null,
    dmgPopupTimer: 0,
    combatAccumulator: 0,
    autoDmgId: 0,
    // Crypsis mark
    // For canvas video
    videoReady: false,
  })
  assignVisuals(obj, hero?.mp4Index ?? 0)
  gameState.objectives.push(obj)
  return obj
}

function assignVisuals(obj, mp4Index) {
  const charImages = localImages[obj.name]
  if (!charImages) return
  if (charImages.portraits.length > 0) {
    obj.portraitUrl = charImages.portraits[Math.floor(Math.random() * charImages.portraits.length)]
  }
  if (charImages.bars.length > 0) {
    obj.barUrl = charImages.bars[Math.floor(Math.random() * charImages.bars.length)]
  }
  if (charImages.starred && charImages.starred.length > 0) {
    const pool = charImages.starred
    const idx = (mp4Index ?? 0) % pool.length
    obj.mp4Url = pool[idx]
  }
}

// ─── XP system ───
export function addXP(heroName, amount) {
  const hero = heroRegistry[heroName]
  if (!hero) return
  hero.xp += amount
  while (hero.xp >= hero.maxXp) {
    hero.xp -= hero.maxXp
    hero.level++
    hero.maxXp = Math.floor(100 * Math.pow(1.35, hero.level - 1))
  }
}

// ─── Completion handler (shared by taps + game loop) ───
function processObjectiveCompletion(obj) {
  const hero = heroRegistry[obj.name]
  if (!hero) return

  obj.completed++
  gameState.totalCompletions++

  // Award a gem unit based on this hero's color
  const colorKey = CHAR_GEM_COLOR[obj.name]
  const unitMap = { reds: 'red_unit', blues: 'blue_unit', oranges: 'orange_unit', cyans: 'cyan_unit', purples: 'purple_unit', blacks: 'black_unit' }
  const unitKey = unitMap[colorKey]
  if (unitKey) {
    gameState.gemUnits[unitKey] = (gameState.gemUnits[unitKey] || 0) + 1
  }

  // Update max HP for next stage based on new completion count
  obj.enemyArmyMax = getEnemyMaxForCompletion(obj.grade, obj.completed)

  const goldReward = getGoldPerCompletion(obj.completed) * obj.grade
  gameState.totalGoldEarned += goldReward
  gameState.gold = (gameState.gold || 0) + goldReward

  // Track stat changes for job medal feeding
  const statChanges = {}
  const bonuses = getTotalHeroBonuses(hero)

  // Award base stat bonus to preferred stats
  if (hero.preferredStats.length > 0) {
    hero.preferredStats.forEach(s => {
      const gain = 0.01 + (bonuses.preferredStatBonus ?? 0)
      statChanges[s] = (statChanges[s] || 0) + gain
      hero.stats[s] = Math.round((hero.stats[s] + gain) * 100) / 100
    })
  }

  if (hero.gemSlots) {
    for (const gemId of hero.gemSlots) {
      if (!gemId) continue
      const gem = hero.inventory?.getGem(gemId)
      if (!gem || !gem.hasClass) continue
      const def = gem.classDef
      if (!def) continue

      // statPerCompletion from job medals applies to flatStats; Mystic Aura is applied separately to all stats below
      const jobMedalStatPerCompletion = (bonuses.statPerCompletion ?? 0) - (bonuses.mysticAuraStatPerCompletion ?? 0)
      const statGain = (def.statPerCompletion !== undefined ? def.statPerCompletion : OTHER_STAT_ON_COMPLETION) + Math.max(0, jobMedalStatPerCompletion)
      if (def.flatStats) {
        for (const statKey of Object.keys(def.flatStats)) {
          if (hero.stats[statKey] !== undefined) {
            statChanges[statKey] = (statChanges[statKey] || 0) + statGain
            hero.stats[statKey] = Math.round((hero.stats[statKey] + statGain) * 100) / 100
          }
        }
      }
      if (def.preferredStatBonus && hero.preferredStats.length > 0) {
        const preferredGain = Math.max(0.01, Math.min(0.05, def.preferredStatBonus))
        hero.preferredStats.forEach(s => {
          if (hero.stats[s] !== undefined) {
            statChanges[s] = (statChanges[s] || 0) + preferredGain
            hero.stats[s] = Math.round((hero.stats[s] + preferredGain) * 100) / 100
          }
        })
      }
    }
  }

  // ── Mystic Aura (legendary gem modifier): +0.10 to ALL stats per completion ──
  const mysticAuraBonus = bonuses.mysticAuraStatPerCompletion ?? 0
  if (mysticAuraBonus > 0) {
    const allStats = ['Str', 'Spi', 'Int', 'Con', 'Dex']
    for (const statKey of allStats) {
      if (hero.stats[statKey] !== undefined) {
        statChanges[statKey] = (statChanges[statKey] || 0) + mysticAuraBonus
        hero.stats[statKey] = Math.round((hero.stats[statKey] + mysticAuraBonus) * 100) / 100
      }
    }
  }

  // Check job medals against current hero stats for level ups
  if (hero.jobMedals) {
    const effectiveStats = getEffectiveStats(hero, obj)
    const leveledUp = hero.jobMedals.checkAllMedals(effectiveStats)
    if (leveledUp.length > 0) {
      for (const medalId of leveledUp) {
        const def = JOB_MEDAL_DEFS[hero.name]?.find(d => d.id === medalId)
        console.log(`[Medal] ${hero.name}: ${def?.name || medalId} leveled up!`)
      }
      // Advance cinematic MP4 on medal level-up (cycle through 10 MP4s)
      if (localImages[hero.name]?.starred?.length > 0) {
        const pool = localImages[hero.name].starred
        hero.mp4Index = (hero.mp4Index + 1) % pool.length
        obj.mp4Url = pool[hero.mp4Index]
      }
    }
  }

  obj.enemyArmyCurrent = obj.enemyArmyMax

  // Persist progress on meaningful milestone (cooldown: 30s)
  saveGameWithCooldown()
}

// ─── Tap objective ───
export function tapObjective(event, objId) {
  const rect = event.currentTarget.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const clickY = event.clientY - rect.top

  const obj = gameState.objectives.find(o => o.id === objId)
  if (!obj) return
  const hero = heroRegistry[obj.name]
  if (!hero) return

  const gemBonuses = getTotalHeroBonuses(hero)

  // ── VANTAGE: gain on tap ──
  const maxVantage = 99 + (gemBonuses.vantageCapBoost ?? 0)
  const gain = 1 + (gemBonuses.vantagePerTap ?? 0)
  hero.vantageRating = Math.floor(Math.min(maxVantage, hero.vantageRating + gain))
  console.log(`[VANTAGE] tap: ${obj.name} rating=${hero.vantageRating}, maxVantage=${maxVantage}, cinematic=${!!cinematicActive[obj.id]}`)
  if (hero.vantageRating >= 99) {
    triggerCinematicMP4(obj)
  }

  const vantage = getHeroVantage(obj.name)
  const effectiveArmy = (obj.heroArmy || 1)
  const overcoreMult = getOvercoreDmgMult(hero)

  let dmg = effectiveArmy * vantage * 0.05
  if (hero.vantageRating >= 99) dmg *= (gemBonuses.vantage99DmgMult ?? 2) * overcoreMult
  if (gameState.cheatActive) dmg *= 100

  const doubleCritChance = gemBonuses.vantageCritChance ?? 0
  const critChance = gemBonuses.critChance ?? 0

  // Double Crit: rolled independently from regular crit, both can apply
  if (Math.random() < doubleCritChance) {
    dmg *= (1 + (gemBonuses.doubleCrit ?? 1))
  }
  // Regular Crit: rolled independently
  if (Math.random() < critChance) {
    dmg *= 2 + (gemBonuses.critDamage ?? 0)
  }

  // ═══════════════════════════════════════════════════════════════
  // FINAL MULTIPLIER — damageMult MUST be the LAST multiplication
  // applied to any damage value. This is the "final damage" step
  // from class passives (gems + job medals). Nothing else should
  // multiply damage after this point.
  // ═══════════════════════════════════════════════════════════════
  dmg *= (1 + (gemBonuses.damageMult ?? 0))

  obj.enemyArmyCurrent = Math.round(Math.max(0, obj.enemyArmyCurrent - dmg) * 100) / 100
  obj.totalDamageDealt = (obj.totalDamageDealt || 0) + dmg
  addXP(obj.name, dmg / 1000)

  // ── KAILIN AOE: splash damage to all other objectives ──
  if (obj.name === 'Kailin') {
    const aoeShare = gemBonuses.aoeDamageShare ?? 0
    if (aoeShare > 0) {
      const splashDmg = dmg * aoeShare
      for (const otherObj of gameState.objectives) {
        if (otherObj.name !== 'Kailin') {
          otherObj.enemyArmyCurrent = Math.round(Math.max(0, otherObj.enemyArmyCurrent - splashDmg) * 100) / 100
        }
      }
    }
  }

  obj.heroArmy += 1 * hero.level

  // Immediately process completion if HP reached 0
  if (obj.enemyArmyCurrent <= 0 && obj.enemyArmyMax > 0) {
    processObjectiveCompletion(obj)
  }

  // Spawn damage popup coordinates
  return { dmg, x: clickX, y: clickY, obj }
}

// ─── Cinematic MP4 ───
// Keyed by obj.id for per-object tracking, plus a per-hero timer ref to prevent stale timers
const cinematicActive = {}
const cinematicHeroTimers = {}  // { [heroName]: timerId } — only one timer per hero

export function triggerCinematicMP4(obj) {
  const hero = heroRegistry[obj.name]
  if (!hero) return
  const now = Date.now()
  console.log(`[VANTAGE] cinematic START: ${obj.name}, rating=${hero.vantageRating}, t=${now}`)
  if (cinematicActive[obj.id]) {
    console.log(`[VANTAGE] cinematic SKIP (already active): ${obj.name}, t=${now}`)
    return
  }
  cinematicActive[obj.id] = true

  // Clear any stale timer from a previous objective instance (e.g. after rebirth)
  if (cinematicHeroTimers[obj.name]) {
    clearTimeout(cinematicHeroTimers[obj.name])
    console.log(`[VANTAGE] cleared stale timer for ${obj.name}`)
  }

  // Flash effect handled by component

  // Play video - handled by useVideoPool
  // After 30s: reset
  const timerId = setTimeout(() => {
    const elapsed = Date.now() - now
    console.log(`[VANTAGE] cinematic END: ${obj.name}, elapsed=${elapsed}ms, resetting to 0, t=${Date.now()}`)
    hero.vantageRating = 0
    delete cinematicActive[obj.id]
    delete cinematicHeroTimers[obj.name]
  }, 30000)
  cinematicHeroTimers[obj.name] = timerId
}

export function isCinematicActive(objId) {
  return !!cinematicActive[objId]
}

// ─── Upgrade ───
export function upgrade(heroName) {
  const hero = heroRegistry[heroName]
  if (!hero) return
  const universalGold = gameState.gold || 0
  const cost = Math.max(1, Math.floor(universalGold * 0.1))
  if (universalGold < cost) return
  gameState.gold = universalGold - cost
  const obj = gameState.objectives.find(o => o.name === heroName)
  if (obj) obj.heroArmy += cost

  // Persist after spending gold (cooldown: 30s)
  saveGameWithCooldown()
}

// ─── Rebirth ───
export function rebirthObjective(objId) {
  const obj = gameState.objectives.find(o => o.id === objId)
  if (!obj) return
  const hero = heroRegistry[obj.name]
  if (!hero) return
  if (obj.completed < obj.totalCompletionsNeeded) return

  if (cinematicActive[obj.id]) {
    hero.vantageRating = 0
    delete cinematicActive[obj.id]
    // Clear the hero's timer so it doesn't fire after rebirth resets everything
    if (cinematicHeroTimers[obj.name]) {
      clearTimeout(cinematicHeroTimers[obj.name])
      delete cinematicHeroTimers[obj.name]
    }
  }

  const stoneGain = Math.max(1, obj.completed)
  gameState.rebirthStones += stoneGain
  hero.lastRebirthStage++

  // Award a unique Gem instance into this character's personal inventory
  // The gem snapshots 1% of the character's current stats
  const gemColor = CHAR_GEM_COLOR[obj.name] || "reds"
  const gemPool = ALL_GEMS[gemColor]
  if (gemPool && gemPool.length > 0) {
    const randomIdx = Math.floor(Math.random() * gemPool.length)

    // Roll a random class (all classes available regardless of gem color)
    const classId = rollAbilityForColor()

    // Roll tier between 1 and 5
    const rolledTier = Math.floor(Math.random() * 5) + 1

    // Scale base damage by the number of stages completed in this cycle.
    // Each completed stage adds +5% more base damage, rewarding later rebirths.
    const scaledDmg = rolledTier * 20 * (1 + obj.completed * 0.05)

    const gem = new Gem(gemColor, randomIdx, {
      tier: rolledTier,
      classId: classId,
      dmg: scaledDmg
    })
    // Add to this character's personal inventory instead of global
    hero.inventory.addGem(gem)

    // Auto-equip the newly rebirthed gem if the hero has empty slots
    const filledSlots = hero.gemSlots.filter(s => s !== null).length
    if (filledSlots < GEMS_PER_COLOR) {
      const emptyIdx = hero.gemSlots.indexOf(null)
      if (emptyIdx !== -1) {
        hero.gemSlots[emptyIdx] = gem.id
      }
    }

    // Immediately persist
    saveGame()
  }

  const totalCompletionsNeeded = getTotalForRebirth(obj.grade, hero.lastRebirthStage)

  const startingArmy = computeStartingArmy(obj.name, obj.grade)
  const gemForceGain = computeGemForceGain(hero, obj)
  const totalStartingArmy = startingArmy + gemForceGain

  const newObj = reactive({
    id: Math.random().toString(36).substr(2, 9),
    name: obj.name,
    generation: obj.generation + 1,
    grade: obj.grade,
    heroArmy: totalStartingArmy,
    enemyArmyMax: getBaseEnemyMax(obj.grade),
    enemyArmyCurrent: getBaseEnemyMax(obj.grade),
    completed: 0,
    totalCompletionsNeeded,
    portraitUrl: null,
    barUrl: null,
    mp4Url: null,
    dmgPopupTimer: 0,
    combatAccumulator: 0,
    autoDmgId: 0,
    videoReady: false
  })
  // Advance cinematic MP4 on rebirth (cycle through the pool)
  if (localImages[hero.name]?.starred?.length > 0) {
    const pool = localImages[hero.name].starred
    hero.mp4Index = (hero.mp4Index + 1) % pool.length
  }
  assignVisuals(newObj, hero.mp4Index ?? 0)

  const idx = gameState.objectives.indexOf(obj)
  if (idx !== -1) gameState.objectives[idx] = newObj

  // Notify the video pool to hot-swap to the new cinematic MP4
  updateVideoForObjective(newObj)
}

// ─── Stat system ───
export function togglePreferredStat(heroName, statName) {
  const hero = heroRegistry[heroName]
  if (!hero) return
  const idx = hero.preferredStats.indexOf(statName)
  if (idx !== -1) {
    hero.preferredStats.splice(idx, 1)
  } else {
    if (hero.preferredStats.length >= 2) {
      hero.preferredStats.shift()
    }
    hero.preferredStats.push(statName)
  }
}

export function openCharPopout(heroName) {
  gameState.popoutHero = heroName
}

export function closeCharPopout() {
  gameState.popoutHero = null
}

// ─── Cheats ───
export function toggleCheat() {
  gameState.cheatActive = !gameState.cheatActive
}

export function vantage99All() {
  charTemplates.forEach(name => {
    const hero = heroRegistry[name]
    if (!hero) return
    hero.vantageRating = 99
  })
  gameState.objectives.forEach(obj => {
    const hero = heroRegistry[obj.name]
    if (hero && hero.vantageRating === 99) {
      triggerCinematicMP4(obj)
    }
  })
}

export function lvlPlusOneAll() {
  charTemplates.forEach(name => {
    const hero = heroRegistry[name]
    if (!hero) return
    hero.level++
    hero.maxXp = Math.floor(100 * Math.pow(1.35, hero.level - 1))
  })
}

/**
 * Clear all gems and seed 60 skill gems (10 per color × 6 colors) for testing.
 * Each gem gets a unique ability from its color pool (all 10 abilities per pool).
 * Gems are placed in the inventory — heroes start with empty gem slots.
 */
export function clearSaveData() {
  // Reset collected gems
  gameState.collectedGems = new Inventory({})
  // Clear all hero gem slots
  charTemplates.forEach(name => {
    const hero = heroRegistry[name]
    if (hero) {
      hero.gemSlots = Array(GEMS_PER_COLOR).fill(null)
    }
  })

  // ── Seed one starter gem per character ──
  const heroColorMap = {
    Voltkin:  'reds',
    Ashbeam:  'blues',
    Crypsis:  'oranges',
    Spectra:  'cyans',
    Hellshift:'purples',
    Kailin:   'blacks'
  }
  for (const heroName of charTemplates) {
    const color = heroColorMap[heroName] || CHAR_GEM_COLOR[heroName]
    if (!color) continue
    const gemPool = ALL_GEMS[color]
    if (!gemPool || gemPool.length === 0) continue

    // Use the first gem image (index 0)
    const gemIdx = 0
    // Roll a random class so the gem has effects
    const classId = rollAbilityForColor()
    const gem = new Gem(color, gemIdx, {
      tier: 1,
      classId
    })
    gameState.collectedGems.addGem(gem)
  }
}

/**
 * Auto-fill empty gem slots from inventory using matching color gems.
 * Each hero gets up to GEMS_PER_COLOR gems of their assigned color.
 */
export function autoEquipGems() {
  const heroColorMap = {
    Voltkin:  'reds',
    Ashbeam:  'blues',
    Crypsis:  'oranges',
    Spectra:  'cyans',
    Hellshift:'purples',
    Kailin:   'blacks'
  }
  for (const heroName of charTemplates) {
    const hero = heroRegistry[heroName]
    if (!hero) continue
    const color = heroColorMap[heroName] || CHAR_GEM_COLOR[heroName]
    if (!color) continue

    // Count filled slots
    const filledCount = hero.gemSlots.filter(s => s !== null).length
    if (filledCount >= GEMS_PER_COLOR) continue

    // Find matching color gems not already equipped anywhere
    const equippedIds = new Set()
    for (const name of charTemplates) {
      const h = heroRegistry[name]
      if (h && h.gemSlots) {
        for (const gid of h.gemSlots) {
          if (gid) equippedIds.add(gid)
        }
      }
    }
    const availableGems = gameState.collectedGems.getAll()
      .filter(g => g.color === color && !equippedIds.has(g.id))

    // Fill empty slots
    for (let i = 0; i < hero.gemSlots.length && availableGems.length > 0; i++) {
      if (!hero.gemSlots[i]) {
        hero.gemSlots[i] = availableGems.shift().id
      }
    }
  }
}

/**
 * Delete a gem from the game entirely: remove from all inventories (global + per-hero)
 * and unequip from any hero slot.
 */
export function deleteGem(gemId) {
  if (!gemId) return

  // Unequip from any hero that has it
  for (const name of charTemplates) {
    const hero = heroRegistry[name]
    if (!hero || !hero.gemSlots) continue
    const idx = hero.gemSlots.indexOf(gemId)
    if (idx !== -1) {
      hero.gemSlots[idx] = null
    }
  }

  // Remove from global collected gems
  gameState.collectedGems.removeGem(gemId)

  // Also remove from every hero's personal inventory (StatSlidePanel reads from hero.inventory)
  for (const name of charTemplates) {
    const hero = heroRegistry[name]
    if (hero && hero.inventory) {
      hero.inventory.removeGem(gemId)
    }
  }
}

export function seedExampleGems() {
  // Clear all existing gems
  gameState.collectedGems = new Inventory({})

  // Clear all hero gemSlots
  charTemplates.forEach(name => {
    const hero = heroRegistry[name]
    if (hero) {
      hero.gemSlots = Array(GEMS_PER_COLOR).fill(null)
    }
  })

  // Map hero to their color
  const heroColorMap = {
    Voltkin:  'reds',
    Ashbeam:  'blues',
    Crypsis:  'oranges',
    Spectra:  'cyans',
    Hellshift:'purples',
    Kailin:   'blacks'
  }

  // All classes are available to all gems regardless of color
  const allClassIds = classDefinitions.map(c => c.id)
  const allGemIds = []

  // Create 10 gems per color (index 0-9 matches gemIdx 0-9)
  for (const colorKey of Object.values(heroColorMap)) {
    const gemPool = ALL_GEMS[colorKey]
    if (!gemPool || gemPool.length === 0) continue

    for (let i = 0; i < GEMS_PER_COLOR; i++) {
      const gemIdx = i % gemPool.length
      const classId = allClassIds[i % allClassIds.length]

      const gem = new Gem(colorKey, gemIdx, {
        tier: 1 + (i % 5),
        classId
      })
      gameState.collectedGems.addGem(gem)
      allGemIds.push(gem.id)
    }
  }

  // ── Safety net: ensure at least one Brawler/Reaver class is in the collection ──
  const hasBrawlerClass = gameState.collectedGems.getAll().some(
    g => g.classDef?.armyPerSecond
  )
  if (!hasBrawlerClass) {
    const purplePool = ALL_GEMS['purples']
    if (purplePool && purplePool.length > 0) {
      const gemIdx = Math.floor(Math.random() * purplePool.length)
      const brawlerGem = new Gem('purples', gemIdx, {
        tier: 4,
        classId: 'reaver'
      })
      gameState.collectedGems.addGem(brawlerGem)
      allGemIds.push(brawlerGem.id)
    }
  }

  saveGame()
  const allGems = gameState.collectedGems.getAll()
  const totalEquipped = charTemplates.reduce((sum, name) => {
    const h = heroRegistry[name]
    return sum + (h ? h.gemSlots.filter(s => s !== null).length : 0)
  }, 0)
  console.log(`[Seed] Added ${allGems.length} skill gems, ${totalEquipped} equipped across ${charTemplates.length} heroes`)
}

// ─── Gem drag & drop (character-owned gemSlots) ───
export function moveGem(fromHero, fromSlot, toHero, toSlot) {
  const fromHeroData = heroRegistry[fromHero]
  const toHeroData = heroRegistry[toHero]
  if (!fromHeroData || !toHeroData) return false

  const temp = fromHeroData.gemSlots[fromSlot]
  fromHeroData.gemSlots[fromSlot] = toHeroData.gemSlots[toSlot]
  toHeroData.gemSlots[toSlot] = temp
  return true
}

export function equipGem(heroName, slotIndex, gemId) {
  const hero = heroRegistry[heroName]
  if (!hero) return false

  // Look up the gem in this character's personal inventory
  // (gems are now per-character, not global)
  const gem = hero.inventory.getGem(gemId)
  if (!gem) return false

  // Check if already equipped in this hero's slots — swap positions
  const existingIdx = hero.gemSlots.indexOf(gemId)
  if (existingIdx !== -1) {
    const temp = hero.gemSlots[existingIdx]
    hero.gemSlots[existingIdx] = hero.gemSlots[slotIndex]
    hero.gemSlots[slotIndex] = temp
  } else {
    hero.gemSlots[slotIndex] = gemId
  }
  // Persist gem equipment changes immediately on manipulation
  saveGemChanges()
  return true
}

export function unequipGem(heroName, slotIndex) {
  const hero = heroRegistry[heroName]
  if (!hero) return
  hero.gemSlots[slotIndex] = null
  // Persist gem equipment changes immediately on manipulation
  saveGemChanges()
}

// ─── Save/Load ───
export async function saveGame() {
  // Do not allow saves until the initial load has completed.
  // This prevents overwriting save data with an empty/partial state
  // before the game has finished initializing.
  if (!isLoaded.value) {
    console.warn('[saveGame] Blocked — initial load not yet complete')
    return false
  }

  try {
    // Serialize collectedGems — just what's in memory, no merging
    const collectedGemsSerialized = gameState.collectedGems instanceof Inventory
      ? gameState.collectedGems.toJSON()
      : gameState.collectedGems

    // Serialize heroes: each Character instance -> plain JSON via toJSON()
    const heroesSerialized = {}
    charTemplates.forEach(name => {
      const h = heroRegistry[name]
      heroesSerialized[name] = h instanceof Character ? h.toJSON() : {
        name: h.name,
        level: h.level, xp: h.xp, maxXp: h.maxXp,
        baseVantage: h.baseVantage,
        grade: h.grade, vantageRating: h.vantageRating,
        lastRebirthStage: h.lastRebirthStage,
        stats: { ...h.stats },
        preferredStats: [...h.preferredStats],
        gemSlots: [...(h.gemSlots || [])]
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
        combatAccumulator: obj.combatAccumulator || 0
      }))
    }

    const success = await SaveService.saveGame(gameData)
    if (success) {
      lastSaveTime.value = Date.now()
      updateSaveLabel()
    }
    return success
  } catch (e) {
    console.warn("Save failed", e)
    return false
  }
}

/**
 * Save gem-related changes. With localStorage there's no race condition
 * between tabs, so this simply calls saveGame() to persist everything.
 */
export async function saveGemChanges() {
  if (!isLoaded.value) {
    console.warn('[saveGemChanges] Blocked — initial load not yet complete')
    return false
  }
  return saveGame()
}
export async function loadGame() {
  try {
    const gameData = await SaveService.loadGame()
    if (!gameData) return false

    gameState.gold = gameData.gold || 0
    gameState.rebirthStones = gameData.rebirthStones || 0
    gameState.totalCompletions = gameData.totalCompletions || 0
    gameState.totalGoldEarned = gameData.totalGoldEarned || 0

    // ── Restore collectedGems via Inventory.fromJSON ──
    gameState.collectedGems = Inventory.fromJSON(gameData.collectedGems)

    // ── Restore heroes — reconstruct as Character instances ──
    // Character.fromJSON now restores gemSlots from saved data
    if (gameData.heroes) {
      charTemplates.forEach(name => {
        const hd = gameData.heroes[name]
        if (!hd) return
        const restored = Character.fromJSON({ name, ...hd })
        const h = heroRegistry[name]
        Object.assign(h, restored)
      })
    }

    // ── Backward compat: restore old equippedGems into character gemSlots ──
    if (gameData.equippedGems && !gameData.heroes?.[charTemplates[0]]?.gemSlots) {
      charTemplates.forEach(name => {
        const arr = gameData.equippedGems[name]
        if (arr) {
          const hero = heroRegistry[name]
          if (hero) {
            for (let i = 0; i < GEMS_PER_COLOR && i < arr.length; i++) {
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
        const obj = reactive({
          id: od.id, name: od.name, generation: od.generation,
          grade: od.grade, heroArmy: od.heroArmy,
          enemyArmyMax: od.enemyArmyMax, enemyArmyCurrent: od.enemyArmyCurrent,
          completed: od.completed,
          totalCompletionsNeeded: od.totalCompletionsNeeded,
          portraitUrl: od.portraitUrl, barUrl: od.barUrl, mp4Url: od.mp4Url,
          dmgPopupTimer: 0, combatAccumulator: od.combatAccumulator || 0, videoReady: false
        })
        gameState.objectives.push(obj)
      })
    }
    return true
  } catch (e) {
    console.warn("Load failed", e)
    return false
  }
}

// ─── Game Loop ───
const GAME_TICK_MS = 100        // 10 ticks per second = 0.1s each
const GAME_TICK_SEC = GAME_TICK_MS / 1000  // 0.1
let gameIntervalId = null

export function startGameLoop() {
  if (gameIntervalId) return
  gameIntervalId = setInterval(gameTick, GAME_TICK_MS)
}

function gameTick() {
  gameState.objectives.forEach(obj => {
    const hero = heroRegistry[obj.name]
    if (!hero) return

    // Use gem-only bonuses (job medals now provide force instead)
    const bonuses = getTotalHeroBonuses(hero)
    const vantage = getHeroVantage(obj.name)
    const effectiveArmy = (obj.heroArmy || 1)
    const overcoreMult = getOvercoreDmgMult(hero)
    const maxVantageMult = hero.vantageRating >= 99 ? (bonuses.vantage99DmgMult ?? 2) * overcoreMult : 1
    // Compute effective stats once for stat scaling (used by auto-strike)
    const effectiveStats = getEffectiveStats(hero, obj)

    // ── Force generation from job medal passives ──
    // armyPerSecond adds to the hero's army (displayed as "FORCE" in the cinematic stat badge)
    if (bonuses.armyPerSecond > 0) {
      obj.heroArmy = (obj.heroArmy || 1) + bonuses.armyPerSecond * GAME_TICK_SEC
    }

    // ── Auto-strike: fires once per second with a damage popup ──
    obj.combatAccumulator += GAME_TICK_SEC
    if (obj.combatAccumulator >= 1) {
      obj.combatAccumulator -= 1
      let baseStrikeDps = effectiveArmy * vantage * 0.05 * maxVantageMult
      let autoDmg = baseStrikeDps * (bonuses.idleDamageMult ?? 1)

      const critRoll = Math.random()
      if (critRoll < (bonuses.critChance ?? 0)) {
        autoDmg *= 2 + (bonuses.critDamage ?? 0)
      }

      // ═════════════════════════════════════════════════════
      // FINAL MULTIPLIER — damageMult is the last multiplication
      // applied to auto-strike damage before it's subtracted from
      // the enemy army. Nothing should multiply after this.
      // ═════════════════════════════════════════════════════
      autoDmg *= (1 + (bonuses.damageMult ?? 0))

      obj.enemyArmyCurrent = Math.round(Math.max(0, obj.enemyArmyCurrent - autoDmg) * 100) / 100
      obj.totalDamageDealt = (obj.totalDamageDealt || 0) + autoDmg
      addXP(obj.name, autoDmg / 1000)
      obj.autoDmgPopup = { dmg: autoDmg, t: Date.now() }

      // ── KAILIN AOE: splash auto-strike damage to all other objectives ──
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

    if (hero.vantageRating < 99 || (bonuses.vantageCapBoost ?? 0) > 0) {
      const maxVantage = 99 + (bonuses.vantageCapBoost ?? 0)
      const vantagePerSecond = 1 + (bonuses.vantageAutoRate ?? 0)
      const before = hero.vantageRating
      hero.vantageRating = Math.min(maxVantage, hero.vantageRating + vantagePerSecond * GAME_TICK_SEC)
      const after = hero.vantageRating
      if (before !== after) {
        console.log(`[VANTAGE] tick: ${obj.name} ${before}→${after}, maxVantage=${maxVantage}, capBoost=${bonuses.vantageCapBoost ?? 0}, cinematic=${!!cinematicActive[obj.id]}`)
      }
      if (hero.vantageRating >= 99) {
        triggerCinematicMP4(obj)
      }
    }

    // Check completion
    if (obj.enemyArmyCurrent <= 0 && obj.enemyArmyMax > 0) {
      processObjectiveCompletion(obj)
    }

    // Passive gold
    const passiveGold = obj.completed * obj.grade * GAME_TICK_SEC
    gameState.gold = (gameState.gold || 0) + passiveGold
    // Gold from job medal passives
    if (bonuses.goldPerSecond > 0) {
      gameState.gold = (gameState.gold || 0) + bonuses.goldPerSecond * GAME_TICK_SEC
    }
  })
}

export function stopGameLoop() {
  if (gameIntervalId) {
    clearInterval(gameIntervalId)
    gameIntervalId = null
  }
}

// ─── Init ───
export async function initGame() {
  // Ensure isLoaded starts as false — saves will be blocked
  // until we complete the initial load below.
  isLoaded.value = false

  // Ensure gemUnits exists (for migration from old saves)
  if (!gameState.gemUnits) {
    gameState.gemUnits = { red_unit: 0, blue_unit: 0, orange_unit: 0, cyan_unit: 0, purple_unit: 0, black_unit: 0 }
  }

  // Reset in-memory state to defaults WITHOUT touching localStorage.
  // clearSaveData() deletes the save file, so we can't use it here —
  // we need the save intact for loadGame() to restore from it.
  gameState.collectedGems = new Inventory({})
  charTemplates.forEach(name => {
    const hero = heroRegistry[name]
    if (hero) {
      hero.gemSlots = Array(GEMS_PER_COLOR).fill(null)
    }
  })

  // Attempt to load existing save
  const loaded = await loadGame()

  // Initialize lastSaveTime from the save file's updatedAt timestamp
  const saveMeta = await SaveService.getSaveMeta()
  if (saveMeta && saveMeta.updatedAt) {
    lastSaveTime.value = saveMeta.updatedAt
    updateSaveLabel()
  }

  // Deduplicate: ensure exactly one objective per character name
  if (loaded && gameState.objectives.length > 0) {
    const seen = new Set()
    const deduped = []
    for (const obj of gameState.objectives) {
      if (!seen.has(obj.name)) {
        seen.add(obj.name)
        deduped.push(obj)
      }
    }
    // Replace with deduplicated array
    gameState.objectives.splice(0, gameState.objectives.length, ...deduped)
  }

  if (!loaded || gameState.objectives.length === 0) {
    // No save found — first time player: create initial objectives
    charTemplates.forEach(t => createObjectiveInstance(t))
  } else {
    // ── Existing save: migrate old abilityId gems to new classId system ──
    // Old system had ability IDs like "vantage_strike", "ember_rage" etc.
    // New system has class IDs like "vanguard", "berserker" etc.
    let migratedCount = 0
    const allGems = gameState.collectedGems.getAll()
    for (const gem of allGems) {
      // If gem has an abilityId that doesn't resolve to a classDef, re-roll
      if (gem.classId && !gem.classDef) {
        const newClassId = rollAbilityForColor()
        if (newClassId) {
          gem.classId = newClassId
          gem.abilityId = newClassId
          // Regenerate name from new class
          gem.name = gem.generateName()
          migratedCount++
        }
      }
      // Also handle gems that only have abilityId set (no classId)
      if (!gem.classId && gem.abilityId) {
        const newClassId = rollAbilityForColor()
        if (newClassId) {
          gem.classId = newClassId
          gem.abilityId = newClassId
          gem.name = gem.generateName()
          migratedCount++
        }
      }
    }
    if (migratedCount > 0) {
      console.log(`[Migrate] Converted ${migratedCount} gems to new class system`)
    }

    // Ensure gems are named with their class names
    for (const gem of gameState.collectedGems.getAll()) {
      if (gem.classDef) {
        gem.name = gem.classDef.name
      }
    }

    saveGame()
  }

  // Auto-fill empty gem slots from inventory
  autoEquipGems()

  // ─── CRITICAL: Mark as loaded BEFORE starting intervals ───
  // The 30s auto-save and beforeunload handler both call saveGame(),
  // which is now guarded by isLoaded. By setting this flag here,
  // after loadGame() has completed, we guarantee that no save can
  // occur before the initial load finishes.
  isLoaded.value = true

  startGameLoop()

  // Auto-save every 30s (safe now — isLoaded is true)
  setInterval(() => {
    saveGame()
  }, 30000)

  // Update save label every 5s for display
  setInterval(updateSaveLabel, 5000)

  // Resize listener
  window.addEventListener('resize', onResize)

  // Save on page unload/refresh to prevent data loss
  window.addEventListener('beforeunload', () => {
    saveGame()
  })
}

export function cleanupGame() {
  stopGameLoop()
  window.removeEventListener('resize', onResize)
}

// ─── Gem helpers (read from character-owned gemSlots) ───
export function getGemSrc(heroName, slotIndex) {
  const hero = heroRegistry[heroName]
  if (!hero) return null
  const gemId = hero.gemSlots?.[slotIndex]
  if (!gemId) return null
  const gem = hero.inventory?.getGem(gemId)
  if (!gem) return null
  return ALL_GEMS[gem.color]?.[gem.gemIdx] || null
}

export function getEquippedCount(heroName) {
  const hero = heroRegistry[heroName]
  if (!hero) return 0
  return (hero.gemSlots || []).filter(s => s !== null).length
}

/**
 * Calculate a gem's raw DPS (damage per second) using its base stats.
 * Higher DPS = better gem for auto-sorting.
 * @param {import('../models/Gem.js').default} gem
 * @returns {number}
 */
export function getGemDPS(gem) {
  if (!gem || !gem.dmg || !gem.cd) return 0
  return gem.dmg / gem.cd
}

/**
 * Auto-dismantle: sort all non-equipped gems by DPS (descending),
 * keep only the top `keepCount` gems, delete the rest.
 * @param {number} [keepCount=70] - how many gems to keep
 * @returns {number} number of dismantled gems
 */
export function autoDismantleGems(keepCount = 70) {
  // Collect all equipped gem IDs across all heroes
  const equippedIds = new Set()
  for (const name of charTemplates) {
    const hero = heroRegistry[name]
    if (!hero || !hero.gemSlots) continue
    for (const gemId of hero.gemSlots) {
      if (gemId) equippedIds.add(gemId)
    }
  }

  // Get all non-equipped gems, compute DPS, sort descending
  const allGems = gameState.collectedGems.getAll()
  const unequipped = allGems
    .filter(g => !equippedIds.has(g.id))
    .map(g => ({ gem: g, dps: getGemDPS(g) }))
    .sort((a, b) => b.dps - a.dps)

  // Keep top N, delete the rest
  const toDelete = unequipped.slice(keepCount)
  for (const { gem } of toDelete) {
    gameState.collectedGems.removeGem(gem.id)
  }

  if (toDelete.length > 0) {
    saveGemChanges()
  }

  return toDelete.length
}

/**
 * Auto-equip the best gems for a specific hero from their personal inventory.
 * Considers this hero's currently equipped gems + unequipped gems in their inventory,
 * sorts by DPS descending, fills all gemSlots with the top picks.
 * @param {string} heroName
 * @returns {number} number of gems equipped/changed
 */
export function autoEquipCharGems(heroName) {
  const hero = heroRegistry[heroName]
  if (!hero) return 0

  // Pool = this hero's currently equipped gems + unequipped gems in their inventory
  const heroCurrentIds = new Set(hero.gemSlots.filter(id => id !== null))

  const candidateGems = hero.inventory.getAll()
    .filter(g => {
      // Include equipped gems (for DPS comparison) and unequipped bag gems
      if (heroCurrentIds.has(g.id)) return true
      // Only include gems that belong to this hero's inventory
      return hero.inventory.getGem(g.id) !== null
    })
    .map(g => ({ gem: g, dps: getGemDPS(g) }))
    .sort((a, b) => b.dps - a.dps)

  // Take top GEMS_PER_COLOR
  const bestGems = candidateGems.slice(0, GEMS_PER_COLOR)

  // Clear all of this hero's current gem slots
  let changeCount = 0
  for (let i = 0; i < hero.gemSlots.length; i++) {
    if (hero.gemSlots[i] !== null) {
      hero.gemSlots[i] = null
      changeCount++
    }
  }

  // Fill all slots with the best gems from the pool
  let fillCount = 0
  for (let i = 0; i < hero.gemSlots.length && i < bestGems.length; i++) {
    hero.gemSlots[i] = bestGems[i].gem.id
    fillCount++
  }

  if (fillCount > 0 || changeCount > 0) {
    saveGemChanges()
  }

  return fillCount
}

/**
 * Get a hero's personal gem inventory.
 * @param {string} heroName
 * @returns {import('../models/Inventory.js').default}
 */
export function getHeroInventory(heroName) {
  const hero = heroRegistry[heroName]
  return hero ? hero.inventory : null
}

// Re-export game data for convenience
export { charTemplates, CHAR_GEM_COLOR, ALL_GEMS, GEMS_PER_COLOR, HP_TICK_COUNT, HP_GRADIENT_ANCHORS, gemColorInfo, STAT_NAMES, STAT_LABELS, heroThemes, localImages } from '../config/gameData.js'

// Re-export models for external use
export { Character, Gem, Inventory }
