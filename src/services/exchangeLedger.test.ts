// The ledger exists because a projected line that ALTERNATES renders every
// capture as a subjectless "winning the X". Boards are the real ones the
// defect came from (David's Alapin, 2026-09-16).
import { describe, it, expect } from 'vitest';
import { computeExchangeLedger, describeExchange, exchangeNetForLine } from './exchangeLedger';

// After 15.Nc7+ — Black (the student) to move, forked king and rook.
const PLY29 = 'r3kb1r/ppNNpppp/2n5/8/3P4/8/PP2nPPP/R3K2R b KQkq - 1 15';

describe('exchangeLedger — the net of a forced sequence, from the student\'s seat', () => {
  it('the Alapin fork: you take a knight, they take the rook, and it says so', () => {
    const l = computeExchangeLedger(PLY29, ['Kxd7', 'Nxa8', 'Nexd4'], 'b');
    expect(l).not.toBeNull();
    expect(l?.studentWon).toEqual(['n', 'p']);
    expect(l?.opponentWon).toEqual(['r']);
    expect(l?.isExchange).toBe(true);
    expect(l?.netPawns).toBe(-1); // knight + pawn (4) vs rook (5)
    const text = describeExchange(l);
    expect(text).toBe('you come out behind on material, a knight and a pawn for a rook');
  });

  it('reads from the OPPONENT\'s seat as the mirror image', () => {
    const text = exchangeNetForLine(PLY29, ['Kxd7', 'Nxa8', 'Nexd4'], 'w');
    expect(text).toBe('you come out ahead on material, a rook for a knight and a pawn');
  });

  it('stays SILENT on a one-sided win — the line already said it', () => {
    // Only the student captures: nothing to confuse, no ledger.
    expect(exchangeNetForLine(PLY29, ['Kxd7'], 'b')).toBeNull();
  });

  it('stays SILENT on a plain recapture — the student watched it happen', () => {
    const c = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
    expect(exchangeNetForLine(c, ['Nxe5', 'Nxe4'], 'w')).toBeNull(); // knight for knight
  });

  it('names an even but UNLIKE trade instead of going silent', () => {
    // A bishop for a knight is even in points but not the same piece.
    const l = { studentWon: ['b' as const], opponentWon: ['n' as const], netPawns: 0, isExchange: true, settled: true };
    expect(describeExchange(l)).toBe('that trade is even, a bishop for a knight');
  });

  it('groups repeats in piece names, never a point total', () => {
    const l = { studentWon: ['n' as const, 'n' as const], opponentWon: ['r' as const], netPawns: 1, isExchange: true, settled: true };
    expect(describeExchange(l)).toBe('you come out ahead on material, two knights for a rook');
    expect(describeExchange(l)).not.toMatch(/\d/);
  });

  it('returns null on an illegal line rather than guessing', () => {
    expect(computeExchangeLedger(PLY29, ['Qxh7'], 'b')).toBeNull();
    expect(computeExchangeLedger('not a fen', ['e4'], 'w')).toBeNull();
  });

  it('never counts a king capture', () => {
    const l = computeExchangeLedger(PLY29, ['Kxd7', 'Nxa8'], 'b');
    expect(l?.studentWon).not.toContain('k');
  });
});

describe('attribution — an alternating line never says a subjectless "winning the X"', () => {
  it('stamps each capture with the seat that made it', async () => {
    const { Chess } = await import('chess.js');
    const { narrateDnaLine } = await import('./dnaLineNarrator');
    const sans = ['Kxd7', 'Nxa8', 'Nexd4'];
    const c = new Chess(PLY29);
    const plies = sans.map((san) => { const fenBefore = c.fen(); c.move(san); return { fenBefore, san }; });
    const line = narrateDnaLine(plies, { studentColor: 'b' });
    expect(line).toMatch(/you win the knight/);
    expect(line).toMatch(/they take the rook/);
    expect(line).not.toMatch(/winning the rook/); // the ambiguity that started this
  });
  it('an opponent ply that wins nothing is still marked as theirs (walk 5, R12)', async () => {
    const { Chess } = await import('chess.js');
    const { narrateDnaLine } = await import('./dnaLineNarrator');
    const c = new Chess();
    const plies = ['e4', 'e5', 'Nf3'].map((san) => { const fenBefore = c.fen(); c.move(san); return { fenBefore, san }; });
    const line = narrateDnaLine(plies, { studentColor: 'b' });
    expect(line).toMatch(/^they answer e4/);
    expect(line).toMatch(/they answer Nf3/);
    expect(line).not.toMatch(/they answer e5/);
  });
  it('an unseated caller keeps the old subjectless register (no caller breakage)', async () => {
    const { Chess } = await import('chess.js');
    const { narrateDnaLine } = await import('./dnaLineNarrator');
    const c = new Chess(PLY29);
    const plies = ['Kxd7', 'Nxa8'].map((san) => { const fenBefore = c.fen(); c.move(san); return { fenBefore, san }; });
    expect(narrateDnaLine(plies)).toMatch(/winning the/);
  });
});

