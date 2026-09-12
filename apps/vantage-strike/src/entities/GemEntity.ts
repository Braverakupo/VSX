// src/entities/GemEntity.ts
// Pure data holder — gem state with JSON serialization.
// No game logic, no Vue reactivity. All computation moved to gemSystem.

import { ALL_GEMS } from '../config/gameData'
import type { GemColor } from '../config/gameData'

/** A single rolled gem modifier, e.g. { type: 'damageMult', value: 0.025 }. */
export interface GemModifier {
  type: string
  value: number
  /** Targeted per-stat bonus (completionStat modifiers only). */
  targetStat?: string
}

/** Constructor options for a GemEntity (color + gemIdx are positional params). */
export interface GemOptions {
  id?: string
  tier?: number
  level?: number
  xp?: number
  name?: string
  classId?: string | null
  cd?: number
  dmg?: number
  owner?: string | null
  modifiers?: GemModifier[]
}

/** Plain JSON shape of a gem as persisted / loaded from save data. */
export interface GemJSON {
  id?: string
  color: GemColor
  gemIdx: number
  tier?: number
  level?: number
  xp?: number
  name?: string
  classId?: string | null
  cd?: number
  dmg?: number
  owner?: string | null
  modifiers?: GemModifier[]
}

export class GemEntity {
  id: string
  color: GemColor
  gemIdx: number
  tier: number
  level: number
  xp: number
  name: string
  classId: string | null
  cd: number
  dmg: number
  /** Owning character name. Locked gems can only be equipped by this hero; null = legacy/unowned. */
  owner: string | null
  /** Rolled modifiers (read-only surface — gems are never mutated in place). */
  modifiers: readonly GemModifier[]

  /**
   * @param color  - color key: "reds" | "blues" | "cyans" | "oranges" | "purples" | "blacks"
   * @param gemIdx - index into ALL_GEMS[color] for the image
   */
  constructor(color: GemColor, gemIdx: number, options: GemOptions = {}) {
    this.id = options.id || "gem_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 8)
    this.color = color
    this.gemIdx = gemIdx
    this.tier = options.tier ?? 1
    this.level = options.level ?? 1
    this.xp = options.xp ?? 0
    this.name = options.name || this._defaultName()
    this.classId = options.classId || null
    this.cd = options.cd ?? Math.max(0.5, 3 - (this.tier - 1) * 0.3)
    this.dmg = options.dmg ?? this.level * 5
    this.owner = options.owner || null
    this.modifiers = options.modifiers || []
  }

  /** Resolve image file path from the asset registry */
  get imagePath(): string | null {
    return ALL_GEMS[this.color]?.[this.gemIdx] || null
  }

  /** Generate a default name based on color only (no class logic) */
  _defaultName(): string {
    const colorLabel = {
      reds: 'Ruby', blues: 'Sapphire', oranges: 'Topaz',
      cyans: 'Aquamarine', purples: 'Amethyst', blacks: 'Onyx'
    }[this.color] || this.color
    return `${colorLabel} Gem`
  }

  /** Serialize to plain JSON */
  toJSON(): GemJSON {
    return {
      id: this.id,
      color: this.color,
      gemIdx: this.gemIdx,
      tier: this.tier,
      level: this.level,
      xp: this.xp,
      name: this.name,
      classId: this.classId,
      cd: this.cd,
      dmg: this.dmg,
      owner: this.owner,
      modifiers: this.modifiers ? [...this.modifiers] : []
    }
  }

  /** Deserialize from plain JSON */
  static fromJSON(data: GemJSON): GemEntity {
    return new GemEntity(data.color, data.gemIdx, {
      id: data.id,
      tier: data.tier ?? 1,
      level: data.level ?? 1,
      xp: data.xp ?? 0,
      name: data.name,
      classId: data.classId || null,
      cd: data.cd,
      dmg: data.dmg,
      owner: data.owner || null,
      modifiers: data.modifiers || []
    })
  }
}
