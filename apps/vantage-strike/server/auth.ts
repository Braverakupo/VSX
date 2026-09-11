import { createServer } from 'node:http'
import crypto from 'node:crypto'
// NOTE: server/ is run by Node's native TS runner (never bundled by vite),
// so it needs the real '.ts' extension — the extensionless convention only
// applies to the src/ graph (vue-tsc/vite resolution loops).
import { db } from './db.ts'

// ── Auth schema (users + sessions) ────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pass_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`)
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )
`)
db.exec(`
  CREATE TABLE IF NOT EXISTS player_saves (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    payload TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )
`)
// New accounts have NO player_saves row: GET /api/save returns null and the
// client boots a fresh gamestate for the account (no guest-save inheritance).

const SESSION_DAYS = 30
const SCRYPT = { N: 16384, r: 8, p: 1 } as const
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,20}$/

interface UserRow { id: number; username: string; pass_hash: string }

// ── Password hashing (scrypt, per-user salt, constant-time compare) ───────
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 32, SCRYPT)
  return `scrypt:${Buffer.from(salt).toString('hex')}:${Buffer.from(hash).toString('hex')}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [alg, saltHex, hashHex] = stored.split(':')
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false
  try {
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const actual = crypto.scryptSync(password, salt, expected.length, SCRYPT)
    return crypto.timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

interface SessionRow { token: string; user_id: number; expires_at: number }

function createSession(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex')
  const now = Date.now()
  db.prepare(
    `INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`
  ).run(token, userId, now, now + SESSION_DAYS * 86_400_000)
  return token
}

function sessionUser(token: string | null): UserRow | null {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null
  const row = db.prepare(
    `SELECT s.user_id AS id, u.username, u.pass_hash
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`
  ).get(token, Date.now()) as UserRow | null
  if (!row) return null
  // Sliding renewal — extend on active use so long players stay signed in
  db.prepare(`UPDATE sessions SET expires_at = ? WHERE token = ?`)
    .run(Date.now() + SESSION_DAYS * 86_400_000, token)
  return row
}

function getUserByName(username: string): UserRow | null {
  return db.prepare(`SELECT id, username, pass_hash FROM users WHERE username = ? COLLATE NOCASE`)
    .get(username) as UserRow | null
}

// ── Tiny JSON router (no framework deps — Node http only) ─────────────────
const PORT = Number(process.env.PORT || 4187)

function sendJson(res: { statusCode: number; writeHead: (c: number, h: Record<string,string>) => void; end: (b: string) => void }, status: number, payload: unknown) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token'
  }
  res.writeHead(status, headers)
  res.end(status === 204 ? '' : JSON.stringify(payload))
}

async function readBody(req: { on: (e: string, cb: (...args: unknown[]) => void) => void }): Promise<Record<string, unknown>> {
  const chunks: string[] = []
  await new Promise<void>((resolve) => {
    req.on('data', (c: unknown) => chunks.push(String(c)))
    req.on('end', () => resolve())
  })
  try {
    const parsed = JSON.parse(chunks.join(''))
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const token = typeof req.headers['x-auth-token'] === 'string' ? req.headers['x-auth-token'] : null

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token' })
    res.end()
    return
  }

  // GET /api/me — restore session on page load
  if (req.method === 'GET' && url.pathname === '/api/me') {
    const user = sessionUser(token)
    if (!user) { sendJson(res, 401, { error: 'Not signed in.' }); return }
    sendJson(res, 200, { user: { id: user.id, username: user.username } })
    return
  }

  // POST /api/register — create account + session
  if (req.method === 'POST' && url.pathname === '/api/register') {
    const body = await readBody(req)
    const username = String(body.username ?? '').trim()
    const password = String(body.password ?? '')
    if (!USERNAME_RE.test(username)) {
      sendJson(res, 400, { error: 'Username must be 3-20 characters (letters, numbers, . _ -).' }); return
    }
    if (password.length < 6) {
      sendJson(res, 400, { error: 'Password must be at least 6 characters.' }); return
    }
    if (getUserByName(username)) {
      sendJson(res, 409, { error: 'That username is already taken.' }); return
    }
    const info = db.prepare(
      `INSERT INTO users (username, pass_hash, created_at) VALUES (?, ?, ?)`
    ).run(username, hashPassword(password), Date.now())
    const authToken = createSession(Number(info.lastInsertRowid))
    sendJson(res, 201, { user: { id: Number(info.lastInsertRowid), username }, token: authToken })
    return
  }

  // POST /api/login — verify credentials + start session
  if (req.method === 'POST' && url.pathname === '/api/login') {
    const body = await readBody(req)
    const username = String(body.username ?? '').trim()
    const password = String(body.password ?? '')
    const row = getUserByName(username)
    if (!row || !verifyPassword(password, row.pass_hash)) {
      sendJson(res, 401, { error: 'Incorrect username or password.' }); return
    }
    const authToken = createSession(row.id)
    sendJson(res, 200, { user: { id: row.id, username: row.username }, token: authToken })
    return
  }

  // POST /api/logout — kill session server-side
  if (req.method === 'POST' && url.pathname === '/api/logout') {
    if (token) db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token)
    sendJson(res, 204, null)
    return
  }

  const authedUser = sessionUser(token)

  // GET /api/save — fetch the account's stored save (null = fresh account)
  if (req.method === 'GET' && url.pathname === '/api/save') {
    if (!authedUser) { sendJson(res, 401, { error: 'Not signed in.' }); return }
    const row = db.prepare(`SELECT payload, updated_at AS updatedAt FROM player_saves WHERE user_id = ?`).get(authedUser.id) as { payload: string; updatedAt: number } | null
    sendJson(res, 200, row ? { save: JSON.parse(row.payload), updatedAt: row.updatedAt } : { save: null })
    return
  }

  // POST /api/save — upsert the account's save (autosave + manual Save button)
  if (req.method === 'POST' && url.pathname === '/api/save') {
    if (!authedUser) { sendJson(res, 401, { error: 'Not signed in.' }); return }
    if (Number(req.headers['content-length'] ?? 0) > 1_000_000) {
      sendJson(res, 413, { error: 'Save payload too large.' }); return
    }
    const body = await readBody(req)
    if (body.save === undefined) { sendJson(res, 400, { error: 'Missing save payload.' }); return }
    const now = Date.now()
    db.prepare(`
      INSERT INTO player_saves (user_id, payload, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
    `).run(authedUser.id, JSON.stringify(body.save), now)
    sendJson(res, 200, { updatedAt: now })
    return
  }

  sendJson(res, 404, { error: 'Not found.' })
})

process.once("SIGTERM", ()=>{if(db.open)db.close();process.exit(0)});
process.once("SIGINT", ()=>{if(db.open)db.close();process.exit(0)});
server.listen(PORT, () => {
  console.log(`[auth] listening on http://127.0.0.1:${PORT} (db: vantage-strike.db)`)
})
