import { ref, computed } from 'vue'
import { clearSaveData } from './useGameState'

/**
 * Auth state + API client for the Vantage Strike account system.
 * Server owns the real sessions (server/sessions table); the client only
 * persists the session token (localStorage).
 *
 * API base resolution:
 *  - VITE_API_BASE set at build time  -> call that host (production: hosted server)
 *  - unset                            -> relative /api/* (dev: vite.server.proxy
 *                                        → server/auth.ts; static hosts return 405)
 */

export interface AuthUser {
  id: number
  username: string
}

// Build-time API origin (e.g. https://vsx-api.onrender.com). Empty = same-origin /api/*.
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')

const TOKEN_KEY = 'vs_auth_token'

const user = ref<AuthUser | null>(null)
const token = ref<string | null>(null)
const error = ref('')
const isBusy = ref(false)

const isLoggedIn = computed(() => user.value !== null)

function loadStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function persistToken(value: string | null): void {
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable — session lasts for this page load only */
  }
}

async function api(path: string, body?: unknown): Promise<{ user?: AuthUser; token?: string; error?: string; save?: unknown; updatedAt?: number }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token.value) headers['X-Auth-Token'] = token.value
  let res: Response
  try {
    res = await fetch(API_BASE + '/api' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    })
  } catch {
    throw new Error('Cannot reach the account server. Is it running?')
  }
  let json: { user?: AuthUser; token?: string; error?: string; save?: unknown; updatedAt?: number } = {}
  try { json = await res.json() } catch { /* 204 no body */ }
  if (!res.ok) {
    throw new Error(
      json.error ??
      (res.status === 405 || res.status === 404
        ? 'Account server is not connected to this site (static hosting has no /api).'
        : `Request failed (${res.status})`)
    )
  }
  return json
}

/** Restore the session from a stored token — call once at app startup. */
export async function restoreSession(): Promise<AuthUser | null> {
  token.value = loadStoredToken()
  if (!token.value) return null
  try {
    const json = await api('/me')
    if (json.user) user.value = json.user
    return user.value
  } catch {
    return null
  }
}

/** Sign in with username + password. Throws on bad credentials. */
export async function login(username: string, password: string): Promise<AuthUser> {
  error.value = ''
  isBusy.value = true
  try {
    const json = await api('/login', { username, password })
    user.value = json.user ?? null
    token.value = json.token ?? null
    persistToken(token.value)
    return user.value as AuthUser
  } finally {
    isBusy.value = false
  }
}

/** Create an account + session. Throws on validation / duplicate username. */
export async function registerAccount(username: string, password: string): Promise<AuthUser> {
  error.value = ''
  isBusy.value = true
  try {
    const json = await api('/register', { username, password })
    user.value = json.user ?? null
    token.value = json.token ?? null
    persistToken(token.value)
    return user.value as AuthUser
  } finally {
    isBusy.value = false
  }
}

/** Fetch the account's saved game from the server (null = fresh account). */
export async function fetchRemoteSave(): Promise<unknown | null> {
  const json = await api('/save')
  return json.save ?? null
}

/** Push the serialized game state to the account server. No-op when signed out. */
export async function pushRemoteSave(payload: unknown): Promise<boolean> {
  if (!token.value) return false
  try {
    const json = await api('/save', { save: payload })
    return json.updatedAt !== undefined
  } catch {
    return false
  }
}

/** End the session server-side and clear local state. */
export async function logout(): Promise<void> {
  try {
    await api('/logout', {})
  } catch {
    /* network failure — still clear locally */
  }
  user.value = null
  token.value = null
  persistToken(null)
}

export function useAuth() {
  return {
    user,
    token,
    error,
    isBusy,
    isLoggedIn,
    login,
    registerAccount,
    logout,
    restoreSession,
    fetchRemoteSave,
    pushRemoteSave
  }
}
