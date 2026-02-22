import { NextRequest, NextResponse } from 'next/server'
import { searchDocuments } from '@/lib/store'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const query = searchParams.get('q')

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
  }

  if (!query) {
    return NextResponse.json({ results: [] })
  }

  const results = await searchDocuments(projectId, query)
  return NextResponse.json({ results })
}
