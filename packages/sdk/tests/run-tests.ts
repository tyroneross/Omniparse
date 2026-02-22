/**
 * Omniparse SDK Test Runner
 *
 * Basic test suite to verify all parsers work correctly.
 */

import * as path from 'path';
import * as fs from 'fs';

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${message}`);
  } else {
    failed++;
    console.error(`  FAIL: ${message}`);
  }
}

async function testRouter() {
  console.log('\n--- Router Tests ---');
  const { detectInputType } = await import('../src/router');

  // File type detection
  assert(detectInputType('test.xlsx') === 'excel', 'Detects .xlsx as excel');
  assert(detectInputType('test.xls') === 'excel', 'Detects .xls as excel');
  assert(detectInputType('test.csv') === 'excel', 'Detects .csv as excel');
  assert(detectInputType('test.pptx') === 'pptx', 'Detects .pptx as pptx');
  assert(detectInputType('test.py') === 'python', 'Detects .py as python');
  assert(detectInputType('test.pdf') === 'pdf', 'Detects .pdf as pdf');
  assert(detectInputType('test.txt') === 'unsupported', 'Detects .txt as unsupported');
  assert(detectInputType('https://example.com') === 'unsupported', 'URLs are unsupported');
  assert(detectInputType('<html><body>test</body></html>') === 'unsupported', 'HTML strings are unsupported');

  // Directory detection
  assert(detectInputType(FIXTURES_DIR) === 'directory', 'Detects fixtures dir as directory');
}

async function testExcelParser() {
  console.log('\n--- Excel Parser Tests ---');
  const { parseExcelFile } = await import('../src/parsers/excel-parser-fast');

  const xlsxFile = path.join(FIXTURES_DIR, 'sample.xlsx');
  if (!fs.existsSync(xlsxFile)) {
    console.log('  SKIP: sample.xlsx not found in fixtures');
    return;
  }

  const result = parseExcelFile(xlsxFile);
  assert(result.fileName === 'sample.xlsx', 'File name is correct');
  assert(result.sheetCount > 0, `Has ${result.sheetCount} sheet(s)`);
  assert(result.totalRows > 0, `Has ${result.totalRows} row(s)`);
  assert(result.markdown.length > 0, 'Generated markdown');
  assert(result.text.length > 0, 'Generated text');
  assert(result.estimatedTokens > 0, `Estimated ${result.estimatedTokens} tokens`);
  assert(result.parseTime >= 0, `Parsed in ${result.parseTime}ms`);
}

async function testPptxParser() {
  console.log('\n--- PPTX Parser Tests ---');
  const { parsePptxFile } = await import('../src/parsers/pptx-parser-fast');

  const pptxFile = path.join(FIXTURES_DIR, 'sample.pptx');
  if (!fs.existsSync(pptxFile)) {
    console.log('  SKIP: sample.pptx not found in fixtures');
    return;
  }

  const result = await parsePptxFile(pptxFile);
  assert(result.fileName === 'sample.pptx', 'File name is correct');
  assert(result.slideCount > 0, `Has ${result.slideCount} slide(s)`);
  assert(result.markdown.length > 0, 'Generated markdown');
  assert(result.text.length > 0, 'Generated text');
  assert(result.estimatedTokens > 0, `Estimated ${result.estimatedTokens} tokens`);
  assert(result.parseTime >= 0, `Parsed in ${result.parseTime}ms`);
}

async function testPythonParser() {
  console.log('\n--- Python Parser Tests ---');
  const { parsePythonSource } = await import('../src/parsers/python-parser');

  const source = `
"""Module docstring."""

import os
from typing import List, Optional

MAX_SIZE = 100

def greet(name: str, greeting: str = "Hello") -> str:
    """Greet someone."""
    return f"{greeting}, {name}!"

class Person:
    """A person."""

    age: int = 0

    def __init__(self, name: str):
        self.name = name

    async def fetch_data(self) -> dict:
        """Fetch data for this person."""
        pass
`;

  const result = parsePythonSource(source, 'test.py');
  assert(result.fileName === 'test.py', 'File name is correct');
  assert(result.moduleDocstring === 'Module docstring.', 'Module docstring extracted');
  assert(result.imports.length === 2, `Found ${result.imports.length} imports`);
  assert(result.functions.length >= 1, `Found ${result.functions.length} function(s)`);
  assert(result.classes.length === 1, `Found ${result.classes.length} class(es)`);
  assert(result.variables.length >= 1, `Found ${result.variables.length} variable(s)`);
  assert(result.markdown.length > 0, 'Generated markdown');
  assert(result.estimatedTokens > 0, `Estimated ${result.estimatedTokens} tokens`);
}

async function testParseUnified() {
  console.log('\n--- Unified Parse Tests ---');
  const { parse } = await import('../src/router');

  // Test with Python source (always available as inline test)
  const pyFile = path.join(FIXTURES_DIR, 'sample.py');
  if (fs.existsSync(pyFile)) {
    const result = await parse(pyFile) as any;
    assert(result.inputType === 'python', 'Routed to python parser');
    assert(result.markdown.length > 0, 'Generated markdown via router');
  }

  // Test unsupported input
  try {
    await parse('https://example.com');
    assert(false, 'Should throw for URL input');
  } catch (err: any) {
    assert(err.message.includes('Unsupported'), 'Throws unsupported error for URLs');
  }
}

async function main() {
  console.log('Omniparse SDK Tests');
  console.log('===================');

  await testRouter();
  await testExcelParser();
  await testPptxParser();
  await testPythonParser();
  await testParseUnified();

  console.log(`\n===================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
