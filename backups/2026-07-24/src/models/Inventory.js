// src/models/Inventory.js
// Inventory class — wraps the collected gems dict with JSON serialization

import Gem from './Gem.js'

export default class Inventory {
  /**
   * @param {Object} [gems={}] - initial dict of { gemId: GemInstance, ... }
   */
  constructor(gems = {}) {
    // Store gems as a plain object. When this Inventory instance is nested
    // inside a Vue reactive() proxy (via heroRegistry), Vue 3's deep Proxy
    // handles tracking all property reads/writes on this.gems.
    this.gems = gems
  }

  /**
   * Add or overwrite a gem by its id.
   * @param {Gem} gem
   */
  addGem(gem) {
    this.gems[gem.id] = gem
  }

  /**
   * Remove a gem by its id.
   * @param {string} id
   */
  removeGem(id) {
    delete this.gems[id]
  }

  /**
   * Look up a gem by id.
   * @param {string} id
   * @returns {Gem|null}
   */
  getGem(id) {
    return this.gems[id] || null
  }

  /**
   * Return all gem instances as an array.
   * @returns {Gem[]}
   */
  getAll() {
    return Object.values(this.gems)
  }

  /**
   * Number of collected gems.
   * @returns {number}
   */
  get count() {
    return Object.keys(this.gems).length
  }

  /**
   * Get all gem ids.
   * @returns {string[]}
   */
  keys() {
    return Object.keys(this.gems)
  }

  /**
   * Serialize to plain JSON.
   * Each Gem instance is serialized via its toJSON() method.
   */
  toJSON() {
    const serialized = {}
    for (const [key, gem] of Object.entries(this.gems)) {
      serialized[key] = gem instanceof Gem ? gem.toJSON() : gem
    }
    return serialized
  }

  /**
   * Deserialize from a plain JSON object back into an Inventory instance.
   * Each gem entry is reconstructed as a Gem instance via Gem.fromJSON().
   * @param {Object} data - raw JSON object of { gemId: gemData, ... }
   * @returns {Inventory}
   */
  static fromJSON(data) {
    const gems = {}
    if (data) {
      for (const [key, gemData] of Object.entries(data)) {
        gems[key] = Gem.fromJSON(gemData)
      }
    }
    return new Inventory(gems)
  }
}
