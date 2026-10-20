import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { staleVitestTmpDirs, sweepVitestTmp, STALE_AFTER_MS } from './vitest-tmp-sweep.mjs';

let root: string;
const OLD = (Date.now() - STALE_AFTER_MS - 60_000) / 1000;

function vitestDir(name: string, old: boolean, extra?: string): string {
  const d = join(root, name);
  mkdirSync(join(d, 'client'), { recursive: true });
  writeFileSync(join(d, 'client', 'abc'), 'x');
  if (extra) writeFileSync(join(d, extra), 'x');
  if (old) { utimesSync(join(d, 'client'), OLD, OLD); utimesSync(d, OLD, OLD); }
  return d;
}

beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'sweep-test-')); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });

describe('stale vitest temp dirs', () => {
  it('finds a dead run\'s folder and leaves a live one, a foreign one and a wrong-shaped one', () => {
    const dead = vitestDir('XFd0-22MBZE--odzezPPm', true);
    vitestDir('qv31TQTAvv2FSaP-tcSI1', false);
    vitestDir('Ud6jv-9SDsNdiTnNLRda1', true, 'notes.txt');
    vitestDir('not-a-nanoid', true);
    expect(staleVitestTmpDirs(root, Date.now())).toEqual([dead]);
  });

  it('removes only what it found', () => {
    const dead = vitestDir('DOjRGfKbIQxeKPRfmWKTZ', true);
    const live = vitestDir('QMf31260v7ieHFu5H0H6m', false);
    expect(sweepVitestTmp(root, Date.now())).toBe(1);
    expect(existsSync(dead)).toBe(false);
    expect(existsSync(live)).toBe(true);
  });

  it('a missing folder sweeps nothing', () => {
    expect(staleVitestTmpDirs(join(root, 'gone'), Date.now())).toEqual([]);
  });
});
