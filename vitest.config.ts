import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  // The build bakes these in (see vite.config.ts). Unit tests need them DEFINED
  // and NON-EMPTY, otherwise the "streaming is opt-in" gate in
  // appAuditor.test.ts passes vacuously: with no baked secret there is nothing
  // for a regression to fall back TO, so a reintroduced auto-enable would sail
  // straight through a green suite.
  define: {
    __BUILD_ID__: JSON.stringify('test-build'),
    __AUDIT_STREAM_URL__: JSON.stringify('https://baked.test/api/audit-stream'),
    __AUDIT_STREAM_SECRET__: JSON.stringify('baked-test-secret'),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Excludes the performance/benchmark suite from the default test
    // run — those tests need a real Stockfish worker and a built
    // bundle, neither of which exists in the unit-test environment.
    // They're meant to run on demand via `npm run test:perf` (or
    // just `vitest run src/test/benchmarks/`). Default `npm test`
    // and `npm run test:run` therefore stay green.
    // `.claude/**` holds agent WORKTREES — full checkouts of this repo living
    // INSIDE it. They are gitignored, but vitest globs the filesystem, not git,
    // so without this every test file runs once per worktree. Three worktrees
    // turned voicedCorpusIntegrity into three extra runs that each shelled out
    // to a builder from the wrong cwd and failed — a red gate with nothing wrong
    // in the code (2026-09-18).
    exclude: ['node_modules/**', 'e2e/**', 'src/test/benchmarks/**', '.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
    },
  },
});
