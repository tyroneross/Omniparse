#!/usr/bin/env node
/**
 * Omniparse CLI
 *
 * Process local files (Excel, PowerPoint, Python, PDF) into clean
 * Markdown, plain text, or JSON suitable for LLM consumption.
 *
 * Usage:
 *   omniparse <file-or-directory> [options]
 *   omniparse ./data/report.xlsx --format markdown
 *   omniparse ./deck.pptx --format json
 *   omniparse ./script.py --format text
 *   omniparse ./folder/ --recursive
 *
 * Options:
 *   --format, -f     Output format: markdown, text, json (default: markdown)
 *   --output, -o     Output file path (default: stdout)
 *   --recursive, -r  Process all supported files in a directory
 *   --quiet, -q      Suppress progress messages
 *   --sheet          Excel: specific sheet name to extract
 *   --no-notes       PPTX: exclude speaker notes
 *   --help, -h       Show this help message
 *
 * Supported file types:
 *   .xlsx, .xls, .csv, .tsv, .ods  - Spreadsheets
 *   .pptx                           - PowerPoint presentations
 *   .py                             - Python source files
 *   .pdf                            - PDF documents (text-based)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Argument Parsing
// ============================================================================

interface CliArgs {
  input: string;
  format: 'markdown' | 'text' | 'json';
  output?: string;
  recursive: boolean;
  quiet: boolean;
  sheet?: string;
  notes: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const result: CliArgs = {
    input: '',
    format: 'markdown',
    output: undefined,
    recursive: false,
    quiet: false,
    notes: true,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--format':
      case '-f':
        result.format = (args[++i] || 'markdown') as CliArgs['format'];
        break;
      case '--output':
      case '-o':
        result.output = args[++i];
        break;
      case '--recursive':
      case '-r':
        result.recursive = true;
        break;
      case '--quiet':
      case '-q':
        result.quiet = true;
        break;
      case '--sheet':
        result.sheet = args[++i];
        break;
      case '--notes':
        result.notes = args[i + 1] !== 'false';
        if (args[i + 1] === 'false' || args[i + 1] === 'true') i++;
        break;
      case '--no-notes':
        result.notes = false;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
      default:
        if (!arg.startsWith('-') && !result.input) {
          result.input = arg;
        }
        break;
    }
  }

  return result;
}

function showHelp() {
  console.log(`
Omniparse CLI — Universal Document Parser

Usage:
  omniparse <file-or-directory> [options]

Examples:
  omniparse ./report.xlsx                    # Excel → Markdown
  omniparse ./deck.pptx -f json              # PPTX → JSON
  omniparse ./script.py -f text              # Python → Text
  omniparse ./data/ -r -o output.md          # All files → single MD
  omniparse ./report.pdf                     # PDF → Markdown

Options:
  -f, --format <type>   Output format: markdown, text, json (default: markdown)
  -o, --output <path>   Write output to file (default: stdout)
  -r, --recursive       Process all supported files in a directory
  -q, --quiet           Suppress progress messages
  --sheet <name>        Excel: specific sheet name to extract
  --no-notes            PPTX: exclude speaker notes
  -h, --help            Show this help message

Supported file types:
  Spreadsheets:  .xlsx, .xls, .csv, .tsv, .ods, .xlsb
  Presentations: .pptx
  Source code:   .py
  Documents:     .pdf (text-based PDFs)
`);
}

// ============================================================================
// File Type Detection
// ============================================================================

const SUPPORTED_EXTENSIONS = new Set([
  '.xlsx', '.xls', '.csv', '.tsv', '.ods', '.xlsb',
  '.pptx',
  '.py',
  '.pdf',
]);

function getFileType(filePath: string): 'excel' | 'pptx' | 'python' | 'pdf' | 'unknown' {
  const ext = path.extname(filePath).toLowerCase();
  if (['.xlsx', '.xls', '.csv', '.tsv', '.ods', '.xlsb'].includes(ext)) return 'excel';
  if (ext === '.pptx') return 'pptx';
  if (ext === '.py') return 'python';
  if (ext === '.pdf') return 'pdf';

  return 'unknown';
}

function findSupportedFiles(dirPath: string, recursive: boolean): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory() && recursive) {
      files.push(...findSupportedFiles(fullPath, true));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files.sort();
}

// ============================================================================
// Processing Functions
// ============================================================================

interface ProcessResult {
  fileName: string;
  fileType: string;
  markdown: string;
  text: string;
  data: any;
  wordCount: number;
  estimatedTokens: number;
  parseTime: number;
  errors?: string[];
}

async function processExcel(filePath: string, args: CliArgs): Promise<ProcessResult> {
  const { parseExcelFile } = await import('../src/parsers/excel-parser-fast');

  const options: any = {};
  if (args.sheet) {
    options.sheets = [args.sheet];
  }

  const result = parseExcelFile(filePath, options);

  return {
    fileName: result.fileName,
    fileType: `Excel (${result.format})`,
    markdown: result.markdown,
    text: result.text,
    data: {
      sheets: result.sheets.map(s => ({
        name: s.name,
        headers: s.headers,
        rows: s.rows,
        rowCount: s.rowCount,
        columnCount: s.columnCount,
      })),
      properties: result.properties,
    },
    wordCount: result.wordCount,
    estimatedTokens: result.estimatedTokens,
    parseTime: result.parseTime,
    errors: result.errors,
  };
}

async function processPptx(filePath: string, args: CliArgs): Promise<ProcessResult> {
  const { parsePptxFile } = await import('../src/parsers/pptx-parser-fast');

  const result = await parsePptxFile(filePath, {
    includeNotes: args.notes,
  });

  return {
    fileName: result.fileName,
    fileType: 'PowerPoint',
    markdown: result.markdown,
    text: result.text,
    data: {
      slides: result.slides,
      slideCount: result.slideCount,
    },
    wordCount: result.wordCount,
    estimatedTokens: result.estimatedTokens,
    parseTime: result.parseTime,
    errors: result.errors,
  };
}

async function processPython(filePath: string): Promise<ProcessResult> {
  const { parsePythonFile } = await import('../src/parsers/python-parser');

  const result = parsePythonFile(filePath);

  return {
    fileName: result.fileName,
    fileType: 'Python',
    markdown: result.markdown,
    text: result.text,
    data: {
      imports: result.imports,
      functions: result.functions.map(f => ({
        name: f.name,
        parameters: f.parameters,
        returnType: f.returnType,
        docstring: f.docstring,
        isAsync: f.isAsync,
        line: f.line,
      })),
      classes: result.classes.map(c => ({
        name: c.name,
        bases: c.bases,
        docstring: c.docstring,
        methods: c.methods.map(m => m.name),
        line: c.line,
      })),
      variables: result.variables,
      stats: {
        totalLines: result.totalLines,
        linesOfCode: result.linesOfCode,
        blankLines: result.blankLines,
        commentLines: result.commentLines,
      },
    },
    wordCount: result.wordCount,
    estimatedTokens: result.estimatedTokens,
    parseTime: result.parseTime,
    errors: result.errors,
  };
}

async function processPdf(filePath: string): Promise<ProcessResult> {
  const startTime = Date.now();
  const fileName = path.basename(filePath);

  try {
    const buffer = fs.readFileSync(filePath);
    const text = extractTextFromPdfBuffer(buffer);

    if (!text || text.trim().length < 10) {
      return {
        fileName,
        fileType: 'PDF',
        markdown: `# ${fileName}\n\n*Unable to extract text from this PDF. It may be image-based or encrypted.*`,
        text: '',
        data: { pages: 0, error: 'No extractable text found' },
        wordCount: 0,
        estimatedTokens: 0,
        parseTime: Date.now() - startTime,
        errors: ['PDF appears to be image-based or has no extractable text.'],
      };
    }

    const wordCount = text.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
    const markdown = `# ${fileName}\n\n${text}`;

    return {
      fileName,
      fileType: 'PDF',
      markdown,
      text,
      data: { extractedLength: text.length },
      wordCount,
      estimatedTokens: Math.ceil(text.length / 4),
      parseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      fileName,
      fileType: 'PDF',
      markdown: `# ${fileName}\n\n*Error processing PDF: ${error instanceof Error ? error.message : String(error)}*`,
      text: '',
      data: { error: String(error) },
      wordCount: 0,
      estimatedTokens: 0,
      parseTime: Date.now() - startTime,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

function extractTextFromPdfBuffer(buffer: Buffer): string {
  const content = buffer.toString('latin1');
  const textParts: string[] = [];

  const btEtPattern = /BT\s([\s\S]*?)ET/g;
  let btMatch;

  while ((btMatch = btEtPattern.exec(content)) !== null) {
    const textBlock = btMatch[1];

    const tjPattern = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjPattern.exec(textBlock)) !== null) {
      const decoded = decodePdfString(tjMatch[1]);
      if (decoded.trim()) textParts.push(decoded);
    }

    const tjArrayPattern = /\[((?:[^]]*?))\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrayPattern.exec(textBlock)) !== null) {
      const arrayContent = tjArrMatch[1];
      const stringPattern = /\(([^)]*)\)/g;
      let strMatch;
      const parts: string[] = [];
      while ((strMatch = stringPattern.exec(arrayContent)) !== null) {
        parts.push(decodePdfString(strMatch[1]));
      }
      if (parts.length > 0) textParts.push(parts.join(''));
    }
  }

  if (textParts.length === 0) {
    try {
      const zlib = require('zlib');
      const streamPattern = /stream\r?\n([\s\S]*?)endstream/g;
      let streamMatch;

      while ((streamMatch = streamPattern.exec(content)) !== null) {
        try {
          const compressed = Buffer.from(streamMatch[1], 'latin1');
          const decompressed = zlib.inflateSync(compressed).toString('latin1');

          const innerBtEt = /BT\s([\s\S]*?)ET/g;
          let innerMatch;
          while ((innerMatch = innerBtEt.exec(decompressed)) !== null) {
            const block = innerMatch[1];
            const innerTj = /\(([^)]*)\)\s*Tj/g;
            let innerTjMatch;
            while ((innerTjMatch = innerTj.exec(block)) !== null) {
              const decoded = decodePdfString(innerTjMatch[1]);
              if (decoded.trim()) textParts.push(decoded);
            }

            const innerTjArr = /\[((?:[^]]*?))\]\s*TJ/g;
            let innerTjArrMatch;
            while ((innerTjArrMatch = innerTjArr.exec(block)) !== null) {
              const arrContent = innerTjArrMatch[1];
              const innerStrPat = /\(([^)]*)\)/g;
              let innerStrMatch;
              const parts: string[] = [];
              while ((innerStrMatch = innerStrPat.exec(arrContent)) !== null) {
                parts.push(decodePdfString(innerStrMatch[1]));
              }
              if (parts.length > 0) textParts.push(parts.join(''));
            }
          }
        } catch {
          // Skip streams that can't be decompressed
        }
      }
    } catch {
      // zlib not available or decompression failed
    }
  }

  let result = textParts.join(' ');
  result = result.replace(/\s+/g, ' ').trim();
  result = result.replace(/\.\s+([A-Z])/g, '.\n\n$1');

  return result;
}

function decodePdfString(encoded: string): string {
  return encoded
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
}

// ============================================================================
// Output Formatting
// ============================================================================

function formatOutput(results: ProcessResult[], format: CliArgs['format']): string {
  switch (format) {
    case 'markdown':
      return results.map(r => r.markdown).join('\n\n---\n\n');

    case 'text':
      return results.map(r => r.text).join('\n\n');

    case 'json':
      return JSON.stringify(
        results.length === 1 ? results[0] : results,
        null,
        2
      );

    default:
      return results.map(r => r.markdown).join('\n\n---\n\n');
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseArgs(process.argv);

  if (args.help || !args.input) {
    showHelp();
    process.exit(args.help ? 0 : 1);
  }

  const log = args.quiet ? () => {} : (msg: string) => console.error(msg);

  const results: ProcessResult[] = [];
  let filesToProcess: string[] = [];

  // Determine files to process
  const resolvedPath = path.resolve(args.input);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File or directory not found: ${args.input}`);
    process.exit(1);
  }

  const stat = fs.statSync(resolvedPath);
  if (stat.isDirectory()) {
    filesToProcess = findSupportedFiles(resolvedPath, args.recursive);
    if (filesToProcess.length === 0) {
      console.error(`No supported files found in: ${args.input}`);
      process.exit(1);
    }
    log(`Found ${filesToProcess.length} files to process`);
  } else {
    filesToProcess = [resolvedPath];
  }

  // Process each file
  for (const filePath of filesToProcess) {
    const fileType = getFileType(filePath);
    log(`Processing: ${path.basename(filePath)} (${fileType})`);

    try {
      let result: ProcessResult;

      switch (fileType) {
        case 'excel':
          result = await processExcel(filePath, args);
          break;
        case 'pptx':
          result = await processPptx(filePath, args);
          break;
        case 'python':
          result = await processPython(filePath);
          break;
        case 'pdf':
          result = await processPdf(filePath);
          break;
        default:
          log(`  Skipping unsupported file type: ${filePath}`);
          continue;
      }

      log(`  ${result.wordCount} words, ${result.estimatedTokens} tokens, ${result.parseTime}ms`);
      if (result.errors?.length) {
        log(`  Warnings: ${result.errors.join('; ')}`);
      }

      results.push(result);
    } catch (error) {
      log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (results.length === 0) {
    console.error('No files were successfully processed.');
    process.exit(1);
  }

  // Output results
  const output = formatOutput(results, args.format);

  if (args.output) {
    fs.writeFileSync(args.output, output, 'utf-8');
    log(`\nOutput written to: ${args.output}`);
  } else {
    console.log(output);
  }

  // Summary (only if not piping to file and not quiet)
  if (!args.output && !args.quiet) {
    const totalWords = results.reduce((sum, r) => sum + r.wordCount, 0);
    const totalTokens = results.reduce((sum, r) => sum + r.estimatedTokens, 0);
    console.error(`\n--- Summary ---`);
    console.error(`Files processed: ${results.length}`);
    console.error(`Total words: ${totalWords.toLocaleString()}`);
    console.error(`Estimated tokens: ${totalTokens.toLocaleString()}`);
  }
}

main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
