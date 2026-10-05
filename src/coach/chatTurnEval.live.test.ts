// The LIVE held-out eval — opt-in, never part of ship-check (it calls a model).
//
//   CHAT_TURN_EVAL=1 CHAT_TURN_EVAL_KEY=<deepseek key> npx vitest run src/coach/chatTurnEval.live.test.ts
//
// Sends the SAME request the app's reader sends (`readChatTurnStructured` →
// `callDeepseekWithTool`: model, forced tool, thinking off) through curl, so
// the egress proxy applies, and scores every case with `scoreChatTurnEval`.
// Writes `audit-reports/chat-turn-eval-<iso>.json`. It does not flip the
// runtime flag: that is a decision taken on this AND the shadow's real-question
// agreement together.
import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { parseChatTurn, type Reader } from './chatTurnParser';
import { CHAT_TURN_EVAL_CASES } from './chatTurnEval.corpus';
import { scoreChatTurnEval, type ChatTurnEvalResult } from './chatTurnEval';

const ON = process.env.CHAT_TURN_EVAL === '1' && !!process.env.CHAT_TURN_EVAL_KEY;
const MODEL = 'deepseek-v4-flash';

const curlReader: Reader = (opts) => new Promise((resolve) => {
  const body = JSON.stringify({
    model: MODEL,
    max_tokens: opts.maxTokens,
    messages: [{ role: 'system', content: opts.system }, { role: 'user', content: opts.user }],
    tools: [{ type: 'function', function: { name: opts.toolName, description: opts.description, parameters: opts.schema } }],
    tool_choice: { type: 'function', function: { name: opts.toolName } },
    thinking: { type: 'disabled' },
  });
  execFile('curl', ['-s', '--max-time', '30', 'https://api.deepseek.com/chat/completions',
    '-H', `Authorization: Bearer ${process.env.CHAT_TURN_EVAL_KEY ?? ''}`, '-H', 'Content-Type: application/json', '-d', body],
  { maxBuffer: 1 << 20 }, (err, stdout) => {
    if (err) { resolve(null); return; }
    try {
      const j = JSON.parse(stdout) as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }> };
      const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      resolve(args ? JSON.parse(args) as unknown : null);
    } catch { resolve(null); }
  });
});

describe.skipIf(!ON)('ONE-CHAT reader on held-out phrasings (live)', () => {
  it('reads at or above the serve bar', async () => {
    const results: ChatTurnEvalResult[] = new Array(CHAT_TURN_EVAL_CASES.length);
    let next = 0;
    const worker = async (): Promise<void> => {
      while (next < CHAT_TURN_EVAL_CASES.length) {
        const i = next++;
        const c = CHAT_TURN_EVAL_CASES[i];
        const r = await parseChatTurn(c.text, { board: { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3' }, reader: curlReader, timeoutMs: 30_000 });
        results[i] = { case: c, kind: r.turn?.kind ?? null };
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    const score = scoreChatTurnEval(results);
    mkdirSync('audit-reports', { recursive: true });
    writeFileSync(`audit-reports/chat-turn-eval-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ model: MODEL, ...score }, null, 2));
    console.log(`chat-turn eval: ${score.correct}/${score.total} = ${(score.accuracy * 100).toFixed(1)}%`);
    for (const m of score.misses) console.log(`  MISS [${m.probe}] "${m.text}" → ${m.got ?? 'none'} (want ${m.expected.join('|')})`);
    expect(score.total).toBe(CHAT_TURN_EVAL_CASES.length);
    expect(score.passes).toBe(true);
  }, 600_000);
});
