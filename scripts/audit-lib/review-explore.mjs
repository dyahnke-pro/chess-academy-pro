// Shared driver for the review's FREE BOARD (David 2026-09-05): there is no
// "Explore this position" button any more — moving a piece IS exploring. The
// walk pauses, the `review-exploring-banner` mounts, the explored move is
// narrated in the walk's own format and the engine answers with its best move.
//
// PGN-independent: the position is read off the rendered board (react-chessboard
// stamps every cell with data-square and every piece with data-piece) and the
// side to move off the walk's "Ply n / N" counter, so any seeded or fixture game
// can be driven. Castling / en-passant are deliberately left out of the
// reconstructed FEN — the chosen move never needs them.
import { Chess } from 'chess.js';

export async function readBoardPosition(page) {
  const cells = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-square]')).map((c) => ({
      sq: c.getAttribute('data-square'),
      piece: c.querySelector('[data-piece]')?.getAttribute('data-piece') ?? null,
    }));
  }).catch(() => []);
  if (cells.length < 64) return null;
  const map = new Map();
  for (const c of cells) if (c.piece && /^[wb][PNBRQK]$/.test(c.piece)) map.set(c.sq, c.piece);
  const rows = [];
  for (let r = 8; r >= 1; r--) {
    let row = ''; let empty = 0;
    for (const f of 'abcdefgh') {
      const p = map.get(`${f}${r}`);
      if (!p) { empty += 1; continue; }
      if (empty) { row += String(empty); empty = 0; }
      const letter = p[1];
      row += p[0] === 'w' ? letter : letter.toLowerCase();
    }
    if (empty) row += String(empty);
    rows.push(row);
  }
  return rows.join('/');
}

export async function readWalkPly(page) {
  const t = await page.locator('[data-testid="coach-game-review-walk"]').first().innerText({ timeout: 2000 }).catch(() => '');
  const m = t.match(/Ply\s+(\d+)\s*\/\s*(\d+)/i);
  return m ? { n: Number(m[1]), total: Number(m[2]) } : null;
}

export async function boardSignature(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll('[data-square]'))
    .map((c) => `${c.getAttribute('data-square')}:${c.querySelector('[data-piece]')?.getAttribute('data-piece') ?? '-'}`).join('|')).catch(() => null);
}

/**
 * Play ONE legal move for the side to move by clicking from → to, then wait for
 * the exploring banner and (optionally) the engine's reply.
 * Returns { ok, san, banner, reply, reason }.
 */
export async function exploreOnFreeBoard(page, { replyWaitMs = 25000 } = {}) {
  if ((await page.locator('[data-testid="walk-explore-toggle-btn"]').count()) > 0) {
    return { ok: false, reason: 'the removed Explore button is still rendered' };
  }
  const ply = await readWalkPly(page);
  const placement = await readBoardPosition(page);
  if (!ply || !placement) return { ok: false, reason: `could not read board/ply (ply=${JSON.stringify(ply)})` };
  const stm = ply.n % 2 === 0 ? 'w' : 'b';
  let chess;
  try { chess = new Chess(`${placement} ${stm} - - 0 1`); } catch (e) { return { ok: false, reason: `board not a legal position: ${String(e).slice(0, 60)}` }; }
  // Prefer a quiet minor-piece / pawn move that lands on an empty square so the
  // click target is unambiguous; never a king move (keeps the FEN reconstruction
  // honest without castling rights).
  const moves = chess.moves({ verbose: true }).filter((m) => m.piece !== 'k' && !m.captured && !m.promotion);
  const pick = moves.find((m) => m.piece === 'n' || m.piece === 'b') ?? moves.find((m) => m.piece === 'p') ?? moves[0];
  if (!pick) return { ok: false, reason: 'no quiet legal move found for the side to move' };
  const before = await boardSignature(page);
  await page.locator(`[data-square="${pick.from}"]`).first().click({ force: true }).catch(() => undefined);
  await page.waitForTimeout(200);
  await page.locator(`[data-square="${pick.to}"]`).first().click({ force: true }).catch(() => undefined);
  let banner = false;
  for (let i = 0; i < 20 && !banner; i++) {
    banner = (await page.locator('[data-testid="review-exploring-banner"]').count()) > 0;
    if (!banner) await page.waitForTimeout(250);
  }
  const afterStudent = await boardSignature(page);
  const moved = afterStudent !== before;
  let reply = false;
  if (moved && replyWaitMs > 0) {
    const t0 = Date.now();
    while (Date.now() - t0 < replyWaitMs) {
      const sig = await boardSignature(page);
      if (sig && sig !== afterStudent) { reply = true; break; }
      await page.waitForTimeout(500);
    }
  }
  let blockers = [];
  if (!moved) {
    blockers = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid^="review-"],[data-testid^="discussion-"]'))
      .filter((e) => e.offsetParent !== null && !/^review-(narration-banner|nav-controls|back-btn|forward-btn|play-pause-btn|next-key-btn|paused-label|classification-badge|scroll-middle|story-watch-btn)$/.test(e.getAttribute('data-testid') ?? ''))
      .map((e) => e.getAttribute('data-testid'))).catch(() => []);
  }
  return { ok: moved && banner, san: pick.san, banner, moved, reply, ply: ply.n, blockers, reason: moved ? (banner ? '' : 'moved but no exploring banner') : `board did not change after click-move ${pick.san} (${pick.from}→${pick.to}); visible overlays=[${blockers.join(',')}]` };
}
