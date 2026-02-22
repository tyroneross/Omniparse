# Omniparse

Universal document parser. Parse Excel, PowerPoint, Python, PDF, and directories into clean, LLM-ready Markdown and structured data.

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`@tyroneross/omniparse`](./packages/sdk) | Core SDK / NPM package | Active |
| [`@tyroneross/omniparse-web`](./packages/web) | Web application | Planned |
| [`@tyroneross/omniparse-mac`](./packages/mac) | Mac desktop application | Planned |

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

MIT
