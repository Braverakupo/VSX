// src/entities/JobMedalSystemEntity.ts
// Pure data container — per-character collection of 10 job medals.
// No game logic — all medal checking moved to medalSystem.

import { JobMedalEntity } from './JobMedalEntity'
import type { JobMedalJSON } from './JobMedalEntity'
import type { JobMedalDef } from '../config/jobMedalData'

/** Plain JSON shape of a job-medal system as persisted in save data. */
export interface JobMedalSystemJSON {
  characterName: string
  medalSlots?: JobMedalJSON[] | null
  selectedMedalIndex?: number
}

export class JobMedalSystemEntity {
  characterName: string
  medalSlots: JobMedalEntity[]
  selectedMedalIndex: number

  /**
   * @param medals - array of JobMedalEntity instances or plain data
   */
  constructor(characterName: string, medals: Array<JobMedalEntity | JobMedalJSON> | null = null, selectedIndex: number = 0) {
    this.characterName = characterName
    this.medalSlots = medals
      ? medals.map(m => (m instanceof JobMedalEntity ? m : JobMedalEntity.fromJSON(m)))
      : []
    this.selectedMedalIndex = selectedIndex
  }

  /** Get the currently selected medal */
  get selectedMedal(): JobMedalEntity | null {
    return this.medalSlots[this.selectedMedalIndex] || null
  }

  /**
   * Static factory: create a full set of 10 medals for a character.
   * @param medalDefs - JOB_MEDAL_DEFS[characterName]
   */
  static createForCharacter(characterName: string, medalDefs: JobMedalDef[] | null | undefined): JobMedalSystemEntity {
    const medals = (medalDefs || []).map(def => new JobMedalEntity(def.id, 0))
    return new JobMedalSystemEntity(characterName, medals, 0)
  }

  /** Serialize to plain JSON */
  toJSON(): JobMedalSystemJSON {
    return {
      characterName: this.characterName,
      medalSlots: this.medalSlots.map(m => m.toJSON()),
      selectedMedalIndex: this.selectedMedalIndex
    }
  }

  /** Deserialize from plain JSON */
  static fromJSON(data: JobMedalSystemJSON): JobMedalSystemEntity {
    return new JobMedalSystemEntity(
      data.characterName,
      data.medalSlots,
      data.selectedMedalIndex ?? 0
    )
  }
}
