import { randomUUID } from 'crypto'
import { getDb } from './db'

export interface StoredProject {
  id: string
  name: string
  description: string
  color: string
  createdAt: string
  updatedAt: string
}

export interface StoredDocument {
  id: string
  projectId: string
  fileName: string
  fileType: string
  fileSize: number
  parsedAt: string
  parseTime: number
  wordCount: number
  estimatedTokens: number
  markdown: string
  text: string
  sheetCount?: number
  totalRows?: number
  slideCount?: number
  pageCount?: number
  functions?: number
  classes?: number
  rawResult: Record<string, unknown>
  sheets?: Array<{
    name: string
    headers: string[]
    rows: string[][]
  }>
}

const PROJECT_COLORS = [
  'bg-primary',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
]

type ProjectRow = {
  id: string
  name: string
  description: string
  color: string
  createdAt: string
  updatedAt: string
}

type DocumentRow = {
  id: string
  projectId: string
  fileName: string
  fileType: string
  fileSize: number
  parsedAt: string
  parseTime: number
  wordCount: number
  estimatedTokens: number
  markdown: string
  text: string
  sheetCount: number | null
  totalRows: number | null
  slideCount: number | null
  pageCount: number | null
  functions: number | null
  classes: number | null
  rawResult: string
  sheets: string | null
}

function createStatements() {
  const db = getDb()
  const countProjectsStatement = db.prepare('SELECT COUNT(*) AS count FROM "Project"')
  const createProjectStatement = db.prepare(`
    INSERT INTO "Project" ("id", "name", "description", "color", "createdAt", "updatedAt")
    VALUES (@id, @name, @description, @color, @createdAt, @updatedAt)
  `)
  const getProjectStatement = db.prepare('SELECT * FROM "Project" WHERE "id" = ?')
  const getAllProjectsStatement = db.prepare('SELECT * FROM "Project" ORDER BY datetime("createdAt") DESC')
  const deleteProjectStatement = db.prepare('DELETE FROM "Project" WHERE "id" = ?')
  const updateProjectStatement = db.prepare(`
    UPDATE "Project"
    SET "name" = @name,
        "description" = @description,
        "updatedAt" = @updatedAt
    WHERE "id" = @id
  `)
  const createDocumentStatement = db.prepare(`
    INSERT INTO "Document" (
      "id",
      "projectId",
      "fileName",
      "fileType",
      "fileSize",
      "parsedAt",
      "parseTime",
      "wordCount",
      "estimatedTokens",
      "markdown",
      "text",
      "sheetCount",
      "totalRows",
      "slideCount",
      "pageCount",
      "functions",
      "classes",
      "rawResult",
      "sheets"
    )
    VALUES (
      @id,
      @projectId,
      @fileName,
      @fileType,
      @fileSize,
      @parsedAt,
      @parseTime,
      @wordCount,
      @estimatedTokens,
      @markdown,
      @text,
      @sheetCount,
      @totalRows,
      @slideCount,
      @pageCount,
      @functions,
      @classes,
      @rawResult,
      @sheets
    )
  `)
  const getDocumentStatement = db.prepare('SELECT * FROM "Document" WHERE "id" = ?')
  const getProjectDocumentsStatement = db.prepare(`
    SELECT * FROM "Document"
    WHERE "projectId" = ?
    ORDER BY datetime("parsedAt") DESC
  `)
  const getAllDocumentsStatement = db.prepare('SELECT * FROM "Document" ORDER BY datetime("parsedAt") DESC')
  const deleteDocumentStatement = db.prepare('DELETE FROM "Document" WHERE "id" = ?')
  const searchDocumentsStatement = db.prepare(`
    SELECT * FROM "Document"
    WHERE "projectId" = @projectId
      AND (
        "text" LIKE @pattern ESCAPE '\\'
        OR "markdown" LIKE @pattern ESCAPE '\\'
        OR "fileName" LIKE @pattern ESCAPE '\\'
      )
  `)
  const getProjectStatsStatement = db.prepare(`
    SELECT
      COUNT(*) AS "documentCount",
      COALESCE(SUM("wordCount"), 0) AS "wordCount",
      COALESCE(SUM("estimatedTokens"), 0) AS "tokenCount",
      COUNT(DISTINCT "fileType") AS "sourceTypes"
    FROM "Document"
    WHERE "projectId" = ?
  `)
  const touchProjectStatement = db.prepare(`
    UPDATE "Project"
    SET "updatedAt" = ?
    WHERE "id" = ?
  `)
  const insertDocumentTransaction = db.transaction((doc: Omit<StoredDocument, 'id'>) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    createDocumentStatement.run({
      id,
      projectId: doc.projectId,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      parsedAt: doc.parsedAt,
      parseTime: doc.parseTime,
      wordCount: doc.wordCount,
      estimatedTokens: doc.estimatedTokens,
      markdown: doc.markdown,
      text: doc.text,
      sheetCount: doc.sheetCount ?? null,
      totalRows: doc.totalRows ?? null,
      slideCount: doc.slideCount ?? null,
      pageCount: doc.pageCount ?? null,
      functions: doc.functions ?? null,
      classes: doc.classes ?? null,
      rawResult: JSON.stringify(doc.rawResult),
      sheets: doc.sheets ? JSON.stringify(doc.sheets) : null,
    })
    touchProjectStatement.run(now, doc.projectId)
    return id
  })

  return {
    countProjectsStatement,
    createProjectStatement,
    getProjectStatement,
    getAllProjectsStatement,
    deleteProjectStatement,
    updateProjectStatement,
    getDocumentStatement,
    getProjectDocumentsStatement,
    getAllDocumentsStatement,
    deleteDocumentStatement,
    searchDocumentsStatement,
    getProjectStatsStatement,
    insertDocumentTransaction,
  }
}

