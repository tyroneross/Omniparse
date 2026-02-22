"use client"

import { useState, useCallback, useRef } from "react"
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Presentation,
  Code,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  FolderOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { View, Project } from "@/lib/mock-data"
import { getTypeIcon, getTypeColor, formatFileSize } from "@/lib/mock-data"
import { parseFile } from "@/lib/api"

interface UploadViewProps {
  onNavigate: (view: View) => void
  activeProject: Project | null
  onGoToProjects: () => void
  onRefresh: () => void
}

interface QueuedFile {
  id: string
  file: File
  name: string
  type: string
  size: number
  status: "pending" | "uploading" | "parsing" | "done" | "error"
  progress: number
  error?: string
  docId?: string
}

function getFileExtension(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return ext
}

export function UploadView({ onNavigate, activeProject, onGoToProjects, onRefresh }: UploadViewProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<QueuedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: QueuedFile[] = Array.from(fileList).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      name: file.name,
      type: getFileExtension(file.name),
      size: file.size,
      status: "pending" as const,
      progress: 0,
    }))
    setFiles(prev => [...newFiles, ...prev])

    // Auto-start parsing
    for (const qf of newFiles) {
      startParsing(qf)
    }
  }, [activeProject])

  const startParsing = async (qf: QueuedFile) => {
    if (!activeProject) return

    setFiles(prev => prev.map(f =>
      f.id === qf.id ? { ...f, status: "uploading" } : f
    ))

    try {
      const doc = await parseFile(qf.file, activeProject.id, (progress) => {
        setFiles(prev => prev.map(f =>
          f.id === qf.id ? { ...f, progress, status: progress < 100 ? "uploading" : "parsing" } : f
        ))
      })

      setFiles(prev => prev.map(f =>
        f.id === qf.id ? { ...f, status: "done", progress: 100, docId: doc.id } : f
      ))
      onRefresh()
    } catch (err: any) {
      setFiles(prev => prev.map(f =>
        f.id === qf.id ? { ...f, status: "error", error: err.message } : f
      ))
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }, [addFiles])

  const handleBrowse = () => {
    fileInputRef.current?.click()
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      e.target.value = '' // reset so same file can be re-selected
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  if (!activeProject) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-20 text-center md:py-32">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">
          Select a project first
        </h2>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Uploads are added to a specific project. Pick one first.
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

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:pb-8 lg:px-6">
      {/* Project breadcrumb */}
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
        <span className="font-medium text-foreground">Upload</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => onNavigate("dashboard")}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Upload Documents</h1>
          <p className="text-sm text-muted-foreground">
            Adding to <span className="font-medium text-foreground">{activeProject.name}</span>
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv,.pptx,.pdf,.py"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "mb-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors md:p-12",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/30"
        )}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Upload className={cn("h-6 w-6 text-primary transition-transform", isDragging && "scale-110")} />
        </div>
        <p className="text-sm font-medium text-foreground">
          Drag files here or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          .xlsx, .pptx, .pdf, .csv, .py files supported
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={handleBrowse}>
          Browse Files
        </Button>
      </div>

      {/* File queue */}
      {files.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Queue ({files.length})
          </h2>
          <div className="flex flex-col gap-2">
            {files.map((file) => {
              const Icon = getTypeIcon(file.type)
              const colorClass = getTypeColor(file.type)

              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5"
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", colorClass)}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="h-5 rounded px-1.5 text-[10px] font-semibold uppercase">
                        {file.type}
                      </Badge>
                      <span>{formatFileSize(file.size)}</span>
                      {file.error && (
                        <span className="text-destructive">{file.error}</span>
                      )}
                    </div>
                    {(file.status === "uploading" || file.status === "parsing") && (
                      <Progress value={file.status === "parsing" ? 95 : file.progress} className="mt-2 h-1.5" />
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {file.status === "done" && (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                    {file.status === "uploading" && (
                      <span className="text-xs font-medium text-primary">{file.progress}%</span>
                    )}
                    {file.status === "parsing" && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {file.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    <button
                      onClick={() => removeFile(file.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
