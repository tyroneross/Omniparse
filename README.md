# Omniparse

Universal document parser. Parse Excel, PowerPoint, Python, PDF, and directories into clean, LLM-ready Markdown and structured data.

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`@tyroneross/omniparse`](./packages/sdk) | Core SDK / NPM package | Active |
| [`@tyroneross/omniparse-web`](./packages/web) | Local web application for projects, uploads, and search | Active |

## Repo Shape

Keep this repo mentally small:

- `packages/sdk` — required; this is the parser product
- `packages/web` — optional app shell built on top of the SDK
- `packages/sdk/src/parsers` — required parser implementations
- `packages/sdk/tests` — required parser verification
- `packages/web/app`, `packages/web/components`, `packages/web/lib` — required for the web app
- `packages/web/data` — local SQLite storage created on demand for the web app

Generated local folders are not part of the architecture:

- `node_modules/`
- `packages/sdk/dist/`
- `packages/web/.next/`
- `packages/web/data/omniparse.db`
- `packages/web/data/omniparse.db-shm`
- `packages/web/data/omniparse.db-wal`

Legacy note: if an older `packages/web/prisma/omniparse.db` exists, the web app copies it forward to `packages/web/data/omniparse.db` automatically.

If you want the leanest working repo, focus on `packages/sdk` first and treat `packages/web` as a separate consumer of the SDK.

## Development

For the web app, use the workspace script:

```bash
npm run dev
```

The web package runs Next.js in webpack mode with `WATCHPACK_POLLING=true`. In this repo shape, polling avoids the Watchpack `EMFILE` failure that can prevent dev routes from registering even though production builds still pass.

## Quick Start

```bash
npm install @tyroneross/omniparse
```

```typescript
import { parse } from '@tyroneross/omniparse';

// Automatically routes to the correct parser
const result = await parse('./report.xlsx');
console.log(result.markdown);
console.log(result.estimatedTokens);
```

## Supported Formats

| Format | Extensions | Parser |
|--------|-----------|--------|
| Excel | `.xlsx`, `.xls`, `.csv`, `.tsv`, `.ods`, `.xlsb` | SheetJS-based, single-pass |
| PowerPoint | `.pptx` | Single-pass ZIP + regex/SAX |
| Python | `.py` | Static analysis (no runtime needed) |
| PDF | `.pdf` | Text extraction (text-based PDFs) |
| Directories | any | Recursive batch processing |

## CLI

```bash
npx omniparse ./report.xlsx                    # Excel → Markdown
npx omniparse ./deck.pptx -f json              # PPTX → JSON
npx omniparse ./script.py -f text              # Python → Text
npx omniparse ./data/ -r -o output.md          # All files → single MD
```

## API

### Unified Router

```typescript
import { parse, parseMultiple, detectInputType } from '@tyroneross/omniparse';

// Single file
const result = await parse('./report.xlsx');

// Multiple files in parallel
const results = await parseMultiple([
  './report.xlsx',
  './deck.pptx',
  './script.py',
], { concurrency: 4 });

// Detect file type
const type = detectInputType('./report.xlsx'); // 'excel'
```

### Direct Parser Access

```typescript
import { parseExcelFile, parsePptxFile, parsePythonFile } from '@tyroneross/omniparse';

// Excel with full rich content extraction
const excel = parseExcelFile('./report.xlsx', { parseMode: 'full' });

// PowerPoint with speaker notes
const pptx = await parsePptxFile('./deck.pptx', { includeNotes: true });

// Python static analysis
const py = parsePythonFile('./script.py');
```

## License

Apache-2.0 — see [LICENSE](./LICENSE).
