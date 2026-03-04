import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './schema';

// fake-indexeddb is auto-loaded via vitest setup
// Each test gets a fresh in-memory database

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('Database Schema', () => {
  it('opens without errors', () => {
    expect(db.isOpen()).toBe(true);
  });

  it('has the correct schema version', () => {
    expect(db.verno).toBe(2);
  });

  it('has puzzles table', () => {
    expect(db.tables.map((t) => t.name)).toContain('puzzles');
  });

  it('has openings table', () => {
    expect(db.tables.map((t) => t.name)).toContain('openings');
  });

  it('has games table', () => {
    expect(db.tables.map((t) => t.name)).toContain('games');
  });

  it('has flashcards table', () => {
    expect(db.tables.map((t) => t.name)).toContain('flashcards');
  });

  it('has profiles table', () => {
    expect(db.tables.map((t) => t.name)).toContain('profiles');
  });

  it('has sessions table', () => {
    expect(db.tables.map((t) => t.name)).toContain('sessions');
  });

  it('has meta table', () => {
    expect(db.tables.map((t) => t.name)).toContain('meta');
  });

  it('can write and read from meta table', async () => {
    await db.meta.put({ key: 'test', value: 'hello' });
    const record = await db.meta.get('test');
    expect(record?.value).toBe('hello');
  });
});
