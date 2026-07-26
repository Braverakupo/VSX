// src/entities/InventoryEntity.js
// Pure data container — wraps a dict of gems with JSON serialization.
// No game logic, no Vue reactivity.

import { GemEntity } from './GemEntity.js'

export class InventoryEntity {
  /**
   * @param {Object} [gems={}] - initial dict of { gemId: GemEntity, ... }
   */
  constructor(gems = {}) {
    this.gems = gems
  }

  /** Add or overwrite a gem by its id */
  addGem(gem) {
    this.gems[gem.id] = gem
  }

  /** Remove a gem by its id */
  removeGem(id) {
    delete this.gems[id]
  }

  /** Look up a gem by id */
  getGem(id) {
    return this.gems[id] || null
  }

  /** Return all gem instances as an array */
  getAll() {
    return Object.values(this.gems)
  }

  /** Number of collected gems */
  get count() {
    return Object.keys(this.gems).length
  }

  /** Get all gem ids */
  keys() {
    return Object.keys(this.gems)
  }

  /** Serialize to plain JSON */
  toJSON() {
    const serialized = {}
    for (const [key, gem] of Object.entries(this.gems)) {
      serialized[key] = gem instanceof GemEntity ? gem.toJSON() : gem
    }
    return serialized
  }

  /** Deserialize from plain JSON */
  static fromJSON(data) {
    const gems = {}
    if (data) {
      for (const [key, gemData] of Object.entries(data)) {
        gems[key] = GemEntity.fromJSON(gemData)
      }
    }
    return new InventoryEntity(gems)
  }
}
