// THE RECORD REVS MOVE WITH WHAT THEY WRITE (the rev fingerprint gate —
// src/test/revFingerprint.ts). Each rev stamps rows already on a device; when
// its producer's output changes and the rev does not, those rows are never
// re-read and the record (the heat map, the drills, the tactic tags, the
// opening keys, the insight tiles) keeps the old answer. Fixed inputs from
// David's record: three games, forty slips, forty mistake puzzles.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { checkRevFingerprint, fingerprint } from '../test/revFingerprint';
import { openingKeyFromPgn } from './openingKey';
import { OPENING_KEY_REV } from './openingKeyBackfill';
import { detectTacticType } from './missedTacticService';
import { TACTIC_TYPE_REV } from './tacticTypeBackfill';
import { classifyMisconceptionNow } from './misconceptionClassifier';
import { MISCONCEPTION_RULES_REV, POSITIVE_HALF_REV, THREAT_HALF_REV } from '../data/misconceptionTags';
import { capabilityPliesFromAnnotations, threatPliesFromAnnotations } from './autoAnalyzeGame';
import { capabilityOutcomes } from './capabilityEvidence';
import { threatAnswersForGame } from './threatAnswerEvidence';
import { computeInsightStats, INSIGHT_STATS_REV } from './gameInsightsService';
import { PRO_DATA_REVISION, BASE_DATA_REVISION } from './dataLoader';
import type { GameRecord, MoveAnnotation } from '../types';

interface Inputs {
  games: (Pick<GameRecord, 'id' | 'pgn' | 'date' | 'white' | 'black' | 'result' | 'eco'> & { annotations: MoveAnnotation[] })[];
  slips: { fen: string; playedSan: string; bestSan?: string; gamePhase?: 'opening' | 'middlegame' | 'endgame'; cpLoss?: number }[];
  puzzles: { fen: string; bestMove: string; moves: string; playerMoveSan: string }[];
}
const IN = JSON.parse(readFileSync('src/services/__fixtures__/record-rev-inputs.json', 'utf8')) as Inputs;
const FILE = 'src/services/recordRevs.gate.test.ts';
const seat = (g: Inputs['games'][number]): 'white' | 'black' => (g.black === 'Knight_Mare_01' ? 'black' : 'white');
const fensOf = (pgn: string): string[] => { const c = new Chess(); c.loadPgn(pgn); const d = new Chess(); return [d.fen(), ...c.history().map((san) => { d.move(san); return d.fen(); })]; };
const byGame = (f: (g: Inputs['games'][number]) => unknown): Record<string, string> => Object.fromEntries(IN.games.map((g) => [g.id, fingerprint(f(g))]));

describe('every record rev moves with its producer', () => {
  it('OPENING_KEY_REV — the opening key minted from a PGN', () => {
    expect(checkRevFingerprint('opening-key', OPENING_KEY_REV, byGame((g) => openingKeyFromPgn(g.pgn)), FILE)).toBeNull();
  }, 60_000);
  it('TACTIC_TYPE_REV — the tactic tag of a mistake puzzle', () => {
    const tags = IN.puzzles.map((p) => { try { return detectTacticType(p.fen, p.bestMove, p.moves.split(' ')); } catch { return 'threw'; } });
    expect(checkRevFingerprint('tactic-type', TACTIC_TYPE_REV, { puzzles: fingerprint(tags) }, FILE)).toBeNull();
  }, 60_000);
  it('MISCONCEPTION_RULES_REV — the tag a slip is filed under', () => {
    const tags = IN.slips.map((s) => { const c = classifyMisconceptionNow({ fen: s.fen, playedSan: s.playedSan, bestSan: s.bestSan, gamePhase: s.gamePhase } as never); return c ? [c.tag, c.fundamentalId ?? null] : null; });
    expect(checkRevFingerprint('misconception-rules', MISCONCEPTION_RULES_REV, { slips: fingerprint(tags) }, FILE)).toBeNull();
  }, 60_000);
  it('POSITIVE_HALF_REV — the skills a game posed and the student held', () => {
    // The ROWS written, not the plies read: a scoring change (a shot named by
    // its motif, WO-MOTIFS-01) re-files rows without changing a single ply.
    expect(checkRevFingerprint('positive-half', POSITIVE_HALF_REV, byGame((g) => capabilityPliesFromAnnotations(g.annotations, seat(g), fensOf(g.pgn)).map((p) => capabilityOutcomes({
      fenBefore: p.fenBefore, playedSan: p.playedSan, moverColor: seat(g), cpLoss: p.cpLoss, alsoPosed: p.alsoPosed,
      ...(p.bestSan ? { bestSan: p.bestSan } : {}), ...(p.historySans ? { historySans: p.historySans } : {}),
    }))), FILE)).toBeNull();
  }, 60_000);
  it('THREAT_HALF_REV — their motifs at the student\'s turn, held or broken', () => {
    // The rows written (each motif's own tag), not the plies read.
    expect(checkRevFingerprint('threat-half', THREAT_HALF_REV, byGame((g) => threatAnswersForGame(threatPliesFromAnnotations(g.annotations, seat(g), fensOf(g.pgn)))), FILE)).toBeNull();
  }, 60_000);
  it('INSIGHT_STATS_REV — the per-game insight stats', () => {
    expect(checkRevFingerprint('insight-stats', INSIGHT_STATS_REV, byGame((g) => computeInsightStats(g as unknown as GameRecord, seat(g), 'gate')), FILE)).toBeNull();
  }, 60_000);
  it('PRO_DATA_REVISION / BASE_DATA_REVISION — the repertoire JSON a device mirrors', () => {
    expect(checkRevFingerprint('pro-data', PRO_DATA_REVISION, { 'pro-repertoires.json': fingerprint(readFileSync('src/data/pro-repertoires.json', 'utf8')) }, FILE)).toBeNull();
    expect(checkRevFingerprint('base-data', BASE_DATA_REVISION, { 'repertoire.json': fingerprint(readFileSync('src/data/repertoire.json', 'utf8')) }, FILE)).toBeNull();
  }, 60_000);
});
