// src/entities/InventoryEntity.ts
// Pure data container — wraps a dict of gems with JSON serialization.
// No game logic, no Vue reactivity.

import { GemEntity } from './GemEntity'
import type { GemJSON } from './GemEntity'

/** Plain JSON dict of { gemId: gemJSON } as persisted in save data. */
export type InventoryJSON = Record<string, GemJSON>

export class InventoryEntity {
  /** Dict of { gemId: GemEntity, ... } */
  gems: Record<string, GemEntity>

  constructor(gems: Record<string, GemEntity> = {}) {
    this.gems = gems
  }

  /** Add or overwrite a gem by its id */
  addGem(gem: GemEntity): void {
    this.gems[gem.id] = gem
  }

  /** Remove a gem by its id */
  removeGem(id: string): void {
    delete this.gems[id]
  }

  /** Look up a gem by id */
  getGem(id: string): GemEntity | null {
    return this.gems[id] || null
  }

  /** Return all gem instances as an array */
  getAll(): GemEntity[] {
    return Object.values(this.gems)
  }

  /** Number of collected gems */
  get count(): number {
    return Object.keys(this.gems).length
  }

  /** Get all gem ids */
  keys(): string[] {
    return Object.keys(this.gems)
  }

  /** Serialize to plain JSON */
  toJSON(): InventoryJSON {
    const serialized: InventoryJSON = {}
    for (const [key, gem] of Object.entries(this.gems)) {
      serialized[key] = gem instanceof GemEntity ? gem.toJSON() : gem
    }
    return serialized
  }

  /** Deserialize from plain JSON */
  static fromJSON(data: InventoryJSON | null | undefined): InventoryEntity {
    const gems: Record<string, GemEntity> = {}
    if (data) {
      for (const [key, gemData] of Object.entries(data)) {
        gems[key] = GemEntity.fromJSON(gemData)
      }
    }
    return new InventoryEntity(gems)
  }
}
