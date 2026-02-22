"use client"

import { useState, useCallback, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { DashboardView } from "@/components/dashboard-view"
import { SearchView } from "@/components/search-view"
import { DocumentView } from "@/components/document-view"
import { UploadView } from "@/components/upload-view"
import { ProjectsView } from "@/components/projects-view"
import type { View, Project } from "@/lib/mock-data"
import { fetchProjects } from "@/lib/api"

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("projects")
  const [selectedDocId, setSelectedDocId] = useState<string>("")
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // Load projects
  useEffect(() => {
    fetchProjects().then(setProjects).catch(console.error)
  }, [refreshKey])

  const activeProject = activeProjectId
    ? projects.find(p => p.id === activeProjectId) ?? null
    : null

  const handleSelectDocument = useCallback((id: string) => {
    setSelectedDocId(id)
    setCurrentView("document")
  }, [])

  const handleSelectProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId)
    setCurrentView("dashboard")
  }, [])

  const handleGoToProjects = useCallback(() => {
    setCurrentView("projects")
  }, [])

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  return (
    <AppShell
      currentView={currentView}
      onNavigate={setCurrentView}
      activeProject={activeProject}
      projects={projects}
      onSelectProject={handleSelectProject}
      onGoToProjects={handleGoToProjects}
    >
      {currentView === "projects" && (
        <ProjectsView
          onNavigate={setCurrentView}
          onSelectProject={handleSelectProject}
          activeProjectId={activeProjectId}
          projects={projects}
          onRefresh={handleRefresh}
        />
      )}
      {currentView === "dashboard" && (
        <DashboardView
          onNavigate={setCurrentView}
          onSelectDocument={handleSelectDocument}
          activeProject={activeProject}
          onGoToProjects={handleGoToProjects}
        />
      )}
      {currentView === "search" && (
        <SearchView
          onNavigate={setCurrentView}
          onSelectDocument={handleSelectDocument}
          activeProject={activeProject}
          onGoToProjects={handleGoToProjects}
        />
      )}
      {currentView === "document" && (
        <DocumentView
          documentId={selectedDocId}
          onNavigate={setCurrentView}
          activeProject={activeProject}
          onGoToProjects={handleGoToProjects}
        />
      )}
      {currentView === "upload" && (
        <UploadView
          onNavigate={setCurrentView}
          activeProject={activeProject}
          onGoToProjects={handleGoToProjects}
          onRefresh={handleRefresh}
        />
      )}
    </AppShell>
  )
}
