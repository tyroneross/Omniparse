/**
 * Types, icons, and color maps for the UI.
 * Previously held mock data — now only holds display constants.
 * Actual data comes from the API via lib/api.ts.
 */

import {
  FileSpreadsheet,
  FileText,
  Presentation,
  Globe,
  Code,
} from "lucide-react"

export type View = "dashboard" | "search" | "document" | "upload" | "projects"

// Re-export API types for convenience
export type { Project, Document, SearchResult } from "./api"

export const typeColors: Record<string, string> = {
  xlsx: "bg-success/10 text-success",
  excel: "bg-success/10 text-success",
  pptx: "bg-chart-5/10 text-chart-5",
  pdf: "bg-destructive/10 text-destructive",
  url: "bg-primary/10 text-primary",
  py: "bg-chart-4/10 text-chart-4",
  python: "bg-chart-4/10 text-chart-4",
  csv: "bg-success/10 text-success",
  directory: "bg-muted text-muted-foreground",
}

export const typeIcons: Record<string, typeof FileText> = {
  xlsx: FileSpreadsheet,
  excel: FileSpreadsheet,
  pptx: Presentation,
  pdf: FileText,
  url: Globe,
  py: Code,
  python: Code,
  csv: FileSpreadsheet,
  directory: FileText,
}

export function getTypeIcon(type: string) {
  return typeIcons[type] || FileText
}

export function getTypeColor(type: string) {
  return typeColors[type] || "bg-muted text-muted-foreground"
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

export function timeAgo(isoDate: string): string {
  const now = Date.now()
  const then = new Date(isoDate).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}
