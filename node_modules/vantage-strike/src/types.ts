// ═══════════════════════════════════════════════════════════════
// src/types.ts — canonical global TypeScript types file.
// Global interfaces, type aliases, and unions for Vantage Strike
// live here (per AGENTS.md Directory Structure). Feature modules
// re-export these (e.g. `export type { GameState } from '../types'`)
// so existing imports keep working without duplication.
// ═══════════════════════════════════════════════════════════════

import type { GemEntity } from './entities/GemEntity'
import type { InventoryEntity } from './entities/InventoryEntity'
import type { ObjectiveEntity } from './entities/ObjectiveEntity'

// ─── Config-level types (config/gameData re-exports these) ─────────
// Mirrors `typeof STAT_NAMES[number]`, `typeof charTemplates[number]`,
// and the GemColor union declared in src/config/gameData.ts.

/** The five hero stats, in canonical order. */
export type StatName = 'Str' | 'Spi' | 'Int' | 'Con' | 'Dex'

/** The six playable heroes. */
export type HeroName = 'Voltkin' | 'Ashbeam' | 'Crypsis' | 'Spectra' | 'Hellshift' | 'Kailin'

/** Gem color keys used across gem images, gem entities, and config records. */
export type GemColor = 'reds' | 'blues' | 'cyans' | 'oranges' | 'purples' | 'blacks'

// ─── Combat-system types (systems/combatSystem re-exports these) ───

/** The five hero stats as a record (canonical shape used by combat). */
export interface HeroStats {
  Str: number
  Spi: number
  Int: number
  Con: number
  Dex: number
}

/**
 * Canonical gem type — an instance of the GemEntity class.
 * (Previously a structural `Gem` interface in systems/combatSystem;
 * the runtime gem is always a GemEntity, so we alias it directly.)
 */
export type Gem = GemEntity

/** Structural view of a hero's per-character gem inventory. */
export interface GemInventory {
  gems: Record<string, Gem>
  getAll(): Gem[]
  getGem(id: string): Gem | null
  addGem(gem: Gem): void
  removeGem(id: string): void
  readonly count: number
  keys(): string[]
  toJSON(): unknown
}

/** A single equipped job-medal on a hero. */
export interface JobMedal {
  medalId: string
  level: number
  maxLevel: number
  isMaxLevel: boolean
  getStatValue(heroStats: HeroStats | null): number
  getTarget(): number
  getProgress(heroStats: HeroStats): number
}

/** A hero's job-medal loadout. */
export interface JobMedalSystem {
  medalSlots: JobMedal[]
  selectedMedalIndex?: number
  toJSON?: () => unknown
}

/** A hero character as consumed by the systems layer. */
export interface Hero {
  name: string
  level: number
  xp: number
  maxXp: number
  baseVantage: number
  grade: number
  lastRebirthStage: number
  vantageRating: number
  mp4Index: number
  stats: HeroStats
  preferredStats: string[]
  gemSlots: (string | null)[]
  inventory: GemInventory
  jobMedals?: JobMedalSystem | null
}

/** Map of hero name → Hero. */
export type HeroRegistry = Record<string, Hero>

/** A gem class definition (paradigm). */
export interface ClassDef {
  id: string
  name: string
  description?: string
  scalingStat?: string
  flatStats?: Record<string, number>
  weight: number
  perArmyStat?: Record<string, number>
  vantagePerTap?: number
  vantageAutoRate?: number
  vantage99DmgMult?: number
  critChance?: number | [number, number]
  vantageCritChance?: number | [number, number]
  critDamage?: number
  doubleCrit?: number
  armyPerSecond?: number
  idleDamageMult?: number
  statPerCompletion?: number
  preferredStatBonus?: number
}

/** Aggregated bonus totals from gems + medal passives. */
export interface GemBonuses {
  vantagePerTap: number
  vantageAutoRate: number
  vantageCapBoost: number
  vantage99DmgMult: number
  critChance: number
  vantageCritChance: number
  critDamage: number
  doubleCrit: number
  damageMult: number
  idleDamageMult: number
  armyPerSecond: number
  goldPerSecond: number
  preferredStatBonus: number
  mysticAuraStatPerCompletion: number
  completionPerStat: Record<string, number>
  statPerCompletion?: number
  /** Bonus keys contributed dynamically by medal passives / future modifiers. */
  [key: string]: number | Record<string, number> | undefined
}

// ─── Store-level types (composables/useGameState re-exports these) ─

/** A live combat objective held in the reactive store (ObjectiveEntity + tick popups). */
export type GameObjective = ObjectiveEntity & {
  /** Last auto-strike damage popup (set by the game loop). */
  autoDmgPopup?: { dmg: number; t: number }
}

/** Central reactive game state. */
export interface GameState {
  gold: number
  rebirthStones: number
  totalCompletions: number
  totalGoldEarned: number
  objectives: GameObjective[]
  collectedGems: InventoryEntity
  cheatActive: boolean
  popoutHero: string | null
}
