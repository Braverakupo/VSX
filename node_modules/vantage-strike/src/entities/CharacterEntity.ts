// src/entities/CharacterEntity.ts
// Pure data holder — hero character state with JSON serialization.
// No game logic, no Vue reactivity.

import { STAT_NAMES, GEMS_PER_COLOR } from '../config/gameData'
import type { StatName } from '../config/gameData'
import { JOB_MEDAL_DEFS } from '../config/jobMedalData'
import { InventoryEntity } from './InventoryEntity'
import type { InventoryJSON } from './InventoryEntity'
import { JobMedalSystemEntity } from './JobMedalSystemEntity'
import type { JobMedalSystemJSON } from './JobMedalSystemEntity'

/** The five hero stats: Str, Spi, Int, Con, Dex. */
export interface CharacterStats {
  Str: number
  Spi: number
  Int: number
  Con: number
  Dex: number
}

/** Constructor options for a CharacterEntity (all optional except name). */
export interface CharacterOptions {
  level?: number
  xp?: number
  maxXp?: number
  baseVantage?: number
  grade?: number
  lastRebirthStage?: number
  vantageRating?: number
  stats?: Partial<CharacterStats>
  preferredStats?: string[]
  /** Each slot holds a gem UUID string or null. */
  gemSlots?: Array<string | null>
  inventory?: InventoryEntity | InventoryJSON
  jobMedals?: JobMedalSystemEntity | JobMedalSystemJSON | null
  mp4Index?: number
}

/** Plain JSON shape of a character as persisted in save data. */
export type CharacterJSON = CharacterOptions & { name: string }

export class CharacterEntity {
  name: string
  level: number
  xp: number
  maxXp: number
  baseVantage: number
  grade: number
  lastRebirthStage: number
  vantageRating: number
  mp4Index: number
  stats: CharacterStats
  preferredStats: string[]
  gemSlots: Array<string | null>
  inventory: InventoryEntity
  jobMedals: JobMedalSystemEntity | null

  constructor(name: string, options: CharacterOptions = {}) {
    this.name = name
    this.level = options.level ?? 1
    this.xp = options.xp ?? 0
    this.maxXp = options.maxXp ?? 100
    this.baseVantage = options.baseVantage ?? 1
    this.grade = options.grade ?? 1
    this.lastRebirthStage = options.lastRebirthStage ?? 0
    this.vantageRating = options.vantageRating ?? 0
    this.mp4Index = options.mp4Index ?? 0

    // Stats: merge defaults with provided values
    const defaults: Record<StatName, number> = { Str: 5, Spi: 5, Int: 5, Con: 5, Dex: 5 }
    const stats: CharacterStats = { Str: 0, Spi: 0, Int: 0, Con: 0, Dex: 0 }
    for (const key of STAT_NAMES) {
      stats[key] = options.stats?.[key] ?? defaults[key]
    }
    this.stats = stats

    this.preferredStats = options.preferredStats
      ? [...options.preferredStats]
      : ['Str', 'Dex']

    // Gem slots: each slot holds a gem UUID string or null
    this.gemSlots = options.gemSlots
      ? [...options.gemSlots]
      : Array(GEMS_PER_COLOR).fill(null)

    // Per-character gem inventory
    this.inventory = options.inventory
      ? (options.inventory instanceof InventoryEntity ? options.inventory : InventoryEntity.fromJSON(options.inventory))
      : new InventoryEntity({})

    // Job Medals system
    this.jobMedals = options.jobMedals
      ? (options.jobMedals instanceof JobMedalSystemEntity ? options.jobMedals : JobMedalSystemEntity.fromJSON(options.jobMedals))
      : JobMedalSystemEntity.createForCharacter(name, JOB_MEDAL_DEFS[name])
  }

  /** Serialize to plain JSON */
  toJSON(): CharacterJSON {
    return {
      name: this.name,
      level: this.level,
      xp: this.xp,
      maxXp: this.maxXp,
      baseVantage: this.baseVantage,
      grade: this.grade,
      lastRebirthStage: this.lastRebirthStage,
      vantageRating: this.vantageRating,
      stats: { ...this.stats },
      preferredStats: [...this.preferredStats],
      gemSlots: [...this.gemSlots],
      inventory: this.inventory.toJSON(),
      jobMedals: this.jobMedals?.toJSON() ?? null,
      mp4Index: this.mp4Index
    }
  }

  /** Deserialize from plain JSON */
  static fromJSON(data: CharacterJSON): CharacterEntity {
    return new CharacterEntity(data.name, {
      level: data.level,
      xp: data.xp,
      maxXp: data.maxXp,
      baseVantage: data.baseVantage,
      grade: data.grade,
      lastRebirthStage: data.lastRebirthStage,
      vantageRating: data.vantageRating,
      stats: data.stats,
      preferredStats: data.preferredStats,
      gemSlots: data.gemSlots,
      inventory: data.inventory,
      jobMedals: data.jobMedals,
      mp4Index: data.mp4Index ?? 0
    })
  }
}