let statements: ReturnType<typeof createStatements> | undefined

function getStatements() {
  if (!statements) {
    statements = createStatements()
  }
  return statements
}

function toIsoString(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
}

function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&')
}

function toStoredProject(p: ProjectRow): StoredProject {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    createdAt: toIsoString(p.createdAt),
    updatedAt: toIsoString(p.updatedAt),
  }
}

function toStoredDocument(d: DocumentRow): StoredDocument {
  return {
    id: d.id,
    projectId: d.projectId,
    fileName: d.fileName,
    fileType: d.fileType,
    fileSize: d.fileSize,
    parsedAt: toIsoString(d.parsedAt),
    parseTime: d.parseTime,
    wordCount: d.wordCount,
    estimatedTokens: d.estimatedTokens,
    markdown: d.markdown,
    text: d.text,
    sheetCount: d.sheetCount ?? undefined,
    totalRows: d.totalRows ?? undefined,
    slideCount: d.slideCount ?? undefined,
    pageCount: d.pageCount ?? undefined,
    functions: d.functions ?? undefined,
    classes: d.classes ?? undefined,
    rawResult: safeParseJson<Record<string, unknown>>(d.rawResult, {}),
    sheets: safeParseJson<StoredDocument['sheets']>(d.sheets, undefined),
  }
}

// --- Color assignment ---

let colorIndex: number | null = null

async function nextColor(): Promise<string> {
  if (colorIndex === null) {
    const { countProjectsStatement } = getStatements()
    const row = countProjectsStatement.get() as { count: number }
    colorIndex = row.count
  }
  const color = PROJECT_COLORS[colorIndex! % PROJECT_COLORS.length]
  colorIndex!++
  return color
}

// --- Projects ---

export async function createProject(name: string, description: string = ''): Promise<StoredProject> {
  const { createProjectStatement } = getStatements()
  const color = await nextColor()
  const now = new Date().toISOString()
  const project: ProjectRow = {
    id: randomUUID(),
    name,
    description,
    color,
    createdAt: now,
    updatedAt: now,
  }

  createProjectStatement.run(project)

  return toStoredProject(project)
}

export async function getProject(id: string): Promise<StoredProject | undefined> {
  const { getProjectStatement } = getStatements()
  const project = getProjectStatement.get(id) as ProjectRow | undefined
  return project ? toStoredProject(project) : undefined
}