describe('one verdict computer — a verdict without its reason is the eval bar read aloud', () => {
  it('the projected line ends on the SAME vocabulary the per-move verdict uses', async () => {
    const { assessPositionalEdge } = await import('./reviewPositionalAssessment');
    // +120 for the student. The private `verdictWord` in augmentWithProjections
    // called this band "you're clearly better"; assessPositionalEdge calls it
    // "a bit better" — so one review could say both about the same number.
    expect(assessPositionalEdge('8/8/4k3/8/8/4K3/4P3/8 w - - 0 40', 'w', 120).verdict).toBe('a bit better');
    expect(assessPositionalEdge('8/8/4k3/8/8/4K3/4P3/8 w - - 0 40', 'w', 200).verdict).toBe('clearly better');
  });
  it('carries a BOARD reason at the end of the Alapin line, not just the word', async () => {
    const { Chess } = await import('chess.js');
    const { assessPositionalEdge } = await import('./reviewPositionalAssessment');
    const c = new Chess(PLY29);
    for (const san of ['Kxd7', 'Nxa8', 'Nexd4', 'Rd1', 'e5']) c.move(san);
    const a = assessPositionalEdge(c.fen(), 'b', 120);
    expect(a.reasons.length).toBeGreaterThan(0);
    expect(a.reasons.join(' ')).toMatch(/outpost on d4|further developed/);
  });
  it('ONE ladder — no second cp-to-word mapping anywhere outside reviewPositionalAssessment', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    // The first cut of this fix deleted `verdictWord` and then rebuilt its
    // vocabulary inline in the replacement; the gate passed because it only
    // looked for the old NAME. It was caught by grepping the deployed prod
    // bundle. Scan for the WORDS now, not the identifier.
    const src = readFileSync(join(process.cwd(), 'src/services/coachFeatureService.ts'), 'utf8');
    expect(src).not.toMatch(/const verdictWord\s*=/);
    // Match a LADDER — a centipawn comparison feeding a quoted verdict phrase —
    // not the bare words, which legitimately appear in comments and in unrelated
    // prose ("exactly right when you're winning").
    expect(src).not.toMatch(/Cp\s*>=?\s*-?\d+\s*\?\s*["'`](you're|it's|the position)/);
    expect(src).toMatch(/verdictBand/);
  });
  it('verdictBand is the single source for the bands, and assessPositionalEdge reads it', async () => {
    const { verdictBand, assessPositionalEdge } = await import('./reviewPositionalAssessment');
    const fen = '8/8/4k3/8/8/4K3/4P3/8 w - - 0 40';
    for (const cp of [400, 150, 120, 50, 0, -60, -200]) {
      expect(assessPositionalEdge(fen, 'w', cp).verdict, `cp ${cp}`).toBe(verdictBand(cp));
    }
    expect(verdictBand(null)).toBeNull();
  });
});

describe('no phrasing model on the review walk (David 2026-09-16: "cut but pass through dna")', () => {
  it('coachFeatureService no longer calls the batched warm pass or its acceptance nets', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'src/services/coachFeatureService.ts'), 'utf8');
    expect(src).not.toMatch(/voiceReviewLines\(/);
    expect(src).not.toMatch(/REVIEW_HOUSE_VOICE_TIMEOUT_MS/);
    // The computed prose goes through the ONE chokepoint, raw.
    expect(src).toMatch(/voiceFacts\([^)]*preferRaw: true/);
    // 🔒 SWEEP, don't spot-fix. The first cut took the service's call and
    // declared the warm pass gone — the REVIEW COMPONENT still had two more
    // (`voiceReviewLines` for the better-line whys and the theory lecture) plus
    // a third model call hiding behind `warm: true`, which forces the phrasing
    // model even under preferRaw. Found by grepping the deployed bundle, not
    // the source. Scan the component too, and scan for `warm: true`, not just
    // the function name.
    const comp = readFileSync(join(process.cwd(), 'src/components/Coach/CoachGameReview.tsx'), 'utf8');
    expect(comp).not.toMatch(/voiceReviewLines/);
    expect(comp).not.toMatch(/warm: true/);
  });
});

