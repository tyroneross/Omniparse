/**
 * Prisma-backed store for projects and parsed documents.
 * Replaces the previous in-memory Map store with SQLite persistence.
 */

import { prisma } from './db'

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
  "bg-primary",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
]

function toStoredProject(p: {
  id: string
  name: string
  description: string
  color: string
  createdAt: Date
  updatedAt: Date
}): StoredProject {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

function toStoredDocument(d: {
  id: string
  projectId: string
  fileName: string
  fileType: string
  fileSize: number
  parsedAt: Date
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
}): StoredDocument {
  return {
    id: d.id,
    projectId: d.projectId,
    fileName: d.fileName,
    fileType: d.fileType,
    fileSize: d.fileSize,
    parsedAt: d.parsedAt.toISOString(),
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
    rawResult: JSON.parse(d.rawResult),
    sheets: d.sheets ? JSON.parse(d.sheets) : undefined,
  }
}

// --- Color assignment ---

let colorIndex: number | null = null

async function nextColor(): Promise<string> {
  if (colorIndex === null) {
    const count = await prisma.project.count()
    colorIndex = count
  }
  const color = PROJECT_COLORS[colorIndex! % PROJECT_COLORS.length]
  colorIndex!++
  return color
}

// --- Projects ---

export async function createProject(name: string, description: string = ''): Promise<StoredProject> {
  const color = await nextColor()
  const project = await prisma.project.create({
    data: { name, description, color },
  })
  return toStoredProject(project)
}

export async function getProject(id: string): Promise<StoredProject | undefined> {
  const project = await prisma.project.findUnique({ where: { id } })
  return project ? toStoredProject(project) : undefined
}

export async function getAllProjects(): Promise<StoredProject[]> {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: 'desc' } })
  return projects.map(toStoredProject)
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    await prisma.project.delete({ where: { id } })
    return true
  } catch {
    return false
  }
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<StoredProject, 'name' | 'description'>>
): Promise<StoredProject | undefined> {
  try {
    const data: Record<string, string> = {}
    if (updates.name) data.name = updates.name
    if (updates.description !== undefined) data.description = updates.description
    const project = await prisma.project.update({ where: { id }, data })
    return toStoredProject(project)
  } catch {
    return undefined
  }
}

// --- Documents ---

export async function addDocument(doc: Omit<StoredDocument, 'id'>): Promise<StoredDocument> {
  const created = await prisma.document.create({
    data: {
      projectId: doc.projectId,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      parsedAt: new Date(doc.parsedAt),
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
    },
  })

  // Touch the project's updatedAt
  await prisma.project.update({
    where: { id: doc.projectId },
    data: { updatedAt: new Date() },
  }).catch(() => {})

  return toStoredDocument(created)
}

export async function getDocument(id: string): Promise<StoredDocument | undefined> {
  const doc = await prisma.document.findUnique({ where: { id } })
  return doc ? toStoredDocument(doc) : undefined
}

export async function getProjectDocuments(projectId: string): Promise<StoredDocument[]> {
  const docs = await prisma.document.findMany({
    where: { projectId },
    orderBy: { parsedAt: 'desc' },
  })
  return docs.map(toStoredDocument)
}

export async function getAllDocuments(): Promise<StoredDocument[]> {
  const docs = await prisma.document.findMany({ orderBy: { parsedAt: 'desc' } })
  return docs.map(toStoredDocument)
}

export async function deleteDocument(id: string): Promise<boolean> {
  try {
    await prisma.document.delete({ where: { id } })
    return true
  } catch {
    return false
  }
}

export async function searchDocuments(
  projectId: string,
  query: string
): Promise<Array<StoredDocument & { matchCount: number; relevance: number; excerpt: string }>> {
  // Fetch matching documents using SQLite LIKE
  const docs = await prisma.document.findMany({
    where: {
      projectId,
      OR: [
        { text: { contains: query } },
        { markdown: { contains: query } },
        { fileName: { contains: query } },
      ],
    },
  })

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
  const docs = await prisma.document.findMany({
    where: { projectId },
    select: {
      wordCount: true,
      estimatedTokens: true,
      fileType: true,
    },
  })

  return {
    documentCount: docs.length,
    wordCount: docs.reduce((a, d) => a + d.wordCount, 0),
    tokenCount: docs.reduce((a, d) => a + d.estimatedTokens, 0),
    sourceTypes: new Set(docs.map(d => d.fileType)).size,
  }
}
