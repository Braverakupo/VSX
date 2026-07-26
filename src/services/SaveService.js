// src/services/SaveService.js
// Save/Load abstraction layer — localStorage persistence with versioning.
// Provides read/write access to game save data.

const STORAGE_KEY = 'shadow_blade_save'
const CURRENT_VERSION = 3

// ─── Public API ───

/**
 * Load the full game data from localStorage.
 * @returns {Promise<Object|null>} game data object, or null if no save exists
 */
export async function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw)
    return payload.data || null
  } catch (e) {
    console.warn('[SaveService] Load failed', e)
    return null
  }
}

/**
 * Save the full game data to localStorage.
 * @param {Object} gameData - serialized game state
 * @returns {Promise<boolean>}
 */
export async function saveGame(gameData) {
  try {
    const payload = {
      version: CURRENT_VERSION,
      updatedAt: Date.now(),
      data: gameData
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch (e) {
    console.warn('[SaveService] Save failed', e)
    return false
  }
}

/**
 * Check if a save exists.
 * @returns {Promise<boolean>}
 */
export async function hasSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return !!raw
  } catch {
    return false
  }
}

/**
 * Delete the saved game data.
 * @returns {Promise<boolean>}
 */
export async function deleteSave() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

/**
 * Get save metadata (version + timestamp) without loading full data.
 * @returns {Promise<{version: number, updatedAt: number}|null>}
 */
export async function getSaveMeta() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { version, updatedAt } = JSON.parse(raw)
    return { version, updatedAt }
  } catch {
    return null
  }
}

/**
 * Get the player identity string (always 'local' for localStorage).
 * @returns {string}
 */
export function getPlayerIdentity() {
  return 'local'
}

export default {
  getPlayerIdentity,
  loadGame,
  hasSave,
  saveGame,
  deleteSave,
  getSaveMeta
}
