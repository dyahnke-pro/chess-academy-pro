import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NATIVE_SF, nativeEngine } from './nativeStockfish';

// A read cut off by the time limit is a shallower read. It used to be cached
// under the full depth, so the next run served it as a depth it never reached
// (the sheets were built on a loaded machine).
describe.skipIf(!existsSync(NATIVE_SF))('nativeStockfish caches only reads that reached their depth', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('does not cache a read the time limit cut off', async () => {
    const path = join(mkdtempSync(join(tmpdir(), 'sf-')), 'cache.json');
    const engine = nativeEngine(path, 40, 300);
    await engine.read(START, { multipv: 1 });
    engine.flush();
    const cache = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    expect(Object.keys(cache)).toHaveLength(0);
  });

  it('caches a read that finished at its depth', async () => {
    const path = join(mkdtempSync(join(tmpdir(), 'sf-')), 'cache.json');
    const engine = nativeEngine(path, 4, 60_000);
    await engine.read(START, { multipv: 1 });
    engine.flush();
    const cache = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    expect(Object.keys(cache)).toEqual([`${START}|1|4|`]);
  });
});
