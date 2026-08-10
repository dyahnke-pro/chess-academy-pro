import { describe, it } from 'vitest';
import { Chess } from 'chess.js';
import gems from '../data/punish-gems.json';
import { planFromUci } from './lookaheadPlan';

interface Gem { openingId: string; lineMoves: string; inaccuracy: string; punishSeq: string[]; tier: string; engineCp: number }

describe('gem vs plan overlap', () => {
  it('measures', () => {
    let total = 0, replayed = 0, planSaysMaterial = 0, planSaysTactic = 0, planSaysSomething = 0, planSilent = 0;
    const examples: string[] = [];
    for (const g of (gems as Gem[])) {
      total++;
      const board = new Chess();
      let ok = true;
      for (const san of `${g.lineMoves} ${g.inaccuracy}`.split(/\s+/).filter(Boolean)) {
        try { if (!board.move(san)) { ok = false; break; } } catch { ok = false; break; }
      }
      if (!ok) continue;
      const fen = board.fen();
      // SAN punishSeq -> UCI
      const probe = new Chess(fen);
      const uci: string[] = [];
      for (const san of g.punishSeq) {
        let mv; try { mv = probe.move(san); } catch { break; }
        if (!mv) break;
        uci.push(`${mv.from}${mv.to}${mv.promotion ?? ''}`);
      }
      if (uci.length < 4) continue;
      replayed++;
      const studentColor = probe.turn() === 'w' ? 'black' : 'white';
      const plan = planFromUci(fen, uci, new Chess(fen).turn() === 'w' ? 'white' : 'black');
      const t = plan?.mine.text ?? '';
      if (!t) { planSilent++; continue; }
      planSaysSomething++;
      if (/win a (pawn|piece|rook)/.test(t)) planSaysMaterial++;
      if (/land a /.test(t)) planSaysTactic++;
      if (examples.length < 8) examples.push(`[${g.tier} ${g.engineCp}cp] gem="${g.inaccuracy}" -> plan="${t}"`);
      void studentColor;
    }
    console.log(`GEMS=${total} REPLAYED=${replayed} PLAN_SPOKE=${planSaysSomething} SILENT=${planSilent} MATERIAL=${planSaysMaterial} TACTIC=${planSaysTactic}`);
    examples.forEach((e) => console.log('  ' + e));
  }, 120000);
});
