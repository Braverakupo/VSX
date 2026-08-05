// src/services/SaveService.ts
// Save/Load abstraction layer — localStorage persistence with versioning.
// Provides read/write access to game save data.

const STORAGE_KEY = 'shadow_blade_save'
const CURRENT_VERSION = 3

// ─── Public API ───

/**
 * Load the full game data from localStorage.
 * @returns game data object, or null if no save exists
 */
export async function loadGame(): Promise<unknown> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const payload = JSON.parse(raw) as { data?: unknown }
    return payload.data || null
  } catch (e) {
    console.warn('[SaveService] Load failed', e)
    return null
  }
}

/**
 * Save the full game data to localStorage.
 */
export async function saveGame(gameData: unknown): Promise<boolean> {
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
 */
export async function hasSave(): Promise<boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return !!raw
  } catch {
    return false
  }
}

/**
 * Delete the saved game data.
 */
export async function deleteSave(): Promise<boolean> {
  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

/**
 * Get save metadata (version + timestamp) without loading full data.
 */
export async function getSaveMeta(): Promise<{ version: number; updatedAt: number } | null> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { version, updatedAt } = JSON.parse(raw) as { version: number; updatedAt: number }
    return { version, updatedAt }
  } catch {
    return null
  }
}

/**
 * Get the player identity string (always 'local' for localStorage).
 */
export function getPlayerIdentity(): string {
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
