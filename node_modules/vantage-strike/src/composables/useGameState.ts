// src/composables/useGameState.ts
// Central reactive game state + slim re-export hub.
// State definitions only — all game logic lives in src/systems/.
//
// NOTE: canonical entity/system shapes live in src/types.ts and
// src/entities/*; this module holds the reactive store and re-exports
// the shared systems types for convenience.

import { reactive } from 'vue'
import { charTemplates, CHAR_GEM_COLOR, ALL_GEMS, GEMS_PER_COLOR, HP_TICK_COUNT, HP_GRADIENT_ANCHORS, gemColorInfo, STAT_NAMES, STAT_LABELS, heroThemes, localImages, classDefinitions, GEM_MODIFIER_DEFS, VANTAGE_STRIKE_THRESHOLD } from '../config/gameData'
import type { GemColor } from '../config/gameData'
import type { GameState, GameObjective } from '../types'
import { JOB_MEDAL_DEFS } from '../config/jobMedalData'
import { CharacterEntity } from '../entities/CharacterEntity'
import { InventoryEntity } from '../entities/InventoryEntity'
import { ObjectiveEntity } from '../entities/ObjectiveEntity'
import { GemEntity } from '../entities/GemEntity'
import { JobMedalEntity } from '../entities/JobMedalEntity'
import { JobMedalSystemEntity } from '../entities/JobMedalSystemEntity'
import { isLoaded, cheatActive, popoutHero, lastSaveTime, lastSaveLabel, viewportWidth, isMobileView, videoEnabled } from '../flags'
import * as combatSystem from '../systems/combatSystem'
import type { Hero, HeroRegistry, HeroStats, GemBonuses } from '../systems/combatSystem'
import * as medalSystem from '../systems/medalSystem'
import * as gemSystem from '../systems/gemSystem'
import * as xpSystem from '../systems/xpSystem'
import * as rebirthSystem from '../systems/rebirthSystem'
import * as completionSystem from '../systems/completionSystem'
import * as saveSystem from '../systems/saveSystem'
import * as SaveService from '../services/SaveService'
import { useGameLoop } from './useGameLoop'
import { triggerCinematicMP4, isCinematicActive, clearAllCinematics, clearCinematic } from './useVantageSystem'
import { updateVideoForObjective } from './useVideoPool'

// ─── Store-level shapes ──────────────────────────────────────────────
// GameState / GameObjective canonical definitions live in src/types.ts;
// re-exported here so existing `from '../composables/useGameState'` imports keep working.

export type { GameState, GameObjective } from '../types'

// ─── Create hero registry ───
function createHeroRegistry(): HeroRegistry {
  const reg: HeroRegistry = {}
  charTemplates.forEach(name => {
    reg[name] = new CharacterEntity(name)
  })
  return reg
}

// ─── Reactive game state ───
export const heroRegistry = reactive<HeroRegistry>(createHeroRegistry())

export const gameState = reactive<GameState>({
  gold: 0,
  rebirthStones: 0,
  totalCompletions: 0,
  totalGoldEarned: 0,
  objectives: [],
  collectedGems: new InventoryEntity({}),
  cheatActive: false,
  popoutHero: null
})

// ─── Event-driven save cooldown ───
const EVENT_SAVE_COOLDOWN = 30000
let lastEventSaveTime = 0

function saveGameWithCooldown(): Promise<boolean> {
  if (!isLoaded.value) return Promise.resolve(false)
  const now = Date.now()
  if (now - lastEventSaveTime < EVENT_SAVE_COOLDOWN) return Promise.resolve(false)
  lastEventSaveTime = now
  return saveSystem.saveGame(gameState, heroRegistry)
}

