// src/models/Gem.js
// Gem class — encapsulates all gem data and behavior with JSON serialization
// Each gem is now a CLASS (FF13 Paradigm-style) that grants unique passive bonuses.
// No active skill abilities — all effects are passive modifiers.
//
// Gems can also roll random modifiers (affixes) on creation:
//   - damageMult: flat % increase to all outgoing damage
// Each modifier has a ~50% chance to roll, and its value scales with gem tier.

import { ALL_GEMS, gemColorInfo, classDefinitions, abilityDefinitions, GEM_MODIFIER_DEFS } from '../config/gameData.js'

/** Possible modifier types that can roll on a gem. */
const MODIFIER_TYPES = ['damageMult', 'vantageCapBoost', 'statPerCompletion']

export default class Gem {
  /**
   * @param {string} color  - color key: "reds" | "blues" | "cyans" | "oranges" | "purples" | "blacks"
   * @param {number} gemIdx - index into ALL_GEMS[color] array for the image
   * @param {Object} [options]
   * @param {string} [options.id]         - optional explicit UUID (default: auto-generated)
   * @param {number} [options.tier]       - rarity/quality tier (default: 1)
   * @param {number} [options.level]      - upgrade level (default: 1)
   * @param {number} [options.xp]         - experience toward next level (default: 0)
   * @param {string} [options.name]       - display name (default: auto-generated)
   * @param {string} [options.classId]    - class definition id (e.g. "vanguard")
   * @param {string} [options.abilityId]  - alias for classId (backward compat)
   * @param {number} [options.baseDamage] - base damage multiplier (legacy, default: tier)
   * @param {Array}  [options.modifiers]  - pre-rolled modifiers [{ type, value }] (default: auto-rolled)
   */
  constructor(color, gemIdx, options = {}) {
    this.id = options.id || "gem_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 8)
    this.color = color
    this.gemIdx = gemIdx
    this.tier = options.tier ?? 1
    this.level = options.level ?? 1
    this.xp = options.xp ?? 0
    this.name = options.name || this.generateName()
    this.baseDamage = options.baseDamage ?? this.tier

    // ── Force Gain metrics ──
    // dmg: base force value — scales with gem level (~5 per level)
    this.cd = options.cd ?? Math.max(0.5, 3 - (this.tier - 1) * 0.3)
    this.dmg = options.dmg ?? this.level * 5

    // ── Class system (core identity) ──
    // Support both classId and abilityId for backward compatibility
    this.classId = options.classId || options.abilityId || null
    this.abilityId = this.classId  // keep in sync

    // ── Rollable modifiers (affixes) ──
    // Each gem rolls 3-6 random modifiers (duplicates allowed, values stack).
    // Plus a separate 5% chance for vantageCapBoost as a 7th slot.
    // If modifiers are provided explicitly, use them; otherwise auto-roll.
    this.modifiers = options.modifiers || this.rollModifiers()
  }

  /**
   * Roll random modifiers for this gem.
   * Each gem rolls 3-6 standard modifiers from ['damageMult']
   * (random pick with replacement, duplicates stack additively).
   * Plus a separate 5% chance for each legendary modifier as a potential 7th slot.
   * Values scale with gem tier via GEM_MODIFIER_DEFS.
   * @returns {Array<{type: string, value: number}>}
   */
  rollModifiers() {
    const rolled = []
    // Legends-only modifiers (vantageCapBoost, statPerCompletion) only roll as 7th-slot legendaries, not in standard pool
    const standardTypes = MODIFIER_TYPES.filter(t => t !== 'vantageCapBoost' && t !== 'statPerCompletion')

    // ── Roll 3-6 standard modifiers from the pool (with replacement) ──
    const count = 3 + Math.floor(Math.random() * 4) // 3 to 6
    for (let i = 0; i < count; i++) {
      const type = standardTypes[Math.floor(Math.random() * standardTypes.length)]
      const def = GEM_MODIFIER_DEFS[type]
      if (!def) continue
      const value = def.base + (this.tier - 1) * def.perTier
      rolled.push({ type, value: Math.round(value * 10000) / 10000 })
    }

    // ── Legendary 7th slots: each has independent 5% chance ──
    // vantageCapBoost — random 5-10
    if (Math.random() < 0.05) {
      const value = Math.floor(Math.random() * 6) + 5  // 5-10 inclusive
      rolled.push({ type: 'vantageCapBoost', value })
    }
    // statPerCompletion (Mystic Aura) — fixed +0.10
    if (Math.random() < 0.05) {
      const value = 0.10
      rolled.push({ type: 'statPerCompletion', value })
    }

    return rolled
  }

  /**
   * Get the total value of a specific modifier type (summed across duplicates).
   * @param {string} type - modifier type ('damageMult'|'vantageCapBoost'|'statPerCompletion')
   * @returns {number}
   */
  getModifierValue(type) {
    if (!this.modifiers) return 0
    let total = 0
    for (const mod of this.modifiers) {
      if (mod.type === type) total += mod.value
    }
    return total
  }

  /**
   * Check if this gem has a specific modifier type rolled (at least once).
   * @param {string} type
   * @returns {boolean}
   */
  hasModifier(type) {
    if (!this.modifiers) return false
    return this.modifiers.some(m => m.type === type)
  }