describe('THE COMPUTER CUTS, NOT A CODE BRANCH (David 2026-09-16)', () => {
  // This block REPLACES a gate written hours earlier that asserted the opposite
  // — that review must NOT render the full register. That gate matched the first
  // attempt at "cut it", which flipped a branch in code. David corrected the
  // shape: "we don't make a cut on the code side, the computer that ranks the
  // narrations does. At narrations time." The register is back on and
  // `factSelector` decides. A stale gate that pins a superseded contract is
  // itself a defect (CLAUDE.md, audits are living), so it is replaced, not kept
  // alongside.
  it('the register renders, and the SELECTOR is what decides', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    // `isReviewUncapped` moved to the one narration door (2026-09-23) so a
    // narration built off-screen reads the same mode the page does.
    const door = readFileSync(join(process.cwd(), 'src/services/reviewNarrationBuild.ts'), 'utf8');
    const fn = door.slice(door.indexOf('function isReviewUncapped'), door.indexOf('export function reviewMoveInputsFrom'));
    expect(fn).toMatch(/^\s*return true;\s*$/m);              // default ON
    expect(fn).toMatch(/get\('uncapped'\) === '0'/);            // manual compare only
    // The cut lives in the ONE deciding computer, wired into the facet path.
    // Deliberately NOT asserting the argument list: this gate has now gone stale
    // twice in one night by pinning call-site TEXT that a refactor legitimately
    // changed (`selectFacts(...)` → `decide(...)`). Assert the door, and let
    // `coachDecider.test.ts` own "no surface composes the decision by hand".
    const svc = readFileSync(join(process.cwd(), 'src/services/coachFeatureService.ts'), 'utf8');
    expect(svc).toMatch(/\bdecide\(/);
    // Silence must stay explainable — the quiet facts are emitted with a reason.
    expect(svc).toMatch(/decision\.quiet/);
  });

  it('no Settings toggle may turn the inventory back on — a switch is not a decision', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const settings = readFileSync(join(process.cwd(), 'src/components/Settings/SettingsPage.tsx'), 'utf8');
    expect(settings).not.toMatch(/review-full-detail-toggle/);
    expect(settings).not.toMatch(/handleToggle\('reviewFullDetail'/);
  });

  it('keeps the PROJECTION passes uncapped — the register was cut, not the facts (G4.5)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'src/services/coachFeatureService.ts'), 'utf8');
    // Re-coupling the scope to the register flag silently reinstates three
    // `scope === 'full' ? 999 : 2` budgets.
    expect(src).not.toMatch(/uncapped \? 'full' : 'mistakes'/);
    // `work` is the copy the pass writes into (walk 5, R5: a timed-out pass
    // wrote raw tags into the returned segments); the scope is what matters.
    expect(src).toMatch(/augmentWithProjections\((segments|work),[^)]*'full', playerRating[,)]/);
  });
});

describe('uncapped projections are POOLED, never serialized (G4.6)', () => {
  it('every pooled pass reads ONE shared schedule, one engine per lane — never a probe per iteration', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(process.cwd(), 'src/services/coachFeatureService.ts'), 'utf8');
    // Cutting the projection caps (G4.5) made the passes unbounded; unbounded ×
    // serialized-on-the-singleton took the review regenerate from 1.8s to 30.2s
    // (2026-09-16). The answer is parallel, never a reinstated cap. Since
    // 2026-09-23 every pooled probe is scheduled UP FRONT on one lease (the
    // per-pass batches still left the pool idle between passes: 54-75s of
    // projections on a real game, twice over the 75s cap).
    expect(src).toMatch(/const poolTasks: Array</);
    // Each LANE owns ONE engine — the old helper handed engines out by item
    // index, so two lanes could drive the same worker at once.
    expect(src).toMatch(/const engine = engines\[lane\]/);
    // Punish, the two deep-threat passes and prophylaxis read the schedule…
    expect((src.match(/poolLine\(/g) ?? []).length).toBeGreaterThanOrEqual(4);
    // …and the bad-piece ablation is pooled too (39.6s serial on the singleton).
    expect(src).toMatch(/badPieceCandidates\.forEach/);
    // …and none of those passes may go back to awaiting one probe per iteration.
    expect(src).not.toMatch(/const pvBatch = async/);
    expect(src).not.toMatch(/const line = await raceTimeout\(computePvLine\(nullFen/);
    expect(src).not.toMatch(/const threatLine = await raceTimeout\(computePvLine\(nullFen/);
  });
});

describe('the ledger speaks only a SETTLED trade (walk 6, R7)', () => {
  it('stays silent when the line ends with the recapture still pending', async () => {
    const { exchangeNetForLine } = await import('./exchangeLedger');
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    // Black's queen takes White's on f3 and the line stops before Nxf3.
    const pending = ['e4', 'd5', 'exd5', 'Qxd5', 'Qf3', 'Qxf3'];
    expect(exchangeNetForLine(start, pending, 'w')).toBeNull();
    // The same trade completed is settled.
    const { computeExchangeLedger } = await import('./exchangeLedger');
    expect(computeExchangeLedger(start, pending, 'w')?.settled).toBe(false);
    expect(computeExchangeLedger(start, [...pending, 'Nxf3'], 'w')?.settled).toBe(true);
  });
});
