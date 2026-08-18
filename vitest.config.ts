import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // TIMEOUTS SIZED FOR CONTENTION, NOT FOR THE WORK.
    //
    // The component suites are not slow — measured, a failing test's body was
    // 50ms (render 41ms, query 7ms) while the run reported 8.6s. The gap is
    // Vite transforming a large module graph during the first render, plus
    // parallel contention on four cores, and it lands on whichever test loses
    // the scheduling lottery. Three DIFFERENT Coach tests failed on three
    // consecutive runs, each passing alone: CoachGameReview (hook, 10s),
    // GameChatPanel (test, 5s), CoachTeachPage (test, 5s).
    //
    // Raising these was the fix rather than patching each test, because a
    // per-test timeout only moves the failure to the next marginal test — the
    // scarce resource is CPU, and no assertion here is about speed. What this
    // does NOT do is hide a hang: a genuinely stuck test still fails, ten
    // seconds later than it used to.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Excludes the performance/benchmark suite from the default test
    // run — those tests need a real Stockfish worker and a built
    // bundle, neither of which exists in the unit-test environment.
    // They're meant to run on demand via `npm run test:perf` (or
    // just `vitest run src/test/benchmarks/`). Default `npm test`
    // and `npm run test:run` therefore stay green.
    exclude: ['node_modules/**', 'e2e/**', 'src/test/benchmarks/**'],
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
