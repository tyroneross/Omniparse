"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search,
  FileText,
  X,
  SlidersHorizontal,
  ArrowLeft,
  FolderOpen,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { View, Project, SearchResult } from "@/lib/mock-data"
import { getTypeColor, getTypeIcon } from "@/lib/mock-data"
import { searchDocuments } from "@/lib/api"

interface SearchViewProps {
  onNavigate: (view: View) => void
  onSelectDocument: (id: string) => void
  activeProject: Project | null
  onGoToProjects: () => void
}

const fileTypeFilters = [
  { id: "all", label: "All" },
  { id: "excel", label: "Excel" },
  { id: "pptx", label: "PPT" },
  { id: "pdf", label: "PDF" },
  { id: "python", label: "Code" },
]

export function SearchView({
  onNavigate,
  onSelectDocument,
  activeProject,
  onGoToProjects,
}: SearchViewProps) {
  const [query, setQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Debounced search
  useEffect(() => {
    if (!activeProject || !query.trim()) {
      setResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchDocuments(activeProject.id, query.trim())
        setResults(res)
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, activeProject?.id])

  if (!activeProject) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-20 text-center md:py-32">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Select a project to search
        </h2>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Search is scoped to a single project. Pick one first.
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

  const filteredResults = activeFilter === "all"
    ? results
    : results.filter(r => r.fileType === activeFilter)

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 md:pb-8 lg:px-6">
      {/* Project scope indicator */}
      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <button onClick={onGoToProjects} className="hover:text-foreground transition-colors">
          Projects
        </button>
        <span>/</span>
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <span className={cn("h-2 w-2 rounded-full", activeProject.color)} />
          {activeProject.name}
        </span>
        <span>/</span>
        <span className="font-medium text-foreground">Search</span>
      </div>

      {/* Back + search */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => onNavigate("dashboard")}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            autoFocus
            placeholder={`Search within "${activeProject.name}"...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border transition-colors",
            showFilters
              ? "bg-accent text-accent-foreground"
              : "bg-card text-muted-foreground hover:bg-muted"
          )}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
        {fileTypeFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activeFilter === filter.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Results header */}
      {query && (
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {filteredResults.length}
            </span>{" "}
            results for{" "}
            <span className="font-semibold text-foreground">{`"${query}"`}</span>
          </p>
        </div>
      )}

      {/* Results */}
      {filteredResults.length > 0 && (
        <div className="flex flex-col gap-2">
          {filteredResults.map((result) => {
            const Icon = getTypeIcon(result.fileType)
            const colorClass = getTypeColor(result.fileType)

            return (
              <button
                key={result.id}
                onClick={() => onSelectDocument(result.id)}
                className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:bg-accent/30"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      colorClass
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {result.fileName}
                      </p>
                      <Badge
                        variant="secondary"
                        className="h-5 shrink-0 rounded px-1.5 text-[10px] font-semibold uppercase"
                      >
                        {result.fileType}
                      </Badge>
                    </div>
                    <p
                      className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: result.excerpt }}
                    />
                  </div>
                </div>
                <div className="ml-12 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{result.matchCount} matches</span>
                  <span className="text-border">|</span>
                  <span>{result.wordCount.toLocaleString()} words</span>
                  <span className="text-border">|</span>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-12 rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${result.relevance}%` }}
                      />
                    </div>
                    <span className="font-mono">{result.relevance}%</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {query && !searching && filteredResults.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">
            No results found
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different query or upload more documents.
          </p>
        </div>
      )}

      {/* Initial state */}
      {!query && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="mb-3 h-10 w-10 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground">
            Type to search across all documents in this project
          </p>
        </div>
      )}
    </div>
  )
}
