"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Copy,
  Download,
  Clock,
  Zap,
  FileText,
  Hash,
  CheckCircle2,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { View, Project, Document } from "@/lib/mock-data"
import { getTypeIcon, getTypeColor, formatFileSize, timeAgo } from "@/lib/mock-data"
import { fetchDocument } from "@/lib/api"

interface DocumentViewProps {
  documentId: string
  onNavigate: (view: View) => void
  activeProject: Project | null
  onGoToProjects: () => void
}

export function DocumentView({ documentId, onNavigate, activeProject, onGoToProjects }: DocumentViewProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [activeSheet, setActiveSheet] = useState(0)
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!documentId) return
    setLoading(true)
    setError(null)
    fetchDocument(documentId)
      .then(setDoc)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [documentId])

  const handleCopy = (content: string, field: string) => {
    navigator.clipboard.writeText(content)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center px-4 py-20 text-center">
        <FileText className="mb-3 h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">
          {error || 'Document not found'}
        </p>
        <button
          onClick={() => onNavigate("dashboard")}
          className="mt-4 flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to documents
        </button>
      </div>
    )
  }

  const Icon = getTypeIcon(doc.fileType)
  const colorClass = getTypeColor(doc.fileType)
  const jsonContent = JSON.stringify(doc.rawResult, null, 2)

  // Type-specific subtitle
  const subtitleParts: string[] = [formatFileSize(doc.fileSize)]
  if (doc.sheetCount) subtitleParts.push(`${doc.sheetCount} sheets`)
  if (doc.slideCount) subtitleParts.push(`${doc.slideCount} slides`)
  if (doc.pageCount) subtitleParts.push(`${doc.pageCount} pages`)
  if (doc.functions) subtitleParts.push(`${doc.functions} functions`)
  if (doc.classes) subtitleParts.push(`${doc.classes} classes`)

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:pb-8 lg:px-6">
      {/* Header */}
      <div className="mb-6">
        {activeProject && (
          <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
            <button onClick={onGoToProjects} className="hover:text-foreground transition-colors">
              Projects
            </button>
            <span>/</span>
            <button
              onClick={() => onNavigate("dashboard")}
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <span className={cn("h-2 w-2 rounded-full", activeProject.color)} />
              {activeProject.name}
            </button>
            <span>/</span>
            <span className="font-medium text-foreground">Document</span>
          </div>
        )}
        <button
          onClick={() => onNavigate("dashboard")}
          className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to documents
        </button>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", colorClass)}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">
                {doc.fileName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="h-5 rounded px-1.5 text-[10px] font-semibold uppercase">
                  {doc.fileType}
                </Badge>
                {subtitleParts.map((part, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-border mr-2">|</span>}
                    {part}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => handleCopy(doc.markdown || doc.text, "all")}
            >
              {copiedField === "all" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="hidden md:inline">{copiedField === "all" ? "Copied" : "Copy All"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => {
                const baseName = doc.fileName.replace(/\.[^.]+$/, '')
                handleDownload(doc.markdown || doc.text, `${baseName}.md`, 'text/markdown')
              }}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Download</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Metadata cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Words", value: doc.wordCount.toLocaleString(), icon: FileText },
          { label: "Est. Tokens", value: doc.estimatedTokens.toLocaleString(), icon: Hash },
          { label: "Parse Time", value: `${doc.parseTime}ms`, icon: Zap },
          { label: "Parsed", value: timeAgo(doc.parsedAt), icon: Clock },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-2.5 rounded-lg border border-border bg-card p-3"
          >
            <stat.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
              <p className="text-sm font-semibold text-foreground">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Content tabs */}
      <Tabs defaultValue={doc.sheets && doc.sheets.length > 0 ? "tables" : "markdown"} className="w-full">
        <TabsList className="mb-4 w-full justify-start">
          {doc.sheets && doc.sheets.length > 0 && (
            <TabsTrigger value="tables" className="text-sm">Tables</TabsTrigger>
          )}
          <TabsTrigger value="markdown" className="text-sm">Markdown</TabsTrigger>
          <TabsTrigger value="text" className="text-sm">Plain Text</TabsTrigger>
          <TabsTrigger value="json" className="text-sm">JSON</TabsTrigger>
        </TabsList>

        {/* Tables view */}
        {doc.sheets && doc.sheets.length > 0 && (
          <TabsContent value="tables" className="mt-0">
            <div className="mb-4 flex gap-2 overflow-x-auto">
              {doc.sheets.map((sheet, i) => (
                <button
                  key={sheet.name}
                  onClick={() => setActiveSheet(i)}
                  className={cn(
                    "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                    activeSheet === i
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {sheet.name}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {(doc.sheets[activeSheet]?.headers || []).map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(doc.sheets[activeSheet]?.rows || []).map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className={cn(
                            "px-4 py-2.5 text-foreground",
                            j === 0 ? "font-medium" : "font-mono text-xs"
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}

        {/* Markdown view */}
        <TabsContent value="markdown" className="mt-0">
          <div className="relative">
            <div className="absolute right-3 top-3 flex gap-1.5">
              <button
                onClick={() => handleCopy(doc.markdown, "markdown")}
                className="flex h-8 items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {copiedField === "markdown" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={() => handleDownload(doc.markdown, `${doc.fileName.replace(/\.[^.]+$/, '')}.md`, 'text/markdown')}
                className="flex h-8 items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs leading-relaxed text-foreground md:text-sm">
              {doc.markdown || 'No markdown content available'}
            </pre>
          </div>
        </TabsContent>

        {/* Plain text view */}
        <TabsContent value="text" className="mt-0">
          <div className="relative">
            <div className="absolute right-3 top-3 flex gap-1.5">
              <button
                onClick={() => handleCopy(doc.text, "text")}
                className="flex h-8 items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {copiedField === "text" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={() => handleDownload(doc.text, `${doc.fileName.replace(/\.[^.]+$/, '')}.txt`, 'text/plain')}
                className="flex h-8 items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {doc.text || 'No plain text content available'}
            </div>
          </div>
        </TabsContent>

        {/* JSON view */}
        <TabsContent value="json" className="mt-0">
          <div className="relative">
            <div className="absolute right-3 top-3 flex gap-1.5">
              <button
                onClick={() => handleCopy(jsonContent, "json")}
                className="flex h-8 items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {copiedField === "json" ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={() => handleDownload(jsonContent, `${doc.fileName.replace(/\.[^.]+$/, '')}.json`, 'application/json')}
                className="flex h-8 items-center gap-1.5 rounded-md bg-muted px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-xs leading-relaxed text-foreground">
              {jsonContent}
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
