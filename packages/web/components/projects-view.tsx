"use client"

import { useState } from "react"
import {
  Plus,
  FileText,
  Zap,
  Hash,
  Clock,
  ArrowRight,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { Project, View } from "@/lib/mock-data"
import { formatNumber, timeAgo } from "@/lib/mock-data"
import { createProject, deleteProject, updateProject } from "@/lib/api"

interface ProjectsViewProps {
  onNavigate: (view: View) => void
  onSelectProject: (projectId: string) => void
  activeProjectId: string | null
  projects: Project[]
  onRefresh: () => void
}

export function ProjectsView({
  onNavigate,
  onSelectProject,
  activeProjectId,
  projects,
  onRefresh,
}: ProjectsViewProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Project | null>(null)
  const [renameName, setRenameName] = useState("")
  const [renaming, setRenaming] = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const project = await createProject(newName.trim(), newDesc.trim())
      setNewName("")
      setNewDesc("")
      setShowCreateForm(false)
      onRefresh()
      onSelectProject(project.id)
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id)
      onRefresh()
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return
    setRenaming(true)
    try {
      await updateProject(renameTarget.id, { name: renameName.trim() })
      setRenameTarget(null)
      setRenameName("")
      onRefresh()
    } catch (err) {
      console.error('Failed to rename project:', err)
    } finally {
      setRenaming(false)
    }
  }

  const openRenameDialog = (project: Project) => {
    setRenameName(project.name)
    setRenameTarget(project)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 md:pb-8 lg:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Group documents and searches by research project.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          size="sm"
          className="h-9 gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden md:inline">New Project</span>
        </Button>
      </div>

      {/* Create form (progressive disclosure) */}
      {showCreateForm && (
        <div className="mb-6 rounded-xl border border-primary/20 bg-card p-4">
          <p className="mb-3 text-sm font-semibold text-foreground">
            Create a new project
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Project name
              </label>
              <input
                autoFocus
                type="text"
                placeholder="e.g., Competitive Analysis Q1"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Description (optional)
              </label>
              <input
                type="text"
                placeholder="Brief summary of project scope"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                size="sm"
                className="h-9"
              >
                {creating ? 'Creating...' : 'Create Project'}
              </Button>
              <Button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewName("")
                  setNewDesc("")
                }}
                variant="ghost"
                size="sm"
                className="h-9"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Project grid */}
      {projects.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isActive={project.id === activeProjectId}
              onSelect={() => onSelectProject(project.id)}
              onDelete={() => handleDelete(project.id)}
              onRename={() => openRenameDialog(project)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && !showCreateForm && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first project to start organizing documents.
          </p>
          <Button
            onClick={() => setShowCreateForm(true)}
            size="sm"
            className="mt-4 h-9 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </Button>
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Project name
            </label>
            <input
              autoFocus
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRenameTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!renameName.trim() || renameName.trim() === renameTarget?.name || renaming}
              onClick={handleRename}
            >
              {renaming ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProjectCard({
  project,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  project: Project
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/30 hover:bg-accent/30",
        isActive
          ? "border-primary/40 ring-1 ring-primary/20"
          : "border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 h-3 w-3 shrink-0 rounded-full",
            project.color
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {project.name}
          </p>
          <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-muted-foreground">
            {project.description || 'No description'}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") e.stopPropagation()
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onRename()
              }}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {project.documentCount} docs
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3" />
          {formatNumber(project.wordCount)} words
        </span>
        <span className="flex items-center gap-1">
          <Hash className="h-3 w-3" />
          {formatNumber(project.tokenCount)} tokens
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeAgo(project.updatedAt)}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          Open
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  )
}
