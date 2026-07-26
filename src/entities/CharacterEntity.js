// src/entities/CharacterEntity.js
// Pure data holder — hero character state with JSON serialization.
// No game logic, no Vue reactivity.

import { STAT_NAMES, GEMS_PER_COLOR } from '../config/gameData.js'
import { JOB_MEDAL_DEFS } from '../config/jobMedalData.js'
import { InventoryEntity } from './InventoryEntity.js'
import { JobMedalSystemEntity } from './JobMedalSystemEntity.js'

export class CharacterEntity {
  /**
   * @param {string} name - hero name
   * @param {Object} [options]
   * @param {number} [options.level]
   * @param {number} [options.xp]
   * @param {number} [options.maxXp]
   * @param {number} [options.baseVantage]
   * @param {number} [options.grade]
   * @param {number} [options.lastRebirthStage]
   * @param {number} [options.vantageRating]
   * @param {Object} [options.stats]
   * @param {string[]} [options.preferredStats]
   * @param {Array}   [options.gemSlots]
   * @param {Object}  [options.inventory]
   * @param {Object}  [options.jobMedals]
   * @param {number}  [options.mp4Index]
   */
  constructor(name, options = {}) {
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
    const defaults = { Str: 5, Spi: 5, Int: 5, Con: 5, Dex: 5 }
    this.stats = {}
    for (const key of STAT_NAMES) {
      this.stats[key] = options.stats?.[key] ?? defaults[key]
    }

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
  toJSON() {
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
  static fromJSON(data) {
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
