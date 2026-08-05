// src/entities/JobMedalEntity.ts
// Pure data holder — single job medal state with JSON serialization.
// Includes getProgress() for convenient template access.

import { MAX_JOB_MEDAL_LEVEL } from '../config/jobMedalData'
import { getMedalDefById, LEVEL_BASE, LEVEL_MULT } from '../config/jobMedalData'
import type { StatName } from '../config/gameData'

/** Plain JSON shape of a job medal as persisted in save data. */
export interface JobMedalJSON {
  medalId: string
  level?: number
  maxLevel?: number
}

/** Hero stat record passed into progress/stat-value helpers. */
export type HeroStatsInput = Partial<Record<StatName, number>>

export class JobMedalEntity {
  medalId: string
  level: number
  maxLevel: number

  constructor(medalId: string, level: number = 0, maxLevel: number = MAX_JOB_MEDAL_LEVEL) {
    this.medalId = medalId
    this.level = level
    this.maxLevel = maxLevel
  }

  /** Whether this medal has reached its maximum level */
  get isMaxLevel(): boolean {
    return this.level >= this.maxLevel
  }

  /**
   * Get progress fraction (0..1) toward next medal level.
   * @param heroStats - { Str, Spi, Int, Con, Dex }
   */
  getProgress(heroStats: HeroStatsInput | null | undefined): number {
    if (this.isMaxLevel) return 1
    const val = this.getStatValue(heroStats)
    const tgt = this.getTarget()
    if (tgt <= 0) return 1
    return Math.min(1, Math.max(0, val / tgt))
  }

  /**
   * Sum of the stat values tracked by this medal.
   * @param heroStats - { Str, Spi, Int, Con, Dex }
   */
  getStatValue(heroStats: HeroStatsInput | null | undefined): number {
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

  /** Get the stat-points target for the next level. */
  getTarget(): number {
    if (this.isMaxLevel) return Infinity
    let t = LEVEL_BASE
    for (let i = 0; i < this.level; i++) {
      t = Math.ceil(t * LEVEL_MULT)
    }
    return t
  }

  /** Serialize to plain JSON */
  toJSON(): JobMedalJSON {
    return {
      medalId: this.medalId,
      level: this.level,
      maxLevel: this.maxLevel
    }
  }

  /** Deserialize from plain JSON */
  static fromJSON(data: JobMedalJSON): JobMedalEntity {
    return new JobMedalEntity(
      data.medalId,
      data.level ?? 0,
      data.maxLevel ?? MAX_JOB_MEDAL_LEVEL
    )
  }
}
