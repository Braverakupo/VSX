// src/entities/JobMedalSystemEntity.js
// Pure data container — per-character collection of 10 job medals.
// No game logic — all medal checking moved to medalSystem.

import { JobMedalEntity } from './JobMedalEntity.js'

export class JobMedalSystemEntity {
  /**
   * @param {string} characterName
   * @param {Array} [medals] - array of JobMedalEntity instances or plain data
   * @param {number} [selectedIndex=0]
   */
  constructor(characterName, medals = null, selectedIndex = 0) {
    this.characterName = characterName
    this.medalSlots = medals
      ? medals.map(m => (m instanceof JobMedalEntity ? m : JobMedalEntity.fromJSON(m)))
      : []
    this.selectedMedalIndex = selectedIndex
  }

  /** Get the currently selected medal */
  get selectedMedal() {
    return this.medalSlots[this.selectedMedalIndex] || null
  }

  /**
   * Static factory: create a full set of 10 medals for a character.
   * @param {string} characterName
   * @param {Array} medalDefs - JOB_MEDAL_DEFS[characterName]
   * @returns {JobMedalSystemEntity}
   */
  static createForCharacter(characterName, medalDefs) {
    const medals = (medalDefs || []).map(def => new JobMedalEntity(def.id, 0))
    return new JobMedalSystemEntity(characterName, medals, 0)
  }

  /** Serialize to plain JSON */
  toJSON() {
    return {
      characterName: this.characterName,
      medalSlots: this.medalSlots.map(m => m.toJSON()),
      selectedMedalIndex: this.selectedMedalIndex
    }
  }

  /** Deserialize from plain JSON */
  static fromJSON(data) {
    return new JobMedalSystemEntity(
      data.characterName,
      data.medalSlots,
      data.selectedMedalIndex ?? 0
    )
  }
}
