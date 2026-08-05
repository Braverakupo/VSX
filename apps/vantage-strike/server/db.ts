import Database from 'better-sqlite3'
import path from 'node:path'

const dbPath = path.resolve(process.cwd(), 'vantage-strike.db')
export const db = new Database(dbPath)

// WAL mode keeps readers/writers from blocking and pairs with the
// dev watcher ignore rules for *.db-journal / *.db-wal (Windows locks).
db.pragma('journal_mode = WAL')

// Initialize core schema
db.exec(`
  CREATE TABLE IF NOT EXISTS game_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`)

// Graceful shutdown — better-sqlite3 holds an exclusive lock on Windows;
// release it on termination to prevent EBUSY / SQLITE_BUSY conflicts.
function shutdown(): void {
  if (db.open) db.close()
  process.exit(0)
}
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

// The 'exit' event fires on process termination — close the DB handle there too.
process.once('exit', () => {
  if (db.open) db.close()
})
