/**
 * ONE CLAIM PER FACT, WHOEVER STATES IT (duplicate map 2026-10-20, #3 and #6).
 * #3 — g1 13.Rad1 Ng4 → 14.Rd5 Qb4: the bishop on f4 was said loose three
 * times in two turns, because the tactic line and the threat line carried
 * different keys (or none). #6 — g3 10.Nf3 c5: "count before you take on e5"
 * and "their rook on e8 is tied down … hit twice, guarded twice" are one count
 * said twice. Each fact now has one key builder every producer attaches.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildTacticsLiveContext } from './liveTacticsContext';
import { readBoard } from './boardComputers';
import { conceptInstanceKey, countKey, looseKey, looseStillKey } from './conceptKey';
import { decideTurn, spokenSentenceKeys, type LaneInput } from './learnTurnDoor';
import { NO_PROOF } from './proof';
import { NAMES_NO_MOVE } from './studentMoveNaming';

const G1_14 = 'r1b1kr2/pp2p1bp/2np2p1/q5N1/4PBn1/1QN5/PP3PPP/3RR1K1 w - - 10 14';
const G1_15 = 'r1b1kr2/pp2p1bp/2np2p1/3R2N1/1q2PBn1/1QN5/PP3PPP/4R1K1 w - - 12 15';
const TEACH = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');

describe('#3 — the loose bishop on f4 is one claim across turns', () => {
  it('the f4 bishop is loose on both boards (the fact did not change)', () => {
    for (const fen of [G1_14, G1_15]) {
      expect(buildTacticsLiveContext(fen, null, 'w', 1500).hanging.some((h) => h.square === 'f4' && h.color === 'w')).toBe(true);
    }
  });

  it('said by the tactic line on 14, the plain threat line on 15 is dropped as said (the "still" form is looseStill.test)', () => {
    const tactic: LaneInput = { lane: 'tactic', text: 'Danger — a whole piece is at stake: your bishop on f4 is the only defender of your knight on g5 — and it can be taken.', fen: G1_14, squares: ['f4', 'g5'], claims: [conceptInstanceKey('removal_of_guard', ['f4', 'g5']), looseKey('f4', 26)], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE };
    const first = decideTurn([tactic]);
    expect(first.spoke).toContain('tactic');
    const said = new Set(spokenSentenceKeys(first.pkg));
    const threat: LaneInput = { lane: 'threat', text: "Careful — your bishop on f4 is attacked and nothing's defending it.", fen: G1_15, squares: ['f4'], claims: [looseKey('f4', 26)], proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE };
    expect(decideTurn([threat], '', said).spoke).not.toContain('threat');
  });

  it('Learn attaches the loose key to the hanging threat and to the tactic squares that hang', () => {
    expect(TEACH).toMatch(/const loose = looseClaim\(worst\.square, loosePly, learnMemRef\.current\.looseSpells\);\s*threatKey = loose\.key;\s*threatClaims\.push\(loose\.key\);/);
    expect(TEACH).toMatch(/for \(const sq of tacticSquares\) if \(myHanging\.some\(\(h\) => h\.square === sq\)\) tacticLoose\.push\(looseClaim\(sq, loosePly, learnMemRef\.current\.looseSpells\)\.key\);/);
    expect(looseStillKey('f4', 26)).not.toBe(looseKey('f4', 26));
    // The threat lane carries its loose keys beside the tactic's own key and the
    // threat-cost computer's claims (batch 4 merge of #4 + #5).
    expect(TEACH).toMatch(/claims: \[\.\.\.new Set\(\[\.\.\.\(threatClaim \? \[threatClaim\] : \[\]\), \.\.\.threatClaims, \.\.\.\(threatCostRead\?\.claims \?\? \[\]\)\]\)\]/);
  });
});

describe('#6 — one count on e5, however it is read', () => {
  const after = 'r1bqr1k1/3p1ppp/p2b1n2/npp1p3/2P5/1P1PPN2/PBN1BPPP/R2QK2R w KQ - 0 11';
  const before = 'r1bqr1k1/3p1ppp/p2b1n2/npp1p3/2P5/1P1PP3/PBN1BPPP/R2QK1NR w KQ - 0 10';
  const afterMove = 'r1bqr1k1/3p1ppp/p2b1n2/npp1p3/2P5/1P1PPN2/PBN1BPPP/R2QK2R b KQ - 1 10';
  // The count reads the student's own losing capture on e5 (2026-10-28).
  const countRead = () => readBoard('countMethod', { fenBefore: '4k3/8/3p1p2/4p3/8/5N2/8/4K3 w - - 0 1', playedSan: 'Nxe5', student: 'w', costCp: 200 });
  it('g3 10.Nf3 c5: the count method and the tied defender share count:e5', () => {
    const cnt = countRead();
    const tie = readBoard('tiedDefender', { fenBefore: before, fenAfterMove: afterMove, fenAfterReply: after, student: 'w' });
    expect(cnt?.key).toBe(countKey('e5'));
    expect(tie?.key).toBe(countKey('e5'));
  });
  it('one turn says the count once', () => {
    const cnt = countRead()!;
    const tie = readBoard('tiedDefender', { fenBefore: before, fenAfterMove: afterMove, fenAfterReply: after, student: 'w' })!;
    const d = decideTurn([
      { lane: 'countMethod', text: cnt.text, fen: after, squares: [...cnt.squares], claims: [cnt.key], stakes: cnt.stakes, proof: cnt.proof, namesStudentMove: NAMES_NO_MOVE },
      { lane: 'movePoint', text: tie.text, fen: after, squares: [...tie.squares], claims: [tie.key], proof: tie.proof, namesStudentMove: NAMES_NO_MOVE },
    ]);
    expect(d.pkg.kept.filter((f) => /e5/.test(f.text))).toHaveLength(1);
  });
});
