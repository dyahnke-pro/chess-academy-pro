import { describe, it, expect } from 'vitest';
import { oneAtATime, type KeyedQueue } from './oneAtATime';

const tick = (): Promise<void> => new Promise((r) => { setTimeout(r, 5); });

describe('oneAtATime', () => {
  it('runs work under one key one at a time, in call order', async () => {
    const queue: KeyedQueue = new Map();
    const log: string[] = [];
    const job = (name: string) => async (): Promise<string> => { log.push(`${name} start`); await tick(); log.push(`${name} end`); return name; };
    const results = await Promise.all([oneAtATime(queue, 'g1', job('a')), oneAtATime(queue, 'g1', job('b')), oneAtATime(queue, 'g1', job('c'))]);
    expect(results).toEqual(['a', 'b', 'c']);
    expect(log).toEqual(['a start', 'a end', 'b start', 'b end', 'c start', 'c end']);
  });

  it('work under different keys runs side by side', async () => {
    const queue: KeyedQueue = new Map();
    const log: string[] = [];
    const job = (name: string) => async (): Promise<void> => { log.push(`${name} start`); await tick(); log.push(`${name} end`); };
    await Promise.all([oneAtATime(queue, 'g1', job('a')), oneAtATime(queue, 'g2', job('b'))]);
    expect(log.slice(0, 2)).toEqual(['a start', 'b start']);
  });

  it('a failed run rejects its own caller and never blocks the next', async () => {
    const queue: KeyedQueue = new Map();
    const failed = oneAtATime(queue, 'g1', async () => { throw new Error('boom'); });
    const next = oneAtATime(queue, 'g1', async () => 'ran');
    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ran');
  });

  it('a key whose line has run out leaves the map', async () => {
    const queue: KeyedQueue = new Map();
    await oneAtATime(queue, 'g1', async () => undefined);
    await tick();
    expect(queue.size).toBe(0);
  });
});
