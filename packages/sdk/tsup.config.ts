import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'parsers/index': 'src/parsers/index.ts',
    'bin/omniparse': 'bin/omniparse.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  target: 'node18',
  external: ['xlsx', 'sax'],
  banner: ({ format }) => {
    if (format === 'cjs') {
      return {};
    }
    return {};
  },
});
