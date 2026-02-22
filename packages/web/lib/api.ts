/**
 * Client-side API functions for interacting with the Omniparse web API.
 */

export interface Project {
  id: string
  name: string
  description: string
  color: string
  createdAt: string
  updatedAt: string
  documentCount: number
  wordCount: number
  tokenCount: number
  sourceTypes: number
}

export interface Document {
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

export interface SearchResult {
  id: string
  projectId: string
  fileName: string
  fileType: string
  wordCount: number
  estimatedTokens: number
  matchCount: number
  relevance: number
  excerpt: string
}

// --- Projects ---

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects')
  const data = await res.json()
  return data.projects
}

export async function createProject(name: string, description: string = ''): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.project
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error)
  }
}

export async function updateProject(id: string, updates: { name?: string; description?: string }): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.project
}

// --- Documents ---

export async function fetchDocuments(projectId?: string): Promise<Document[]> {
  const url = projectId ? `/api/documents?projectId=${projectId}` : '/api/documents'
  const res = await fetch(url)
  const data = await res.json()
  return data.documents
}

export async function fetchDocument(id: string): Promise<Document> {
  const res = await fetch(`/api/documents?id=${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  return data.document
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents?id=${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error)
  }
}

// --- Parse ---

export async function parseFile(
  file: File,
  projectId: string,
  onProgress?: (progress: number) => void
): Promise<Document> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('projectId', projectId)

  // Use XMLHttpRequest for upload progress
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 400) {
          reject(new Error(data.error || 'Parse failed'))
        } else {
          resolve(data.document)
        }
      } catch {
        reject(new Error('Invalid response'))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    xhr.open('POST', '/api/parse')
    xhr.send(formData)
  })
}

// --- Search ---

export async function searchDocuments(projectId: string, query: string): Promise<SearchResult[]> {
  const res = await fetch(`/api/documents/search?projectId=${projectId}&q=${encodeURIComponent(query)}`)
  const data = await res.json()
  return data.results
}
