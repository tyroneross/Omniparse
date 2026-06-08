import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const projectRoot = /* turbopackIgnore: true */ process.cwd()
const dataDbPath = path.join(/* turbopackIgnore: true */ projectRoot, 'data', 'omniparse.db')
const legacyDbPath = path.join(/* turbopackIgnore: true */ projectRoot, 'prisma', 'omniparse.db')

const globalForDb = globalThis as unknown as { db: Database.Database | undefined }

function resolveDbPath() {
  const override = process.env.OMNIPARSE_DB_PATH
  if (override) {
    const resolved = path.isAbsolute(override)
      ? override
      : path.join(/* turbopackIgnore: true */ projectRoot, override)
    fs.mkdirSync(path.dirname(resolved), { recursive: true })
    return resolved
  }

  fs.mkdirSync(path.dirname(dataDbPath), { recursive: true })

  if (!fs.existsSync(dataDbPath) && fs.existsSync(legacyDbPath)) {
    fs.copyFileSync(legacyDbPath, dataDbPath)
  }

  return dataDbPath
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "Project" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "color" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "Document" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      "fileType" TEXT NOT NULL,
      "fileSize" INTEGER NOT NULL,
      "parsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "parseTime" REAL NOT NULL DEFAULT 0,
      "wordCount" INTEGER NOT NULL DEFAULT 0,
      "estimatedTokens" INTEGER NOT NULL DEFAULT 0,
      "markdown" TEXT NOT NULL DEFAULT '',
      "text" TEXT NOT NULL DEFAULT '',
      "sheetCount" INTEGER,
      "totalRows" INTEGER,
      "slideCount" INTEGER,
      "pageCount" INTEGER,
      "functions" INTEGER,
      "classes" INTEGER,
      "rawResult" TEXT NOT NULL DEFAULT '{}',
      "sheets" TEXT,
      CONSTRAINT "Document_projectId_fkey"
        FOREIGN KEY ("projectId")
        REFERENCES "Project" ("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "idx_project_createdAt" ON "Project" ("createdAt" DESC);
    CREATE INDEX IF NOT EXISTS "idx_document_projectId" ON "Document" ("projectId");
    CREATE INDEX IF NOT EXISTS "idx_document_parsedAt" ON "Document" ("parsedAt" DESC);
  `)
}

function createDatabase() {
  const db = new Database(resolveDbPath())
  db.pragma('busy_timeout = 5000')
  db.pragma('foreign_keys = ON')
  initializeSchema(db)
  return db
}

export function getDb() {
  if (!globalForDb.db) {
    globalForDb.db = createDatabase()
  }
  return globalForDb.db
}
