/**
 * @tyroneross/omniparse
 *
 * Universal document parser. Parse Excel, PowerPoint, Python, PDF, and
 * directories into clean, LLM-ready Markdown and structured data.
 *
 * @example
 * ```typescript
 * import { parse, parseMultiple } from '@tyroneross/omniparse';
 *
 * // Parse any supported file — automatically routes to the correct parser
 * const result = await parse('./report.xlsx');
 * console.log(result.markdown);
 *
 * // Parse multiple files in parallel
 * const results = await parseMultiple([
 *   './report.xlsx',
 *   './deck.pptx',
 *   './script.py',
 * ]);
 * ```
 */

// Unified router (primary API)
export { parse, parseMultiple, detectInputType } from './router';
export type { InputType, ParseResult, OmniparseOptions } from './router';

// Direct parser access (for consumers who want specific parsers)
export {
  parseExcelFile,
  parseExcelBuffer,
  parseCSV,
  parsePptxFile,
  parsePptxBuffer,
  parsePythonFile,
  parsePythonSource,
  extractRichContent,
} from './parsers';

// Re-export all types
export type {
  ExcelParseResult,
  ExcelSheet,
  ExcelProperties,
  ExcelParseOptions,
  ExcelChunk,
  ExcelStructureSummary,
  ExcelImage,
  ExcelChart,
  ExcelChartSeries,
  ExcelComment,
  ExcelMergedCell,
  ExcelHyperlink,
  ExcelNamedRange,
  ExcelRichContent,
  PptxParseResult,
  PptxSlide,
  PptxParseOptions,
  PythonParseResult,
  PythonImport,
  PythonFunction,
  PythonClass,
  PythonParameter,
  PythonVariable,
  PythonParseOptions,
} from './parsers';
