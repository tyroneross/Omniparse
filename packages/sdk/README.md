# @tyroneross/omniparse

Universal document parser SDK for Excel, PowerPoint, Python, PDF, and
directories. It returns Markdown plus structured metadata for downstream
LLM and automation workflows.

## Install

```bash
npm install @tyroneross/omniparse
```

## Basic Use

```ts
import { parse, parseMultiple } from '@tyroneross/omniparse';

const result = await parse('./report.xlsx');
console.log(result.markdown);

const many = await parseMultiple(['./report.xlsx', './deck.pptx', './script.py']);
```

## Package Scope

This npm package publishes the SDK from `packages/sdk`. The repository also
contains an optional local web application that consumes the SDK.

Repository: https://github.com/tyroneross/Omniparse
