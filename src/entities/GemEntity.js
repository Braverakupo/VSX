// src/entities/GemEntity.js
// Pure data holder — gem state with JSON serialization.
// No game logic, no Vue reactivity. All computation moved to gemSystem.

import { ALL_GEMS } from '../config/gameData.js'

export class GemEntity {
  /**
   * @param {string} color  - color key: "reds" | "blues" | "cyans" | "oranges" | "purples" | "blacks"
   * @param {number} gemIdx - index into ALL_GEMS[color] for the image
   * @param {Object} [options]
   * @param {string} [options.id]
   * @param {number} [options.tier]
   * @param {number} [options.level]
   * @param {number} [options.xp]
   * @param {string} [options.name]
   * @param {string} [options.classId]
   * @param {number} [options.cd]
   * @param {number} [options.dmg]
   * @param {Array}  [options.modifiers]
   */
  constructor(color, gemIdx, options = {}) {
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
    this.modifiers = options.modifiers || []
  }

  /** Resolve image file path from the asset registry */
  get imagePath() {
    return ALL_GEMS[this.color]?.[this.gemIdx] || null
  }

  /** Generate a default name based on color only (no class logic) */
  _defaultName() {
    const colorLabel = {
      reds: 'Ruby', blues: 'Sapphire', oranges: 'Topaz',
      cyans: 'Aquamarine', purples: 'Amethyst', blacks: 'Onyx'
    }[this.color] || this.color
    return `${colorLabel} Gem`
  }

  /** Serialize to plain JSON */
  toJSON() {
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
      modifiers: this.modifiers ? [...this.modifiers] : []
    }
  }

  /** Deserialize from plain JSON */
  static fromJSON(data) {
    return new GemEntity(data.color, data.gemIdx, {
      id: data.id,
      tier: data.tier ?? 1,
      level: data.level ?? 1,
      xp: data.xp ?? 0,
      name: data.name,
      classId: data.classId || null,
      cd: data.cd,
      dmg: data.dmg,
      modifiers: data.modifiers || []
    })
  }
}