  /** Resolve the actual image file path from the asset registry. */
  get imagePath() {
    return ALL_GEMS[this.color]?.[this.gemIdx] || null
  }

  /** Look up the class definition from gameData. */
  get classDef() {
    if (!this.classId) return null
    return classDefinitions.find(c => c.id === this.classId) || null
  }

  /** Alias for backward compatibility — returns classDef. */
  get abilityDef() {
    return this.classDef
  }

  /** Whether this gem has a class assigned. */
  get hasClass() {
    return !!this.classId && !!this.classDef
  }

  /** Alias for backward compatibility. */
  get hasAbility() {
    return this.hasClass
  }

  /** Get the class description (flavor text). */
  get classDescription() {
    const def = this.classDef
    if (!def) return ''
    return def.description
  }

  /** Alias for backward compatibility. */
  get abilityDescription() {
    return this.classDescription
  }

  /**
   * Get the stat keys this gem's damage scales with, based on its class's flatStats.
   * Returns an array of stat keys (e.g., ['Str', 'Con'] for 50:50, ['Str'] for 100%).
   * If the gem has no class or no flatStats, returns an empty array.
   * @returns {string[]}
   */
  get scalingStats() {
    const def = this.classDef
    if (!def || !def.flatStats) return []
    return Object.keys(def.flatStats)
  }

  /**
   * Get a human-readable label describing the gem's stat scaling.
   * Examples: "100% Str", "50% Str + 50% Con", "No scaling"
   * @returns {string}
   */
  get scalingLabel() {
    const stats = this.scalingStats
    if (stats.length === 0) return 'No scaling'
    if (stats.length === 1) return `100% ${stats[0]}`
    const ratio = (100 / stats.length).toFixed(0)
    return stats.map(s => `${ratio}% ${s}`).join(' + ')
  }

  /**
   * Compute the combined stat value used for damage scaling.
   * For 1 stat: returns that stat's value directly.
   * For 2+ stats: returns the average (50:50 ratio).
   * If the gem has no class or no flatStats, returns 0.
   * @param {Object} effectiveStats - hero effective stats { Str, Spi, Int, Con, Dex }
   * @returns {number}
   */
  getScalingStatValue(effectiveStats) {
    const stats = this.scalingStats
    if (stats.length === 0) return 0
    if (stats.length === 1) {
      return effectiveStats[stats[0]] || 0
    }
    // 2+ stats: average for equal ratio split
    let total = 0
    for (const key of stats) {
      total += effectiveStats[key] || 0
    }
    return total / stats.length
  }

  /**
   * Compute scaled damage using the given effective hero stats.
   * Base damage * (1 + scalingStatValue * SCALING_FACTOR).
   * Each stat point adds SCALING_FACTOR (default 0.5 = 50%) more damage.
   * @param {Object} effectiveStats - hero effective stats { Str, Spi, Int, Con, Dex }
   * @param {number} [perStatFactor=0.5] - damage multiplier per stat point
   * @returns {number}
   */
  computeScaledDamage(effectiveStats, perStatFactor = 0.5) {
    const statVal = this.getScalingStatValue(effectiveStats)
    return this.dmg * (1 + statVal * perStatFactor)
  }

  /**
   * Generate a human-readable gem name based on color, tier, and class.
   * If the gem has a class, the class name is used directly.
   */
  generateName() {
    const colorLabel = gemColorInfo[this.color]?.label || this.color

    if (this.classDef) {
      // Use the class name directly — the gem IS the class
      return this.classDef.name
    }

    // Fallback for gems without a class
    const tierLabels = ["", "Lesser ", "Greater ", "Superior ", "Flawless ", "Perfect "]
    const prefix = tierLabels[this.tier] || `T${this.tier} `
    const suffixes = ["Gem", "Jewel", "Orb", "Materia", "Core", "Essence"]
    const suffix = suffixes[this.gemIdx % suffixes.length] || "Gem"
    return prefix + suffix + " of " + (colorLabel.split("'")[0]?.trim() || "Power")
  }

  /**
   * Serialize to plain JSON (called automatically by JSON.stringify).
   * Excludes runtime-only fields.
   */
  toJSON() {
    return {
      id: this.id,
      color: this.color,
      gemIdx: this.gemIdx,
      tier: this.tier,
      name: this.name,
      classId: this.classId,
      abilityId: this.abilityId,
      baseDamage: this.baseDamage,
      cd: this.cd,
      dmg: this.dmg,
      modifiers: this.modifiers
    }
  }

  /**
   * Deserialize from a plain JSON object back into a Gem instance.
   * Supports both classId and legacy abilityId fields.
   * @param {Object} data - raw JSON object (as produced by toJSON)
   * @returns {Gem}
   */
  static fromJSON(data) {
    return new Gem(data.color, data.gemIdx, {
      id: data.id,
      tier: data.tier ?? 1,
      level: data.level ?? 1,
      xp: data.xp ?? 0,
      name: data.name,
      classId: data.classId || data.abilityId || null,
      abilityId: data.abilityId || data.classId || null,
      baseDamage: data.baseDamage,
      cd: data.cd,
      dmg: data.dmg,
      modifiers: data.modifiers || null
    })
  }
}