export async function getAllProjects(): Promise<StoredProject[]> {
  const { getAllProjectsStatement } = getStatements()
  const projects = getAllProjectsStatement.all() as ProjectRow[]
  return projects.map(toStoredProject)
}

export async function deleteProject(id: string): Promise<boolean> {
  const { deleteProjectStatement } = getStatements()
  const result = deleteProjectStatement.run(id)
  return result.changes > 0
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<StoredProject, 'name' | 'description'>>
): Promise<StoredProject | undefined> {
  const { getProjectStatement, updateProjectStatement } = getStatements()
  const existing = getProjectStatement.get(id) as ProjectRow | undefined
  if (!existing) {
    return undefined
  }

  const nextProject: ProjectRow = {
    ...existing,
    name: updates.name ?? existing.name,
    description: updates.description ?? existing.description,
    updatedAt: new Date().toISOString(),
  }

  updateProjectStatement.run(nextProject)
  return toStoredProject(nextProject)
}

export async function addDocument(doc: Omit<StoredDocument, 'id'>): Promise<StoredDocument> {
  const { getDocumentStatement, insertDocumentTransaction } = getStatements()
  const id = insertDocumentTransaction(doc)
  const created = getDocumentStatement.get(id) as DocumentRow | undefined

  if (!created) {
    throw new Error('Failed to persist parsed document')
  }

  return toStoredDocument(created)
}

export async function getDocument(id: string): Promise<StoredDocument | undefined> {
  const { getDocumentStatement } = getStatements()
  const doc = getDocumentStatement.get(id) as DocumentRow | undefined
  return doc ? toStoredDocument(doc) : undefined
}

export async function getProjectDocuments(projectId: string): Promise<StoredDocument[]> {
  const { getProjectDocumentsStatement } = getStatements()
  const docs = getProjectDocumentsStatement.all(projectId) as DocumentRow[]
  return docs.map(toStoredDocument)
}

export async function getAllDocuments(): Promise<StoredDocument[]> {
  const { getAllDocumentsStatement } = getStatements()
  const docs = getAllDocumentsStatement.all() as DocumentRow[]
  return docs.map(toStoredDocument)
}

export async function deleteDocument(id: string): Promise<boolean> {
  const { deleteDocumentStatement } = getStatements()
  const result = deleteDocumentStatement.run(id)
  return result.changes > 0
}

export async function searchDocuments(
  projectId: string,
  query: string
): Promise<Array<StoredDocument & { matchCount: number; relevance: number; excerpt: string }>> {
  const { searchDocumentsStatement } = getStatements()
  const docs = searchDocumentsStatement.all({
    projectId,
    pattern: `%${escapeLike(query)}%`,
  }) as DocumentRow[]

  const lowerQuery = query.toLowerCase()

  return docs
    .map(raw => {
      const doc = toStoredDocument(raw)
      const text = doc.text || doc.markdown || ''
      const lowerText = text.toLowerCase()

      // Count matches
      let matchCount = 0
      let idx = 0
      while ((idx = lowerText.indexOf(lowerQuery, idx)) !== -1) {
        matchCount++
        idx += lowerQuery.length
      }

      if (matchCount === 0) {
        // Might have matched on fileName only
        if (doc.fileName.toLowerCase().includes(lowerQuery)) {
          matchCount = 1
        } else {
          return null
        }
      }

      // Extract excerpt around first match
      const firstMatch = lowerText.indexOf(lowerQuery)
      let excerpt = ''
      if (firstMatch >= 0) {
        const start = Math.max(0, firstMatch - 60)
        const end = Math.min(text.length, firstMatch + lowerQuery.length + 60)
        excerpt = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '')
        excerpt = excerpt.replace(
          new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
          '<mark>$&</mark>'
        )
      } else {
        excerpt = doc.fileName
      }

      const relevance = Math.min(100, Math.round((matchCount / (text.length / 1000)) * 10))

      return { ...doc, matchCount, relevance, excerpt }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.relevance - a.relevance)
}

export async function getProjectStats(projectId: string) {
  const { getProjectStatsStatement } = getStatements()
  return getProjectStatsStatement.get(projectId) as {
    documentCount: number
    wordCount: number
    tokenCount: number
    sourceTypes: number
  }
}
