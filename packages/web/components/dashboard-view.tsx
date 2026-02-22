"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  Clock,
  ArrowUpRight,
  Upload,
  Zap,
  FileUp,
  FileText,
  Code,
  Globe,
  FolderOpen,
  ArrowUpDown,
  Trash2,
  Download,
  CheckSquare,
  Square,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { View, Project, Document } from "@/lib/mock-data"
import { getTypeColor, getTypeIcon, formatNumber, formatFileSize, timeAgo } from "@/lib/mock-data"
import { fetchDocuments, deleteDocument } from "@/lib/api"

interface DashboardViewProps {
  onNavigate: (view: View) => void
  onSelectDocument: (id: string) => void
  activeProject: Project | null
  onGoToProjects: () => void
}

export function DashboardView({
  onNavigate,
  onSelectDocument,
  activeProject,
  onGoToProjects,
}: DashboardViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadDocuments = () => {
    if (!activeProject) return
    setLoading(true)
    fetchDocuments(activeProject.id)
      .then(setDocuments)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDocuments()
  }, [activeProject?.id])

  const sortedDocuments = useMemo(() => {
    const sorted = [...documents]
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.fileName.localeCompare(b.fileName))
        break
      case 'size':
        sorted.sort((a, b) => b.fileSize - a.fileSize)
        break
      case 'date':
      default:
        sorted.sort((a, b) => new Date(b.parsedAt).getTime() - new Date(a.parsedAt).getTime())
        break
    }
    return sorted
  }, [documents, sortBy])

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => deleteDocument(id)))
      setSelectedIds(new Set())
      setBulkMode(false)
      loadDocuments()
    } catch (err) {
      console.error('Bulk delete failed:', err)
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkExport = () => {
    const selected = documents.filter(d => selectedIds.has(d.id))
    const combined = selected.map(d =>
      `# ${d.fileName}\n\n${d.markdown || d.text || '(no content)'}`
    ).join('\n\n---\n\n')
    const blob = new Blob([combined], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeProject?.name || 'export'}-selected.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!activeProject) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center px-4 py-20 text-center md:py-32">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Select a project to get started
        </h2>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Documents and searches are grouped by project. Pick or create one first.
        </p>
        <button
          onClick={onGoToProjects}
          className="mt-5 flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <FolderOpen className="h-4 w-4" />
          Browse Projects
        </button>
      </div>
    )
  }

  const totalWords = documents.reduce((a, d) => a + d.wordCount, 0)
  const totalTokens = documents.reduce((a, d) => a + d.estimatedTokens, 0)
  const sourceTypes = new Set(documents.map(d => d.fileType)).size

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-8 lg:px-6">
      {/* Project header */}
      <section className="mb-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <button onClick={onGoToProjects} className="hover:text-foreground transition-colors">Projects</button>
          <span>/</span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className={cn("h-2 w-2 rounded-full", activeProject.color)} />
            {activeProject.name}
          </span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          <span className="text-balance">{activeProject.name}</span>
        </h1>
        {activeProject.description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {activeProject.description}
          </p>
        )}

        {/* Search bar */}
        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder={`Search within "${activeProject.name}"...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => onNavigate("search")}
            className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </section>

      {/* Quick stats */}
      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Documents", value: String(documents.length), icon: FileText },
          { label: "Total Words", value: formatNumber(totalWords), icon: Zap },
          { label: "Est. Tokens", value: formatNumber(totalTokens), icon: Code },
          { label: "Sources", value: String(sourceTypes), icon: Globe },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2">
              <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <span className="text-xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </span>
          </div>
        ))}
      </section>

      {/* Upload zone + Export */}
      <section className="mb-8 flex gap-3">
        <button
          onClick={() => onNavigate("upload")}
          className="group flex flex-1 items-center gap-4 rounded-xl border border-dashed border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/50"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
            <FileUp className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-foreground">
              Add documents
            </p>
            <p className="text-xs text-muted-foreground">
              Drop files or paste a URL
            </p>
          </div>
          <Upload className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
        </button>
        {documents.length > 0 && (
          <button
            onClick={() => {
              const combined = documents.map(d =>
                `# ${d.fileName}\n\n${d.markdown || d.text || '(no content)'}`
              ).join('\n\n---\n\n')
              const blob = new Blob([combined], { type: 'text/markdown' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${activeProject?.name || 'export'}-all.md`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-6 transition-colors hover:border-primary/40 hover:bg-accent/50"
          >
            <Download className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
              Export all
            </span>
          </button>
        )}
      </section>

      {/* Documents in this project */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Documents ({documents.length})
          </h2>
          {documents.length > 0 && (
            <div className="flex items-center gap-1.5">
              {/* Sort control */}
              <div className="flex h-8 items-center rounded-md border border-border text-xs">
                {(['date', 'name', 'size'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSortBy(s)}
                    className={cn(
                      "h-full px-2.5 capitalize transition-colors first:rounded-l-md last:rounded-r-md",
                      sortBy === s
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* Bulk select toggle */}
              <button
                onClick={() => {
                  setBulkMode(!bulkMode)
                  setSelectedIds(new Set())
                }}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors",
                  bulkMode
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Select</span>
              </button>
            </div>
          )}
        </div>

        {/* Bulk action bar */}
        {bulkMode && selectedIds.size > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <button
              onClick={toggleSelectAll}
              className="flex h-7 items-center gap-1.5 rounded px-2 text-xs font-medium text-foreground hover:bg-accent"
            >
              {selectedIds.size === documents.length ? (
                <CheckSquare className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              {selectedIds.size === documents.length ? 'Deselect all' : 'Select all'}
            </button>
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <div className="ml-auto flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={handleBulkExport}
              >
                <Download className="h-3 w-3" />
                Export
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
                onClick={handleBulkDelete}
                disabled={deleting}
              >
                <Trash2 className="h-3 w-3" />
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-muted/30" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
            <FileText className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">
              No documents yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload files to start building this project.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedDocuments.map((doc) => {
              const Icon = getTypeIcon(doc.fileType)
              const colorClass = getTypeColor(doc.fileType)
              const isSelected = selectedIds.has(doc.id)

              return (
                <button
                  key={doc.id}
                  onClick={() => bulkMode ? toggleSelect(doc.id) : onSelectDocument(doc.id)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border bg-card p-3.5 text-left transition-colors md:p-4",
                    isSelected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-accent/30"
                  )}
                >
                  {bulkMode && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      colorClass
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {doc.fileName}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="secondary"
                        className="h-5 rounded px-1.5 text-[10px] font-semibold uppercase"
                      >
                        {doc.fileType}
                      </Badge>
                      <span>{doc.wordCount.toLocaleString()} words</span>
                      <span className="hidden md:inline">
                        {doc.estimatedTokens.toLocaleString()} tokens
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span className="hidden md:inline">{timeAgo(doc.parsedAt)}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
