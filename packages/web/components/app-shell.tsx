"use client"

import { useState } from "react"
import {
  Search,
  FileText,
  LayoutDashboard,
  Upload,
  Settings,
  ChevronDown,
  FolderOpen,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { View, Project } from "@/lib/mock-data"

interface AppShellProps {
  children: React.ReactNode
  currentView: View
  onNavigate: (view: View) => void
  activeProject: Project | null
  projects: Project[]
  onSelectProject: (projectId: string) => void
  onGoToProjects: () => void
}

export function AppShell({
  children,
  currentView,
  onNavigate,
  activeProject,
  projects,
  onSelectProject,
  onGoToProjects,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navItems = [
    { id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard },
    { id: "search" as View, label: "Search", icon: Search },
    { id: "upload" as View, label: "Upload", icon: Upload },
  ]

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileText className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="hidden text-base font-semibold tracking-tight text-foreground sm:inline">
              Omniparse
            </span>
          </button>

          {/* Project switcher */}
          <span className="hidden text-border sm:inline">/</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                {activeProject ? (
                  <>
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        activeProject.color
                      )}
                    />
                    <span className="max-w-[120px] truncate md:max-w-[200px]">
                      {activeProject.name}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Select project</span>
                )}
                <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {projects.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className="flex items-center gap-2"
                >
                  <span
                    className={cn("h-2 w-2 shrink-0 rounded-full", p.color)}
                  />
                  <span className="flex-1 truncate">{p.name}</span>
                  {activeProject?.id === p.id && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
              {projects.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={onGoToProjects}>
                <FolderOpen className="mr-2 h-3.5 w-3.5" />
                All projects
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-1 md:flex"
          role="navigation"
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
                currentView === item.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onGoToProjects}
            className={cn(
              "hidden h-9 items-center gap-1 rounded-md px-3 text-sm transition-colors md:flex",
              currentView === "projects"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <FolderOpen className="h-4 w-4" />
            <span className="font-medium">Projects</span>
          </button>
          <button className="hidden h-9 items-center gap-1 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex">
            <Settings className="h-4 w-4" />
          </button>
          {/* Mobile nav toggle */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground md:hidden"
            aria-label="Toggle navigation"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                mobileNavOpen && "rotate-180"
              )}
            />
          </button>
        </div>
      </header>

      {/* Mobile nav dropdown */}
      {mobileNavOpen && (
        <nav
          className="border-b border-border bg-card px-4 py-2 md:hidden"
          role="navigation"
          aria-label="Mobile navigation"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id)
                setMobileNavOpen(false)
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors",
                currentView === item.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
      )}

      {/* Main content */}
      <main className="flex-1">{children}</main>

      {/* Mobile bottom bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card md:hidden"
        role="navigation"
        aria-label="Bottom navigation"
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-md px-3 py-1 text-xs transition-colors",
              currentView === item.id
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </button>
        ))}
        <button
          onClick={onGoToProjects}
          className={cn(
            "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-md px-3 py-1 text-xs transition-colors",
            currentView === "projects"
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <FolderOpen className="h-5 w-5" />
          <span>Projects</span>
        </button>
      </nav>
    </div>
  )
}