function updateSaveLabel(): void {
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

// ─── Formatting ───
export function formatNotation(n: number, decimals = 2): string {
  if (n === Infinity || n === -Infinity || isNaN(n)) return "0"
  if (n < 0) return "-" + formatNotation(-n, decimals)
  if (n < 1000) return Math.floor(n).toString()
  const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"]
  const tier = Math.min(suffixes.length - 1, Math.floor(Math.log10(n) / 3))
  const suffix = suffixes[tier]
  const scaled = n / Math.pow(10, tier * 3)
  if (scaled < 10) return parseFloat(scaled.toFixed(decimals)) + suffix
  if (scaled < 100) return parseFloat(scaled.toFixed(decimals)) + suffix
  return Math.floor(scaled) + suffix
}

// ─── HP gradient ───
export function getHPGradientColor(index: number, total: number): string {
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

// ─── Objective creation ───
function assignVisuals(obj: GameObjective, mp4Index?: number): void {
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

export function createObjectiveInstance(heroName: string, gradeOverride?: number): GameObjective | undefined {
  const hero = heroRegistry[heroName]
  if (!hero) return undefined
  const grade = gradeOverride || hero.grade || 1
  const totalCompletionsNeeded = rebirthSystem.getTotalForRebirth(grade, hero.lastRebirthStage)
  const obj = ObjectiveEntity.create(heroName, grade, {
    heroArmy: 260,
    totalCompletionsNeeded,
    lastRebirthStage: hero.lastRebirthStage
  })
  assignVisuals(obj, hero?.mp4Index ?? 0)
  // Wrap in reactive so Vue tracks changes (plain-object spread of the entity)
  const reactiveObj = reactive({ ...obj }) as unknown as GameObjective
  gameState.objectives.push(reactiveObj)
  return reactiveObj
}

// ─── Completion handler — delegates to unified completionSystem ───
function processObjectiveCompletion(obj: GameObjective): void {
  const hero = heroRegistry[obj.name]
  if (!hero) return

  const bonuses = medalSystem.getTotalHeroBonuses(hero, combatSystem.getTotalGemBonuses(hero))
  completionSystem.processCompletion(obj, hero, bonuses, gameState, heroRegistry)

  saveGameWithCooldown()
}

// ─── Tap objective ───
export function tapObjective(event: MouseEvent, objId: string): { dmg: number; x: number; y: number; obj: GameObjective | undefined } | undefined {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const obj = gameState.objectives.find(o => o.id === objId)
  if (!obj) return { dmg: 0, x: 0, y: 0, obj }
  const hero = heroRegistry[obj.name]
  if (!hero) return { dmg: 0, x: 0, y: 0, obj }

  const gemBonuses = combatSystem.getTotalGemBonuses(hero)
  const bonuses = medalSystem.getTotalHeroBonuses(hero, gemBonuses)

  // Vantage gain on tap
  const maxVantage = 99 + (gemBonuses.vantageCapBoost ?? 0)
  const gain = 1 + (gemBonuses.vantagePerTap ?? 0)
  hero.vantageRating = Math.floor(Math.min(maxVantage, hero.vantageRating + gain))
  if (hero.vantageRating >= VANTAGE_STRIKE_THRESHOLD) {
    triggerCinematicMP4(obj)
  }

  const dmg = combatSystem.calculateTapDamage(hero, obj, bonuses, cheatActive.value)
  obj.enemyArmyCurrent = Math.round(Math.max(0, obj.enemyArmyCurrent - dmg) * 100) / 100
  obj.totalDamageDealt = (obj.totalDamageDealt || 0) + dmg
  xpSystem.addXP(hero, dmg / 1000)

  // Kailin AOE
  if (obj.name === 'Kailin') {
    const aoeShare = (bonuses as GemBonuses & { aoeDamageShare?: number }).aoeDamageShare ?? 0
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

  if (obj.enemyArmyCurrent <= 0 && obj.enemyArmyMax > 0) {
    processObjectiveCompletion(obj)
  }

  const clickX = event.clientX - rect.left
  const clickY = event.clientY - rect.top
  return { dmg, x: clickX, y: clickY, obj }
}

// ─── Upgrade ───
export function upgrade(heroName: string): void {
  const hero = heroRegistry[heroName]
  if (!hero) return
  const universalGold = gameState.gold || 0
  const cost = Math.max(1, Math.floor(universalGold * 0.1))
  if (universalGold < cost) return
  gameState.gold = universalGold - cost
  const obj = gameState.objectives.find(o => o.name === heroName)
  if (obj) obj.heroArmy += cost
  saveGameWithCooldown()
}

// ─── Rebirth ───
export function rebirthObjective(objId: string): void {
  const obj = gameState.objectives.find(o => o.id === objId)
  if (!obj) return
  const hero = heroRegistry[obj.name]
  if (!hero) return
  if (obj.completed < obj.totalCompletionsNeeded) return

  // Clear cinematic
  if (isCinematicActive(obj.id)) {
    hero.vantageRating = 0
    clearCinematic(obj)
  }

  const result = rebirthSystem.processRebirth(obj, hero, gameState)
  if (!result) return

  // Replace objective
  const idx = gameState.objectives.indexOf(obj)
  if (idx !== -1) {
    const reactiveObj = reactive({ ...result.newObjective }) as unknown as GameObjective
    assignVisuals(reactiveObj, hero.mp4Index ?? 0)
    gameState.objectives[idx] = reactiveObj

    // Notify video pool
    updateVideoForObjective(reactiveObj)
  }

  // Persist
  saveSystem.saveGame(gameState, heroRegistry)
}

// ─── Stat system ───
export function togglePreferredStat(heroName: string, statName: string): void {
  const hero = heroRegistry[heroName]
  if (!hero) return
  const idx = hero.preferredStats.indexOf(statName)
  if (idx !== -1) {
    // Already preferred — do nothing, always keep at least 2
    return
  }
  // New stat: shift first item out, push new one (replaces oldest)
  if (hero.preferredStats.length >= 2) {
    hero.preferredStats.shift()
  }
  hero.preferredStats.push(statName)
}

export function openCharPopout(heroName: string): void {
  gameState.popoutHero = heroName
}

export function closeCharPopout(): void {
  gameState.popoutHero = null
}

// ─── Job Medals ───
export function selectJobMedal(heroName: string, slotIndex: number): void {
  const hero = heroRegistry[heroName]
  if (!hero || !hero.jobMedals) return
  hero.jobMedals.selectedMedalIndex = slotIndex
}

export function checkMedalLevelUps(heroName: string, effectiveStats: HeroStats): string[] {
  const hero = heroRegistry[heroName]
  if (!hero || !hero.jobMedals) return []
  return medalSystem.checkAllMedals(hero.jobMedals, effectiveStats)
}

// ─── Cheats ───
export function toggleCheat(): void {
  cheatActive.value = !cheatActive.value
  gameState.cheatActive = cheatActive.value
}

export function vantage99All(): void {
  charTemplates.forEach(name => {
    const hero = heroRegistry[name]
    if (!hero) return
    hero.vantageRating = VANTAGE_STRIKE_THRESHOLD
  })
  gameState.objectives.forEach(obj => {
    const hero = heroRegistry[obj.name]
    if (hero && hero.vantageRating === VANTAGE_STRIKE_THRESHOLD) {
      triggerCinematicMP4(obj)
    }
  })
}

export function lvlPlusOneAll(): void {
  charTemplates.forEach(name => {
    const hero = heroRegistry[name]
    if (!hero) return
    hero.level++
    hero.maxXp = Math.floor(100 * Math.pow(1.35, hero.level - 1))
  })
}

// ─── Gem management (delegates to gemSystem) ───
export function clearSaveData(): void {
  gameState.collectedGems = new InventoryEntity({})
  charTemplates.forEach(name => {
    const hero = heroRegistry[name]
    if (hero) {
      hero.gemSlots = Array(GEMS_PER_COLOR).fill(null)
    }
  })
}

export function autoEquipGems(): void {
  gemSystem.autoEquipGems(heroRegistry, gameState.collectedGems)
}

export function seedExampleGems(): void {
  gameState.collectedGems = new InventoryEntity({})
  charTemplates.forEach(name => {
    const hero = heroRegistry[name]
    if (hero) hero.gemSlots = Array(GEMS_PER_COLOR).fill(null)
  })
  const heroColorMap = {
    Voltkin: 'reds', Ashbeam: 'blues', Crypsis: 'oranges',
    Spectra: 'cyans', Hellshift: 'purples', Kailin: 'blacks'
  }
  const allClassIds = classDefinitions.map(c => c.id)
  for (const colorKey of Object.values(heroColorMap)) {
    const gemPool = ALL_GEMS[colorKey]
    if (!gemPool || gemPool.length === 0) continue
    for (let i = 0; i < GEMS_PER_COLOR; i++) {
      const gemIdx = i % gemPool.length
      const classId = allClassIds[i % allClassIds.length]
      const tier = 1 + (i % 5)
      const gem = new GemEntity(colorKey as GemColor, gemIdx, {
        tier,
        classId,
        modifiers: gemSystem.rollModifiers({ tier })
      })
      gameState.collectedGems.addGem(gem)
    }
  }
}

export function autoEquipCharGems(heroName: string): number {
  return gemSystem.autoEquipCharGems(heroName, heroRegistry)
}

export function autoDismantleGems(keepCount = 70): number {
  return gemSystem.autoDismantleGems(gameState.collectedGems, heroRegistry, keepCount)
}

export function moveGem(fromHero: string, fromSlot: number, toHero: string, toSlot: number): boolean {
  return gemSystem.moveGem(fromHero, fromSlot, toHero, toSlot, heroRegistry)
}

export function equipGem(heroName: string, slotIndex: number, gemId: string): boolean {
  return gemSystem.equipGem(heroName, slotIndex, gemId, heroRegistry)
}

export function unequipGem(heroName: string, slotIndex: number): void {
  gemSystem.unequipGem(heroName, slotIndex, heroRegistry)
}

export function deleteGem(gemId: string): void {
  gemSystem.deleteGem(gemId, heroRegistry, gameState.collectedGems)
}

export function getHeroInventory(heroName: string): InventoryEntity | null {
  const hero = heroRegistry[heroName]
  // Hero.inventory is structurally typed as GemInventory by the systems lane;
  // at runtime it is always an InventoryEntity instance.
  return hero ? (hero.inventory as InventoryEntity) : null
}

// ─── Gem helpers ───
export function getGemSrc(heroName: string, slotIndex: number): string | null {
  const hero = heroRegistry[heroName]
  if (!hero) return null
  const gemId = hero.gemSlots?.[slotIndex]
  if (!gemId) return null
  const gem = hero.inventory?.getGem(gemId)
  if (!gem) return null
  return ALL_GEMS[gem.color]?.[gem.gemIdx] || null
}

export function getEquippedCount(heroName: string): number {
  const hero = heroRegistry[heroName]
  if (!hero) return 0
  return (hero.gemSlots || []).filter(s => s !== null).length
}

// ─── Combat helpers ───
export function getHeroGemBonuses(hero: Hero): GemBonuses {
  return combatSystem.getTotalGemBonuses(hero)
}

export function getTotalHeroBonuses(hero: Hero): GemBonuses {
  return medalSystem.getTotalHeroBonuses(hero, combatSystem.getTotalGemBonuses(hero))
}

export function getEffectiveStats(hero: Hero, objective: GameObjective | null = null): HeroStats {
  return combatSystem.getEffectiveStats(hero)
}

export function getHeroVantage(heroName: string): number {
  const hero = heroRegistry[heroName]
  return combatSystem.getHeroVantage(hero)
}

export function getOvercoreDmgMult(hero: Hero, overcoreBase = 1.12): number {
  return combatSystem.getOvercoreDmgMult(hero, overcoreBase)
}

export function getHeroMaxVantage(hero: Hero): number {
  return combatSystem.getHeroMaxVantage(hero, combatSystem.getTotalGemBonuses(hero))
}

export function getGemDPS(gem: GemEntity): number {
  return combatSystem.getGemDPS(gem)
}

// ─── Init ───
export async function initGame(): Promise<void> {
  isLoaded.value = false

  // Reset all in-memory state to defaults (covers HMR re-mounts where
  // module-level reactive objects persist between hot updates)
  gameState.gold = 0
  gameState.rebirthStones = 0
  gameState.totalCompletions = 0
  gameState.totalGoldEarned = 0
  gameState.collectedGems = new InventoryEntity({})
  gameState.objectives.splice(0, gameState.objectives.length)
  gameState.cheatActive = false
  gameState.popoutHero = null

  // Reset all heroes to starter defaults
  charTemplates.forEach(name => {
    const hero = heroRegistry[name]
    if (!hero) return
    hero.level = 1
    hero.xp = 0
    hero.maxXp = 100
    hero.baseVantage = 1
    hero.grade = 1
    hero.lastRebirthStage = 0
    hero.vantageRating = 0
    hero.mp4Index = 0
    hero.preferredStats = ['Str', 'Dex']
    hero.gemSlots = Array(GEMS_PER_COLOR).fill(null)
    const defaults: Record<string, number> = { Str: 5, Spi: 5, Int: 5, Con: 5, Dex: 5 }
    for (const key of STAT_NAMES) {
      hero.stats[key] = defaults[key]
    }
    hero.inventory = new InventoryEntity({})
    hero.jobMedals = null  // rebuilt below if save is loaded
  })

  const loaded = await saveSystem.loadGame(gameState, heroRegistry)

  const saveMeta = await SaveService.getSaveMeta()
  if (saveMeta && saveMeta.updatedAt) {
    lastSaveTime.value = saveMeta.updatedAt
    updateSaveLabel()
  }

  if (!loaded) {
    // No save found — start a completely fresh game.
    // Rebuild job medal systems for all heroes since we nulled them above.
    charTemplates.forEach(name => {
      const hero = heroRegistry[name]
      if (hero) {
        hero.jobMedals = JobMedalSystemEntity.createForCharacter(name, JOB_MEDAL_DEFS[name])
      }
    })
    charTemplates.forEach(t => createObjectiveInstance(t))
  } else {
    // Restore job medals from save (the saveSystem.loadGame restored heroes)
    // but ensure any hero that still has null jobMedals gets fresh ones
    charTemplates.forEach(name => {
      const hero = heroRegistry[name]
      if (hero && !hero.jobMedals) {
        hero.jobMedals = JobMedalSystemEntity.createForCharacter(name, JOB_MEDAL_DEFS[name])
      }
    })
    // Migrate old abilityId gems to new classId system
    let migratedCount = 0
    const allGems = gameState.collectedGems.getAll()
    for (const gem of allGems) {
      if (gem.classId && !combatSystem.getGemClassDef(gem)) {
        const newClassId = gemSystem.rollAbilityForColor()
        if (newClassId) {
          gem.classId = newClassId
          gem.name = gemSystem.generateGemName(gem)
          migratedCount++
        }
      }
      if (!gem.classId) {
        const newClassId = gemSystem.rollAbilityForColor()
        if (newClassId) {
          gem.classId = newClassId
          gem.name = gemSystem.generateGemName(gem)
          migratedCount++
        }
      }
    }
    if (migratedCount > 0) {
      console.log(`[Migrate] Converted ${migratedCount} gems to new class system`)
    }
    // Ensure gems are named with their class names
    for (const gem of gameState.collectedGems.getAll()) {
      const classDef = combatSystem.getGemClassDef(gem)
      if (classDef) {
        gem.name = classDef.name
      }
    }
    saveSystem.saveGame(gameState, heroRegistry)
  }

  autoEquipGems()

  isLoaded.value = true

  // Start game loop
  const { startGameLoop } = useGameLoop()
  startGameLoop(gameState, heroRegistry)

  // Update save label every 5s
  setInterval(updateSaveLabel, 5000)

  // Resize listener
  window.addEventListener('resize', () => { viewportWidth.value = window.innerWidth })

  // Save on page unload — named function so settings can remove it during reset
  const beforeUnloadHandler = () => {
    saveSystem.saveGame(gameState, heroRegistry)
  }
  ;(window as unknown as { _vantageBeforeUnload?: () => void })._vantageBeforeUnload = beforeUnloadHandler
  window.addEventListener('beforeunload', beforeUnloadHandler)
}

export function cleanupGame(): void {
  const { stopGameLoop } = useGameLoop()
  stopGameLoop()
  clearAllCinematics()
}

// ─── Re-export everything for backward compatibility ───
export { charTemplates, CHAR_GEM_COLOR, ALL_GEMS, GEMS_PER_COLOR, HP_TICK_COUNT, HP_GRADIENT_ANCHORS, gemColorInfo, STAT_NAMES, STAT_LABELS, heroThemes, localImages, classDefinitions, GEM_MODIFIER_DEFS } from '../config/gameData'
export { CharacterEntity as Character, GemEntity as Gem, InventoryEntity as Inventory, ObjectiveEntity as Objective, JobMedalEntity as JobMedal, JobMedalSystemEntity as JobMedalSystem } from '../entities/index'
export { isLoaded, cheatActive, popoutHero, lastSaveTime, lastSaveLabel, viewportWidth, isMobileView, videoEnabled } from '../flags'
export { getSpectraGemStatBonus, getGemScalingStats, getGemScalingStatValue, getGemClassDef, getModifierValue, hasModifier } from '../systems/combatSystem'
export type { Hero, HeroStats, HeroRegistry, GemBonuses } from '../systems/combatSystem'

/** Bonus totals for a hero (gem passives + medal bonuses) — alias of the canonical GemBonuses. */
export type HeroBonuses = GemBonuses
export { rollAbilityForColor } from '../systems/gemSystem'
export { JobMedalEntity, JobMedalSystemEntity } from '../entities/index'
export { isCinematicActive } from './useVantageSystem'
