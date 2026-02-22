import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { parse, detectInputType, parseExcelFile } from '@tyroneross/omniparse'
import { getProject, addDocument } from '@/lib/store'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!projectId) {
    return NextResponse.json({ error: 'No projectId provided' }, { status: 400 })
  }

  const project = await getProject(projectId)
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const inputType = detectInputType(file.name)
  if (inputType === 'unsupported') {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.name}` },
      { status: 400 }
    )
  }

  const uploadDir = join(tmpdir(), 'omniparse-uploads')
  await mkdir(uploadDir, { recursive: true })
  const tempPath = join(uploadDir, `${Date.now()}-${file.name}`)

  try {
    const bytes = await file.arrayBuffer()
    await writeFile(tempPath, Buffer.from(bytes))

    // Parse with SDK
    const result = await parse(tempPath) as Record<string, any>

    // For Excel files, also get sheet data with row content
    let sheets: Array<{ name: string; headers: string[]; rows: string[][] }> | undefined
    if (inputType === 'excel') {
      try {
        const excelResult = parseExcelFile(tempPath)
        sheets = excelResult.sheets.map(sheet => ({
          name: sheet.name,
          headers: sheet.headers,
          rows: sheet.rawData.slice(1).map(row => row.map(cell => String(cell ?? ''))),
        }))
      } catch {
        // Fall back to metadata-only sheets
      }
    }

    const doc = await addDocument({
      projectId,
      fileName: file.name,
      fileType: inputType,
      fileSize: file.size,
      parsedAt: new Date().toISOString(),
      parseTime: result.parseTime || 0,
      wordCount: result.wordCount || 0,
      estimatedTokens: result.estimatedTokens || 0,
      markdown: result.markdown || '',
      text: result.text || '',
      sheetCount: result.metadata?.sheetCount,
      totalRows: result.metadata?.totalRows,
      slideCount: result.metadata?.slideCount,
      pageCount: result.metadata?.pageCount,
      functions: result.metadata?.functions?.length,
      classes: result.metadata?.classes?.length,
      sheets,
      rawResult: sanitizeForJson(result),
    })

    return NextResponse.json({ document: doc })
  } catch (err: any) {
    return NextResponse.json(
      { error: `Parse failed: ${err.message}` },
      { status: 500 }
    )
  } finally {
    await unlink(tempPath).catch(() => {})
  }
}

function sanitizeForJson(obj: any): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'markdown' || key === 'text' || key === 'html') continue
    if (typeof value === 'function') continue
    if (typeof value === 'bigint') {
      result[key] = value.toString()
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        result[key] = value.slice(0, 100)
      } else {
        result[key] = sanitizeForJson(value)
      }
    } else {
      result[key] = value
    }
  }
  return result
}
