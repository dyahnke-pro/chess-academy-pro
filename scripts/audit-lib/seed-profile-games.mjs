// Seed a small, REAL-SHAPED game history into the live IndexedDB so the coach's
// PROFILE lanes have something to answer with.
//
// WHY THIS EXISTS. The exhaustive routing audit drives a FRESH prod device, so
// every profile lane (stats, records, accuracy, opening-profile, converting,
// colour, phase-profile, …) honestly answers "import some games first" — and the
// audit counts that as a PASS, because on a cold device it IS the right answer.
// The result is 25 lanes that never exercise the sentence a real user reads.
// CLAUDE.md's fixture rule says this outright: without seeding, "the
// per-scenario assertions become 'test the empty state' instead of 'test
// real-world behavior'". That mattered on 2026-09-16, when the cap sweep
// rewrote exactly those assemblers to speak their full list.
//
// This is deliberately SMALL and synthetic — the real fixture
// (`audit-reports/.fixtures/david-games.json`) is gitignored and usually absent
// in a fresh container, so an audit that only knew how to load it would still
// be testing the empty state most of the time. Prefer the fixture when present;
// fall back to this.
//
// Raw IndexedDB (not Dexie) so it works from the audit page with no app import.

/** Four openings, both colours, wins and losses — enough for every ranked
 *  profile answer to have more than one row to rank. */
const GAMES = [
  { eco: 'B22', opening: 'Sicilian Defense: Alapin Variation', white: true, result: '1-0', acc: 86 },
  { eco: 'B22', opening: 'Sicilian Defense: Alapin Variation', white: true, result: '0-1', acc: 71 },
  { eco: 'B22', opening: 'Sicilian Defense: Alapin Variation', white: true, result: '1-0', acc: 79 },
  { eco: 'C50', opening: 'Italian Game', white: true, result: '1-0', acc: 83 },
  { eco: 'C50', opening: 'Italian Game', white: true, result: '1/2-1/2', acc: 77 },
  { eco: 'B12', opening: 'Caro-Kann Defense', white: false, result: '0-1', acc: 74 },
  { eco: 'B12', opening: 'Caro-Kann Defense', white: false, result: '1-0', acc: 62 },
  { eco: 'B12', opening: 'Caro-Kann Defense', white: false, result: '1-0', acc: 65 },
  { eco: 'C00', opening: 'French Defense', white: false, result: '0-1', acc: 81 },
  { eco: 'C00', opening: 'French Defense', white: false, result: '1-0', acc: 58 },
];

const PGN = '1. e4 c5 2. c3 d5 3. exd5 Qxd5 4. d4 Nf6 5. Nf3 Bg4 6. Be2 e6 7. h3 Bh5 8. O-O Nc6 9. Be3 cxd4 10. cxd4 Rd8';
const SANS = PGN.replace(/\d+\.\s*/g, '').trim().split(/\s+/);

/** Per-move annotations with a believable spread of classifications — the
 *  accuracy, phase-profile and converting lanes all read these, and a game with
 *  none of them reads as unanalyzed. */
function annotations(seed) {
  return SANS.map((san, i) => {
    const bad = (i + seed) % 7 === 0 && i > 5;
    const worse = (i + seed) % 11 === 0 && i > 9;
    return {
      moveNumber: Math.floor(i / 2) + 1,
      color: i % 2 === 0 ? 'white' : 'black',
      san,
      evaluation: 20 - (i % 5) * 8,
      bestMove: null,
      bestMoveEval: worse ? 220 : bad ? 120 : 25,
      classification: worse ? 'blunder' : bad ? 'mistake' : i % 3 === 0 ? 'good' : 'book',
      comment: null,
    };
  });
}

function rows(playerName) {
  const now = Date.now();
  return GAMES.map((g, i) => ({
    id: `audit-profile-game-${i}`,
    pgn: PGN,
    white: g.white ? playerName : 'AuditOpponent',
    black: g.white ? 'AuditOpponent' : playerName,
    result: g.result,
    date: new Date(now - (i + 1) * 36 * 60 * 60 * 1000).toISOString().slice(0, 10),
    event: 'Audit profile seed',
    eco: g.eco,
    whiteElo: 1500,
    blackElo: 1520,
    source: 'lichess',
    annotations: annotations(i),
    coachAnalysis: null,
    isMasterGame: false,
    openingId: null,
    openingName: g.opening,
    fullyAnalyzed: true,
    analysisDepth: 18,
    accuracy: g.acc,
  }));
}

/**
 * @returns {Promise<{ok: boolean, wrote?: number, reason?: string}>}
 */
export async function seedProfileGames(page, playerName = 'AuditStudent') {
  return page.evaluate(async (games) => {
    return await new Promise((resolve) => {
      let settled = false;
      const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
      setTimeout(() => finish({ ok: false, reason: 'open-timeout' }), 15000);
      let req;
      try { req = indexedDB.open('ChessAcademyDB'); } catch { return finish({ ok: false, reason: 'open-threw' }); }
      req.onerror = () => finish({ ok: false, reason: 'open-error' });
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('games')) { db.close(); return finish({ ok: false, reason: 'no-games-store' }); }
        const tx = db.transaction('games', 'readwrite');
        const store = tx.objectStore('games');
        for (const g of games) store.put(g);
        tx.oncomplete = () => { db.close(); finish({ ok: true, wrote: games.length }); };
        tx.onerror = () => { db.close(); finish({ ok: false, reason: 'tx-error' }); };
      };
    });
  }, rows(playerName));
}

export const SEEDED_OPENINGS = [...new Set(GAMES.map((g) => g.opening))];
