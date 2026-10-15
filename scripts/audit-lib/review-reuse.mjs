// REUSE A PREVIOUS GAME TO EXPEDITE THE REVIEW AUDIT (David 2026-10-15:
// "Reuse previous games to expedite audits").
//
// The slow half of a review audit is the FIRST OPEN: a fresh device reads every
// position with the engine before the walk can start. Those reads land in the
// app's own `positionEvals` table, and the review skips the engine for any
// position already there. So a run saves the table at the end, and the next run
// of the SAME game seeds it back before opening the review — the walk starts
// at once, on the same reads (which also makes two runs grade identically).
//
// `AUDIT_GAME=new` rotates a fresh game as before; a pinned game
// (AUDIT_GAME_ID / AUDIT_PGN / AUDIT_GAME=fixture) still wins.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const DIR = 'audit-reports/.cache';
const LAST = `${DIR}/review-last-game.json`;
const keyOf = (movetext) => createHash('sha1').update(String(movetext)).digest('hex').slice(0, 12);
const readsFile = (movetext) => `${DIR}/review-reads-${keyOf(movetext)}.json`;

/** The game the last run used, or null. */
export function lastGame() {
  try { return existsSync(LAST) ? JSON.parse(readFileSync(LAST, 'utf8')) : null; } catch { return null; }
}

export function rememberGame(game) {
  try { mkdirSync(DIR, { recursive: true }); writeFileSync(LAST, JSON.stringify(game)); } catch { /* reuse is a speed-up, never a blocker */ }
}

/** Seed the saved engine reads for this game into the page's positionEvals. */
export async function seedReads(page, movetext) {
  const file = readsFile(movetext);
  if (!existsSync(file)) return { seeded: 0, reason: 'no saved reads for this game' };
  const rows = JSON.parse(readFileSync(file, 'utf8'));
  const seeded = await page.evaluate(async (rs) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    if (!db.objectStoreNames.contains('positionEvals')) return 0;
    await new Promise((res, rej) => { const t = db.transaction('positionEvals', 'readwrite'); const s = t.objectStore('positionEvals'); for (const r of rs) s.put(r); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    return rs.length;
  }, rows).catch(() => 0);
  return { seeded };
}

/** Save the page's engine reads for the next run of this game. */
export async function saveReads(page, movetext) {
  const rows = await page.evaluate(async () => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    if (!db.objectStoreNames.contains('positionEvals')) return [];
    return new Promise((res, rej) => { const t = db.transaction('positionEvals', 'readonly'); const rq = t.objectStore('positionEvals').getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
  }).catch(() => []);
  if (!rows.length) return 0;
  try { mkdirSync(DIR, { recursive: true }); writeFileSync(readsFile(movetext), JSON.stringify(rows)); } catch { return 0; }
  return rows.length;
}
