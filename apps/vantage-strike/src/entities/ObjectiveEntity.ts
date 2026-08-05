// src/entities/ObjectiveEntity.ts
// Pure data holder — combat objective state with factory + JSON serialization.
// No game logic, no Vue reactivity.

/** Full data shape accepted by the ObjectiveEntity constructor. */
export interface ObjectiveData {
  id: string
  name: string
  generation: number
  grade: number
  heroArmy: number
  enemyArmyMax: number
  enemyArmyCurrent: number
  completed: number
  totalCompletionsNeeded: number
  portraitUrl: string | null
  barUrl: string | null
  mp4Url: string | null
  dmgPopupTimer?: number
  combatAccumulator?: number
  autoDmgId?: number
  videoReady?: boolean
  totalDamageDealt?: number
}

/** Overrides accepted by the static create() factory. */
export interface ObjectiveCreateOptions {
  generation?: number
  heroArmy?: number
  enemyArmyMax?: number
  enemyArmyCurrent?: number
  completed?: number
  totalCompletionsNeeded?: number
  lastRebirthStage?: number
}

/** Plain JSON shape of an objective as persisted in save data. */
export interface ObjectiveJSON {
  id: string
  name: string
  generation: number
  grade: number
  heroArmy: number
  enemyArmyMax: number
  enemyArmyCurrent: number
  completed: number
  totalCompletionsNeeded: number
  portraitUrl: string | null
  barUrl: string | null
  mp4Url: string | null
  combatAccumulator: number
  totalDamageDealt: number
}

export class ObjectiveEntity {
  id: string
  name: string
  generation: number
  grade: number
  heroArmy: number
  enemyArmyMax: number
  enemyArmyCurrent: number
  completed: number
  totalCompletionsNeeded: number
  portraitUrl: string | null
  barUrl: string | null
  mp4Url: string | null
  dmgPopupTimer: number
  combatAccumulator: number
  autoDmgId: number
  videoReady: boolean
  totalDamageDealt: number

  constructor(data: ObjectiveData) {
    this.id = data.id
    this.name = data.name
    this.generation = data.generation
    this.grade = data.grade
    this.heroArmy = data.heroArmy
    this.enemyArmyMax = data.enemyArmyMax
    this.enemyArmyCurrent = data.enemyArmyCurrent
    this.completed = data.completed
    this.totalCompletionsNeeded = data.totalCompletionsNeeded
    this.portraitUrl = data.portraitUrl || null
    this.barUrl = data.barUrl || null
    this.mp4Url = data.mp4Url || null
    this.dmgPopupTimer = data.dmgPopupTimer ?? 0
    this.combatAccumulator = data.combatAccumulator ?? 0
    this.autoDmgId = data.autoDmgId ?? 0
    this.videoReady = data.videoReady ?? false
    this.totalDamageDealt = data.totalDamageDealt ?? 0
  }

  /**
   * Factory: create a new objective for a given hero name and grade.
   * @param options - overrides for computed fields
   */
  static create(heroName: string, grade: number, options: ObjectiveCreateOptions = {}): ObjectiveEntity {
    const baseMax = 1000 * Math.pow(2, grade - 1)
    return new ObjectiveEntity({
      id: Math.random().toString(36).substr(2, 9),
      name: heroName,
      generation: options.generation ?? 1,
      grade,
      heroArmy: options.heroArmy ?? 260,
      enemyArmyMax: options.enemyArmyMax ?? baseMax,
      enemyArmyCurrent: options.enemyArmyCurrent ?? baseMax,
      completed: options.completed ?? 0,
      totalCompletionsNeeded: options.totalCompletionsNeeded ?? (10 + (options.lastRebirthStage ?? 0)),
      portraitUrl: null,
      barUrl: null,
      mp4Url: null,
      dmgPopupTimer: 0,
      combatAccumulator: 0,
      autoDmgId: 0,
      videoReady: false,
      totalDamageDealt: 0
    })
  }

  /** Serialize to plain JSON */
  toJSON(): ObjectiveJSON {
    return {
      id: this.id,
      name: this.name,
      generation: this.generation,
      grade: this.grade,
      heroArmy: this.heroArmy,
      enemyArmyMax: this.enemyArmyMax,
      enemyArmyCurrent: this.enemyArmyCurrent,
      completed: this.completed,
      totalCompletionsNeeded: this.totalCompletionsNeeded,
      portraitUrl: this.portraitUrl,
      barUrl: this.barUrl,
      mp4Url: this.mp4Url,
      combatAccumulator: this.combatAccumulator || 0,
      totalDamageDealt: this.totalDamageDealt || 0
    }
  }

  /** Deserialize from plain JSON */
  static fromJSON(data: ObjectiveJSON): ObjectiveEntity {
    return new ObjectiveEntity(data)
  }
}
