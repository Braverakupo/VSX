// src/entities/JobMedalEntity.js
// Pure data holder — single job medal state with JSON serialization.
// Includes getProgress() for convenient template access.

import { MAX_JOB_MEDAL_LEVEL } from '../config/jobMedalData.js'
import { getMedalDefById, LEVEL_BASE, LEVEL_MULT } from '../config/jobMedalData.js'

export class JobMedalEntity {
  /**
   * @param {string} medalId
   * @param {number} [level=0] - current medal level
   * @param {number} [maxLevel=MAX_JOB_MEDAL_LEVEL]
   */
  constructor(medalId, level = 0, maxLevel = MAX_JOB_MEDAL_LEVEL) {
    this.medalId = medalId
    this.level = level
    this.maxLevel = maxLevel
  }

  /** Whether this medal has reached its maximum level */
  get isMaxLevel() {
    return this.level >= this.maxLevel
  }

  /**
   * Get progress fraction (0..1) toward next medal level.
   * @param {Object} heroStats - { Str, Spi, Int, Con, Dex }
   * @returns {number}
   */
  getProgress(heroStats) {
    if (this.isMaxLevel) return 1
    const val = this.getStatValue(heroStats)
    const tgt = this.getTarget()
    if (tgt <= 0) return 1
    return Math.min(1, Math.max(0, val / tgt))
  }

  /**
   * Sum of the stat values tracked by this medal.
   * @param {Object} heroStats
   * @returns {number}
   */
  getStatValue(heroStats) {
    if (!heroStats) return 0
    const def = getMedalDefById(this.medalId)
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
   * Get the stat-points target for the next level.
   * @returns {number}
   */
  getTarget() {
    if (this.isMaxLevel) return Infinity
    let t = LEVEL_BASE
    for (let i = 0; i < this.level; i++) {
      t = Math.ceil(t * LEVEL_MULT)
    }
    return t
  }

  /** Serialize to plain JSON */
  toJSON() {
    return {
      medalId: this.medalId,
      level: this.level,
      maxLevel: this.maxLevel
    }
  }

  /** Deserialize from plain JSON */
  static fromJSON(data) {
    return new JobMedalEntity(
      data.medalId,
      data.level ?? 0,
      data.maxLevel ?? MAX_JOB_MEDAL_LEVEL
    )
  }
}
