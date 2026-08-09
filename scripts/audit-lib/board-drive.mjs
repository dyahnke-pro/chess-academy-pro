// Drive a real game on a coach surface by clicking squares, and keep a
// chess.js mirror of what the board says.
//
// Lifted out of `audit-learn-full-game.mjs` when a second audit needed to play
// a game to the end (David 2026-08-09: "make sure to play a game to the end").
// Two audits reading the board through two copies of this would drift, and the
// copy that drifts is the one whose assertions quietly stop meaning anything.
//
// The reply detection is the part worth keeping in one place. It looks obvious
// and is not: taking a snapshot before the click and waiting for "something
// changed" catches the STUDENT'S OWN move rendering, then hunts for a coach
// reply that has not happened yet, finds nothing, and stops the game one ply
// in while the audit stream plainly shows the coach moved. Wait for your own
// move to land FIRST, then for the next change — that one is theirs.
import { Chess } from 'chess.js';

export const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** What the DOM says is on the board, square → piece code ("wN"). */
export const readPlacement = (page) => page.evaluate(() => {
  const out = {};
  document.querySelectorAll('[data-square]').forEach((sq) => {
    const p = sq.querySelector('[data-piece]');
    const name = sq.getAttribute('data-square');
    if (p && name) out[name] = p.getAttribute('data-piece');
  });
  return out;
}).catch(() => ({}));

export const samePlacement = (a, b) => {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[k] === b[k]);
};

/** The same shape, from a FEN — so the mirror and the DOM are comparable. */
export const placementOf = (fen) => {
  const out = {};
  const rows = fen.split(' ')[0].split('/');
  for (let r = 0; r < 8; r += 1) {
    let file = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) { file += Number(ch); continue; }
      const square = 'abcdefgh'[file] + String(8 - r);
      out[square] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
      file += 1;
    }
  }
  return out;
};

/** Play one move by clicking its two squares. */
export async function clickMove(page, move) {
  await page.locator(`[data-square="${move.from}"]`).first().click({ timeout: 8000, force: true });
  await page.waitForTimeout(200);
  await page.locator(`[data-square="${move.to}"]`).first().click({ timeout: 8000, force: true });
}

/**
 * Wait for the coach's reply and return its SAN, or null if it never came.
 *
 * `chess` must already have the student's move applied. The reply is
 * identified by finding the one legal move whose resulting position matches
 * what is on screen — the board is the source of truth, not a parsed message.
 */
export async function awaitCoachReply(page, chess, { firstMove = false } = {}) {
  const mine = placementOf(chess.fen());
  const settle = Date.now() + 20_000;
  while (Date.now() < settle) {
    if (samePlacement(await readPlacement(page), mine)) break;
    await sleep(1000);
  }
  const replyBy = Date.now() + (firstMove ? 120_000 : 45_000);
  while (Date.now() < replyBy) {
    await sleep(2500);
    if (!samePlacement(await readPlacement(page), mine)) break;
  }
  await sleep(2500); // let this turn's narration events post before slicing

  const placement = await readPlacement(page);
  if (Object.keys(placement).length === 0) return null;
  for (const m of chess.moves({ verbose: true })) {
    const probe = new Chess(chess.fen());
    probe.move(m.san);
    if (samePlacement(placementOf(probe.fen()), placement)) return m.san;
  }
  return null;
}

/** How the game ended, in the words a report should use. */
export function outcomeOf(chess) {
  if (chess.isCheckmate()) return 'checkmate';
  if (chess.isStalemate()) return 'stalemate';
  if (chess.isInsufficientMaterial()) return 'insufficient material';
  if (chess.isThreefoldRepetition()) return 'threefold repetition';
  if (chess.isDraw()) return 'draw';
  return 'unfinished';
}
