// src/models/JobMedalSystem.js
// Per-character collection of 10 job medals.
// Each medal tracks stat accumulation for leveling and generates force.

import JobMedal from './JobMedal.js'

export default class JobMedalSystem {
  /**
   * @param {string} characterName - e.g. "Voltkin"
   * @param {Array} [medals] - optional array of JobMedal instances or plain data (for restore)
   * @param {number} [selectedIndex=0] - which medal is currently selected (0..9)
   */
  constructor(characterName, medals = null, selectedIndex = 0) {
    this.characterName = characterName
    this.medalSlots = medals
      ? medals.map(m => (m instanceof JobMedal ? m : JobMedal.fromJSON(m)))
      : []
    this.selectedMedalIndex = selectedIndex
  }

  /**
   * Static factory: create a full set of 10 medals for a character.
   * @param {string} characterName
   * @param {Array} medalDefs - JOB_MEDAL_DEFS[characterName] array
   * @returns {JobMedalSystem}
   */
  static createForCharacter(characterName, medalDefs) {
    const medals = (medalDefs || []).map(def => new JobMedal(def.id, 0))
    return new JobMedalSystem(characterName, medals, 0)
  }

  /** Get the currently selected medal. */
  get selectedMedal() {
    return this.medalSlots[this.selectedMedalIndex] || null
  }

  /**
   * Check all medals against current hero stats to see if any should level up.
   * Each medal is checked in a loop to handle multi-level-ups when stats
   * exceed multiple thresholds at once.
   *
   * @param {Object} heroStats - current effective hero stats { Str, Spi, Int, Con, Dex }
   * @returns {Array<string>} array of unique medalIds that leveled up
   */
  checkAllMedals(heroStats) {
    const leveledUp = []
    for (const medal of this.medalSlots) {
      if (medal.isMaxLevel) continue
      // Loop to handle multi-level-up when stats exceed several thresholds
      let didLevelUp = false
      while (medal.checkLevelUp(heroStats)) {
        didLevelUp = true
        if (medal.isMaxLevel) break
      }
      if (didLevelUp) {
        leveledUp.push(medal.medalId)
      }
    }
    return leveledUp
  }

  /**
   * Get a specific medal by its medalId.
   * @param {string} medalId
   * @returns {JobMedal|undefined}
   */
  getMedal(medalId) {
    return this.medalSlots.find(m => m.medalId === medalId)
  }

  /** Serialize to plain JSON. */
  toJSON() {
    return {
      characterName: this.characterName,
      medalSlots: this.medalSlots.map(m => m.toJSON()),
      selectedMedalIndex: this.selectedMedalIndex
    }
  }

  /** Deserialize from plain JSON. */
  static fromJSON(data) {
    return new JobMedalSystem(
      data.characterName,
      data.medalSlots,
      data.selectedMedalIndex ?? 0
    )
  }
}
