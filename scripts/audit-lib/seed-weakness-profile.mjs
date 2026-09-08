// Seed a real WEAKNESS PROFILE into the live IndexedDB so an audit can exercise
// the unified-coach personalization functions — every one of which is INERT
// until the student has a weakness profile (a fresh audit game never triggers
// them). Writes MistakePuzzle rows into the `mistakePuzzles` store; the weakness
// spine (aggregateMistakePuzzles) clusters them into open holes that drive the
// custom-lesson picker, positionFacts re-rank, speakDeepestLookahead's honest
// tag, and the review recurrence recap. Raw IndexedDB (not Dexie) so it works
// from the audit page with no app import. Returns {ok, wrote, reason}.
//
// The FORK rows carry a real, solvable position (White: Nd5-c7+ forks the king
// on e8 and the rook on a8) so the audit can DRILL it to completion; the PIN
// rows only need to exist to make "pins" a second pickable hole.

const FORK_FEN = 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1';   // Nc7+ forks Ke8 + Ra8
const PIN_FEN = '4k3/8/8/8/1b6/8/3N4/3K4 w - - 0 1';    // placeholder pin cluster

function mkPuzzle(over) {
  const now = new Date().toISOString();
  return {
    id: `audit-mp-${Math.random().toString(36).slice(2, 10)}`,
    fen: FORK_FEN,
    playerMove: 'e1e2',
    playerMoveSan: 'Ke2',
    bestMove: 'd5c7',
    bestMoveSan: 'Nc7+',
    moves: 'd5c7',
    cpLoss: 320,
    classification: 'blunder',
    gamePhase: 'middlegame',
    moveNumber: 24,
    sourceGameId: 'audit-seed-game',
    sourceMode: 'lichess',
    playerColor: 'white',
    promptText: 'You missed the best move here. Find it.',
    narration: { intro: '', moveNarrations: [], outro: '', conceptHint: '' },
    createdAt: now,
    opponentName: 'AuditOpponent',
    gameDate: now.slice(0, 10),
    openingName: null,
    evalBefore: 120,
    srsInterval: 0,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    srsDueDate: now,
    srsLastReview: null,
    status: 'unsolved',
    attempts: 0,
    successes: 0,
    tacticType: null,
    ...over,
  };
}

/** The rows that make up the seeded profile: 3 open FORK holes (solvable) + 2
 *  open PIN holes. Distinct ids so all count; distinct fens where it matters. */
function seedRows() {
  const rows = [];
  for (let i = 0; i < 3; i += 1) rows.push(mkPuzzle({ tacticType: 'fork', fen: FORK_FEN }));
  for (let i = 0; i < 2; i += 1) rows.push(mkPuzzle({ tacticType: 'pin', fen: PIN_FEN, bestMove: 'd2b3', bestMoveSan: 'Nb3', moves: 'd2b3', cpLoss: 210, classification: 'mistake' }));
  return rows;
}

export async function seedWeaknessProfile(page) {
  const rows = seedRows();
  return page.evaluate(async (rows) => {
    return await new Promise((resolve) => {
      let settled = false;
      const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
      setTimeout(() => finish({ ok: false, reason: 'open-timeout' }), 15000);
      let req;
      try { req = indexedDB.open('ChessAcademyDB'); } catch { return finish({ ok: false, reason: 'open-threw' }); }
      req.onerror = () => finish({ ok: false, reason: 'open-error' });
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('mistakePuzzles')) { db.close(); return finish({ ok: false, reason: 'no-mistakePuzzles-store' }); }
        const tx = db.transaction('mistakePuzzles', 'readwrite');
        const store = tx.objectStore('mistakePuzzles');
        for (const r of rows) store.put(r);
        tx.oncomplete = () => { db.close(); finish({ ok: true, wrote: rows.length }); };
        tx.onerror = () => { db.close(); finish({ ok: false, reason: 'tx-error' }); };
      };
    });
  }, rows);
}

export const SEED_FORK_FEN = FORK_FEN;
