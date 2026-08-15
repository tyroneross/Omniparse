#!/usr/bin/env node
/**
 * Omniparse CLI
 *
 * Process local files (Excel, PowerPoint, Python, PDF) into clean
 * Markdown, plain text, or JSON suitable for LLM consumption.
 *
 * Thin wrapper over the SDK router: input detection and parsing live in
 * `src/router.ts` (`detectInputType` / `parse`) so the CLI and the library
 * share one detection table and one result shape (`ParseResult`).
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
 *   .xlsx, .xls, .csv, .tsv, .ods, .xlsb - Spreadsheets
 *   .pptx                                - PowerPoint presentations
 *   .py                                  - Python source files
 *   .pdf                                 - PDF documents (text-based)
 */

import * as fs from 'fs';
import * as path from 'path';
import { detectInputType, parse } from '../src/router';
import type { OmniparseOptions, ParseResult } from '../src/router';

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
// Output Formatting
// ============================================================================

function formatOutput(results: ParseResult[], format: CliArgs['format']): string {
  switch (format) {
    case 'text':
      return results.map(r => r.text).join('\n\n');

    case 'json':
      return JSON.stringify(
        results.length === 1 ? results[0] : results,
        null,
        2
      );

    case 'markdown':
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

  const resolvedPath = path.resolve(args.input);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: File or directory not found: ${args.input}`);
    process.exit(1);
  }

  const inputType = detectInputType(resolvedPath);
  if (inputType === 'unsupported') {
    console.error(`Error: Unsupported file type: ${args.input}`);
    console.error('Supported: .xlsx, .xls, .csv, .tsv, .ods, .xlsb, .pptx, .py, .pdf, or directories.');
    process.exit(1);
  }

  const options: OmniparseOptions = {
    sheets: args.sheet ? [args.sheet] : undefined,
    includeNotes: args.notes,
    recursive: args.recursive,
    // Sheet rows are only materialized in metadata for JSON output.
    includeSheetRows: args.format === 'json',
    quiet: args.quiet,
    onProgress: inputType === 'directory'
      ? (completed, total) => log(`  [${completed}/${total}] parsed`)
      : undefined,
  };

  log(`Processing: ${path.basename(resolvedPath)} (${inputType})`);

  let parsed: ParseResult | ParseResult[];
  try {
    parsed = await parse(resolvedPath, options);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const results = Array.isArray(parsed) ? parsed : [parsed];

  for (const result of results) {
    log(`  ${result.fileName} (${result.inputType}): ${result.wordCount} words, ${result.estimatedTokens} tokens, ${result.parseTime}ms`);
    if (result.errors?.length) {
      log(`    Warnings: ${result.errors.join('; ')}`);
    }
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
