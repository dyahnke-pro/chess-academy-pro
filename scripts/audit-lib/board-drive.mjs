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

/**
 * Play one move by clicking its two squares, and say whether it LANDED.
 *
 * The click used to be fire-and-forget, which made every later assertion
 * unsafe: if the board declines the move — locked while the coach is thinking,
 * a stray overlay, a click that misses — the mirror advances and the DOM does
 * not, and from that ply on the two describe different games. The next reply
 * can then never be matched, so the run blames the coach for a stall that was
 * the audit's own dropped click. Two prod runs stopped at unrelated plies
 * before this was checked.
 *
 * `expectedFen` is the position AFTER the move.
 */
export async function clickMove(page, move, expectedFen, { timeout = 12_000 } = {}) {
  await page.locator(`[data-square="${move.from}"]`).first().click({ timeout: 8000, force: true });
  await page.waitForTimeout(200);
  await page.locator(`[data-square="${move.to}"]`).first().click({ timeout: 8000, force: true });
  if (!expectedFen) return true;
  const want = placementOf(expectedFen);
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (samePlacement(await readPlacement(page), want)) return true;
    await sleep(500);
  }
  return false;
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

/**
 * Did the APP end the game, whatever the mirror thinks?
 *
 * A finished game does not sit still on a board — it hands off, and on this
 * surface the hand-off is post-game review, whose progress screen ("Analyzing
 * move 2 of 75…") replaces the board entirely. An audit watching only for the
 * position to change therefore reads a completed game as a coach that went
 * quiet, which is exactly backwards: it is the strongest evidence the game ran
 * to the end. Returns what the app is showing, or null if it is still playing.
 */
export async function appEndedGame(page) {
  const body = await page.locator('body').innerText().catch(() => '');
  const analysing = /Analyz(?:ing|e) move (\d+) of (\d+)/i.exec(body);
  if (analysing) return `game over — the app is reviewing it (${analysing[2]} plies)`;
  if (await page.locator('[data-testid="skip-to-review-btn"]').count().catch(() => 0)) {
    return 'game over — the review hand-off is on screen';
  }
  const worded = /\b(checkmate|stalemate|resigns?|draw by [a-z- ]+|game over)\b/i.exec(body);
  return worded ? `game over — ${worded[1].toLowerCase()}` : null;
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
