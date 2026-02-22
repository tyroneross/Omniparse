import { NextRequest, NextResponse } from 'next/server'
import { getDocument, getProjectDocuments, getAllDocuments, deleteDocument } from '@/lib/store'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const docId = searchParams.get('id')

  if (docId) {
    const doc = await getDocument(docId)
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    return NextResponse.json({ document: doc })
  }

  if (projectId) {
    const documents = await getProjectDocuments(projectId)
    return NextResponse.json({ documents })
  }

  const documents = await getAllDocuments()
  return NextResponse.json({ documents })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Document id is required' }, { status: 400 })
  }

  const deleted = await deleteDocument(id)
  if (!deleted) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
