// src/models/JobMedal.js
// JobMedal class — each medal levels based on accumulated stat points.
//
// Leveling formula:
//   Stat points = SUM of tracked stat values (not averaged).
//   Target for level N:  base=6, then 40% increase each level, rounded up.
//     level 0→1: 6
//     level 1→2: ceil(6  × 1.4) = 9
//     level 2→3: ceil(9  × 1.4) = 13
//     ...
//   Single-stat medals (1 stat tracked): points = that stat's value.
//   Dual-stat medals (2+ stats tracked): points = sum of those stats' values.
//   Mastery medal (all 5 stats): points = sum of all 5 stat values.

import { MAX_JOB_MEDAL_LEVEL, getMedalDefById, LEVEL_BASE, LEVEL_MULT } from '../config/jobMedalData.js'

export default class JobMedal {
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

  /** Whether this medal has reached its maximum level. */
  get isMaxLevel() {
    return this.level >= this.maxLevel
  }

  /** Get the tracked stat keys from the medal definition. */
  get trackedStats() {
    const def = getMedalDefById(this.medalId)
    return def?.stats || []
  }

  /**
   * Get the current stat points (SUM of tracked stat values).
   *
   * Single-stat medals: returns that stat's value directly.
   * Dual-stat medals:   returns SUM of both tracked stats.
   * Mastery medal:      returns SUM of all 5 stats.
   *
   * @param {Object} heroStats { Str, Spi, Int, Con, Dex }
   * @returns {number}
   */
  getCurrentStatValue(heroStats) {
    const def = getMedalDefById(this.medalId)
    if (!def || !heroStats) return 0

    const stats = def.stats || []

    // Mastery (all 5 stats tracked): sum of all
    if (def.isMastery || stats.length === 0) {
      return (heroStats.Str || 0) + (heroStats.Spi || 0) + (heroStats.Int || 0) + (heroStats.Con || 0) + (heroStats.Dex || 0)
    }

    // Single or dual: SUM of tracked stats (not averaged)
    let total = 0
    for (const s of stats) {
      total += heroStats[s] || 0
    }
    return total
  }

  /**
   * Stat-points target needed for next level.
   *
   * Progression: 6 → ceil(6×1.4)=9 → ceil(9×1.4)=13 → ceil(13×1.4)=19 → ...
   * Same formula applies to ALL medals regardless of single/dual/mastery.
   *
   * @returns {number}
   */
  get target() {
    if (this.isMaxLevel) return Infinity
    let t = LEVEL_BASE
    for (let i = 0; i < this.level; i++) {
      t = Math.ceil(t * LEVEL_MULT)
    }
    return t
  }

  /**
   * Get current progress fraction (0..1) toward next level.
   * @param {Object} heroStats
   * @returns {number}
   */
  getProgress(heroStats) {
    if (this.isMaxLevel) return 1
    const val = this.getCurrentStatValue(heroStats)
    const tgt = this.target
    if (tgt <= 0) return 1
    return Math.min(1, Math.max(0, val / tgt))
  }

  /**
   * Check if current stat points warrant a level up.
   * Only increments by ONE level per call (caller should loop for multi-level).
   * @param {Object} heroStats - current effective hero stats
   * @returns {boolean} whether the medal leveled up
   */
  checkLevelUp(heroStats) {
    if (this.isMaxLevel) return false
    if (this.getCurrentStatValue(heroStats) >= this.target) {
      this.level++
      return true
    }
    return false
  }

  /** Serialize to plain JSON. */
  toJSON() {
    return {
      medalId: this.medalId,
      level: this.level,
      maxLevel: this.maxLevel
    }
  }

  /** Deserialize from plain JSON. */
  static fromJSON(data) {
    return new JobMedal(
      data.medalId,
      data.level ?? 0,
      data.maxLevel ?? MAX_JOB_MEDAL_LEVEL
    )
  }
}
