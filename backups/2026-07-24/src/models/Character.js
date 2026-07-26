// src/models/Character.js
// Character class — encapsulates all hero data and behavior with JSON serialization

import { STAT_NAMES, GEMS_PER_COLOR } from '../config/gameData.js'
import { JOB_MEDAL_DEFS } from '../config/jobMedalData.js'
import Inventory from './Inventory.js'
import JobMedalSystem from './JobMedalSystem.js'

export default class Character {
  /**
   * @param {string} name - hero name (e.g. "Ashbeam", "Crypsis", etc.)
   * @param {Object} [options]
   * @param {number} [options.level]       - current level (default: 1)
   * @param {number} [options.xp]          - experience toward next level (default: 0)
   * @param {number} [options.maxXp]       - xp required for next level (default: 100)
   * @param {number} [options.baseVantage] - base vantage rating (default: 1)
   * @param {number} [options.grade]       - grade/rarity (default: 1)
   * @param {number} [options.lastRebirthStage]
   * @param {number} [options.vantageRating]
   * @param {number} [options.vantageAccumulator]
   * @param {Object} [options.stats]       - stat values { Str, Spi, Int, Con, Dex }
   * @param {string[]} [options.preferredStats] - up to 2 preferred stat keys
   * @param {Array}   [options.gemSlots]   - array of gem UUIDs (or null) for each equipped slot
   * @param {Object}  [options.inventory]  - raw gem data for character's personal inventory
   * @param {Object}  [options.jobMedals]  - raw job medal system data (for restore)
   * @param {number}  [options.mp4Index]   - current cinematic MP4 index (0-9), advances on medal level-up
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

    // Per-character gem inventory (gems earned by this hero)
    this.inventory = options.inventory
      ? Inventory.fromJSON(options.inventory)
      : new Inventory({})

    // Job Medals system (10 upgradeable medals per character)
    this.jobMedals = options.jobMedals
      ? JobMedalSystem.fromJSON(options.jobMedals)
      : JobMedalSystem.createForCharacter(name, JOB_MEDAL_DEFS[name])
  }

  /**
   * Serialize to plain JSON (called automatically by JSON.stringify).
   * Includes gemSlots, inventory, and jobMedals so all data is stored per-character.
   */
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

  /**
   * Deserialize from a plain JSON object back into a Character instance.
   * @param {Object} data - raw JSON object (as produced by toJSON)
   * @returns {Character}
   */
  static fromJSON(data) {
    return new Character(data.name, {
      level: data.level,
      xp: data.xp,
      maxXp: data.maxXp,
      baseVantage: data.baseVantage,
      grade: data.grade,
      lastRebirthStage: data.lastRebirthStage,
      vantageRating: data.vantageRating,
      vantageAccumulator: data.vantageAccumulator,
      stats: data.stats,
      preferredStats: data.preferredStats,
      gemSlots: data.gemSlots,
      inventory: data.inventory,
      jobMedals: data.jobMedals,
      mp4Index: data.mp4Index ?? 0
    })
  }
}
