import Database from 'better-sqlite3'

/**
 * The Nixta database used to cache data on
 * packages and environments.
 */

const db: any = new Database('nixta.sqlite3')

db.exec(`
  CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type,
    name,
    version,
    runtime,
    channel,
    attr,
    fullname,
    priority INT,
    description TEXT,
    meta TEXT
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS packages_text USING fts4(
    id INTEGER,
    type TEXT,
    name TEXT,
    description TEXT
  )
`)

export default db
