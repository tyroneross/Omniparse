import { NextRequest, NextResponse } from 'next/server'
import { getAllProjects, getProjectStats, createProject, deleteProject, updateProject } from '@/lib/store'

export async function GET() {
  const projects = await getAllProjects()

  // Enrich with stats
  const enriched = await Promise.all(
    projects.map(async (p) => {
      const stats = await getProjectStats(p.id)
      return { ...p, ...stats }
    })
  )

  return NextResponse.json({ projects: enriched })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, description } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
  }

  const project = await createProject(name.trim(), description?.trim() || '')
  return NextResponse.json({ project }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Project id is required' }, { status: 400 })
  }

  const deleted = await deleteProject(id)
  if (!deleted) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, name, description } = body

  if (!id) {
    return NextResponse.json({ error: 'Project id is required' }, { status: 400 })
  }

  const updated = await updateProject(id, { name, description })
  if (!updated) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json({ project: updated })
}
