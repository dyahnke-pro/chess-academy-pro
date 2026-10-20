/**
 * THE PLAN LINE FADES THROUGH THE ONE FADE TABLE (opening-measure 2026-10-19
 * #3: "How do you find a plan? First the forcing scan…" spoke in full every
 * time while no-plan was proven, because planArc's held half read 'na' and the
 * door's fade never reached it). Its skill's state comes from the student's
 * own record through the real hold-rate computer (`heatMap`), never set by
 * hand: green says the plan alone, red and grey say the whole method.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { heatMap } from './heatMap';
import { fadeLevelsFrom } from './fadeText';
import { decideTurn } from './learnTurnDoor';
import { newPlanThread, planThreadTurn } from './planThread';
import { NO_PROOF } from './proof';
import { NAMES_NO_MOVE } from './studentMoveNaming';
import type { CapabilityEvidenceRecord, MisconceptionTagRecord } from '../types';

/** David's no-plan rows from his 2026-10-20 drop (evidence + game slips). */
const DAVID = JSON.parse(readFileSync('src/test/fixtures/david-no-plan-record.json', 'utf8')) as {
  evidence: CapabilityEvidenceRecord[]; slips: MisconceptionTagRecord[];
};

/** The first plan of a game — the method, found out loud (planThread). */
const KING_F8 = 'r4k1r/ppp2ppp/2n2n2/8/8/2N2N2/PPPQ1PPP/R3K2R b KQ - 0 12';
const BOARD = KING_F8.replace(' b ', ' w ');
const planLine = ((): { text: string; squares: string[] } => {
  const [l] = planThreadTurn(newPlanThread(), { ply: 22, fenBefore: KING_F8, fenAfter: BOARD, student: 'w', holdPlayable: false });
  return { text: l.text, squares: [...(l.squares ?? [])] };
})();

/** What the door says of the plan line for a record. */
const spoken = (evidence: readonly CapabilityEvidenceRecord[], slips: readonly MisconceptionTagRecord[]): { state: string; said: string } => {
  const tiles = heatMap(evidence, slips);
  const green = fadeLevelsFrom(new Map(tiles.map((t) => [t.tag, t])));
  const d = decideTurn([{ lane: 'planArc', text: planLine.text, fen: BOARD, squares: planLine.squares, proof: NO_PROOF.description, namesStudentMove: NAMES_NO_MOVE }], '', undefined, null, green);
  return { state: tiles.find((t) => t.tag === 'no-plan')!.state, said: d.pkg.spoken };
};

/** David's record, then twenty held answers after his last miss: proven. */
const provenRecord = (): CapabilityEvidenceRecord[] => {
  const last = Math.max(...DAVID.evidence.map((r) => r.recordedAt), ...DAVID.slips.map((r) => r.playedAt ?? r.createdAt));
  const held = Array.from({ length: 20 }, (_, i) => ({ ...DAVID.evidence[0], id: `proven-${i}`, outcome: 'held' as const, prompted: false, recordedAt: last + (i + 1) * 60_000, sourceGameId: `proven-game-${i}` }));
  return [...DAVID.evidence, ...held];
};

describe('the plan line reads the one fade', () => {
  it("David's record (no-plan red, 0 of his last 20 held): the whole method is said", () => {
    const r = spoken(DAVID.evidence, DAVID.slips);
    expect(r.state).toBe('red');
    expect(r.said).toMatch(/^How do you find a plan\?/);
  });
  it('the same record with the plan skill proven green: the plan alone', () => {
    const r = spoken(provenRecord(), DAVID.slips);
    expect(r.state).toBe('green');
    expect(r.said).toBe('The plan: put a rook on the open e-file; attack their king on f8 before it gets out.');
  });
  it('a fresh device (grey): the whole method, taught in full', () => {
    const r = spoken([], []);
    expect(r.state).toBe('grey');
    expect(r.said).toMatch(/^How do you find a plan\?.*So the plan:/);
  });
});
