/**
 * THE CHAT REPLAY SET (WO-CHAT-01 P0, 2026-10-09) — every turn of the
 * 2026-10-09 hand walk (`audit-reports/hand-walk-chat-qa-2026-10-09.md`) plus
 * the real App Store users' turns from PostHog, each with what a right answer
 * must and must not contain. Graded on "answered / action done / right
 * language" — never on how the turn was read (the 107/107 reader eval was
 * green while 13 of 27 answers were wrong).
 *
 * `setup`: 'fresh' (new Learn page, start position) · 'italian' (Learn, the
 * student White, e4 Nf3 Bc4 played; the opponent replies as it likes) ·
 * 'chat' (the standalone /coach/chat page). Cases run in order within a
 * setup, so a follow-up follows its question. `{LAST}` is the opponent's last
 * move, filled in at ask time.
 *
 * Expectations describe the TARGET behaviour: a case that fails today is the
 * work list, and the set must never be edited to pass (CLAUDE.md: "editing a
 * test until it passes" is not a fix).
 */

export const STOCK = /I can't verify that precisely from grounded data/;
const THAI = /[฀-๿]/;
/** The coach never speaks as a player (RULEBOOK V1/V2): no I / my / me. */
const COACH_AS_PLAYER = /\b(?:I|my|me|I'm|I've)\b|skill-level move|at your strength on purpose/;
const GERMAN = /\b(der|die|das|dein|deine|und|ist|nicht|Springer|Zug|schlagen|Läufer|Bauer)\b/i;

export const CASES = [
  // ── Requests, Learn (fresh) ────────────────────────────────────────────
  { id: 'R1', setup: 'fresh', ask: 'teach me the Italian', from: 'walk',
    must: [/Italian/i], mustNot: [/Ware/] },
  { id: 'R2', setup: 'fresh', ask: 'ผมอยากซ้อมเปิดเกมแบบอิตาลีสอนหน่อย', from: 'native 2026-09-16 (Thai: I want to practise the Italian, teach me)',
    must: [THAI], mustNot: [/Ware/] },
  { id: 'R3', setup: 'fresh', ask: 'sollte springer schlagen', from: 'native 2026-09-25 (German: should the knight take?)',
    must: [GERMAN], mustNot: [THAI, /b8|g8/] },
  { id: 'R3b', setup: 'fresh', ask: 'แป๊บนึงนะรีเซ็ทกระดานใหม่แล้วสอนผมเดินแบบอิตาลี', from: 'native 2026-09-16 (Thai: reset the board and teach me the Italian)',
    must: [THAI], mustNot: [/Material is even/] },
  { id: 'R4', setup: 'fresh', ask: "let's play a game, I'll be white", from: 'walk',
    must: [/White/i] },

  // ── Board questions, Learn (Italian) ───────────────────────────────────
  { id: 'B1', setup: 'italian', ask: "what's the best move here?", from: 'walk', must: [/[NBRQK]?[a-h]x?[a-h]?[1-8]|O-O/] },
  { id: 'B2', setup: 'italian', ask: 'why is that the best move?', from: 'walk' },
  { id: 'B3', setup: 'italian', ask: 'what about d4?', from: 'walk', must: [/d4/] },
  { id: 'B4', setup: 'italian', ask: 'is c3 good?', from: 'walk', must: [/c3/] },
  { id: 'B5', setup: 'italian', ask: "what's my plan?", from: 'walk', mustNot: [/h3 will still be there/] },
  { id: 'B6', setup: 'italian', ask: 'what is black trying to do?', from: 'walk' },
  { id: 'B7', setup: 'italian', ask: 'why did they play {LAST}?', from: 'walk', mustNot: [COACH_AS_PLAYER] },
  { id: 'B8', setup: 'italian', ask: 'and why not d4?', from: 'walk', must: [/d4/] },
  { id: 'B9', setup: 'italian', ask: 'whats teh best move', from: 'walk' },
  { id: 'B10', setup: 'italian', ask: 'is my bishop on c4 good?', from: 'walk', must: [/c4/] },
  { id: 'B11', setup: 'italian', ask: 'can they attack my bishop?', from: 'walk', must: [/bishop/i], mustNot: [/^The best move is/] },
  { id: 'B12', setup: 'italian', ask: 'what does {LAST} attack?', from: 'walk', mustNot: [COACH_AS_PLAYER, /was the engine's top move/] },
  { id: 'B13', setup: 'italian', ask: 'is anything hanging?', from: 'walk', mustNot: [/rook on a1|rook on h1/] },
  { id: 'B14', setup: 'italian', ask: 'what are my weaknesses?', from: 'walk', must: [/import|games/i] },
  { id: 'B15', setup: 'italian', ask: 'turn the voice off', from: 'walk', must: [/off/i] },
  { id: 'B16', setup: 'italian', ask: 'thanks!', from: 'walk' },
  { id: 'B17', setup: 'italian', ask: 'what opening is this?', from: 'walk', must: [/\b(?:Game|Defen[cs]e|Opening|Attack|Gambit|System|Variation)\b/] },
  { id: 'B18', setup: 'italian', ask: 'how do I castle?', from: 'walk', must: [/castl/i] },

  // ── Requests, standalone chat ──────────────────────────────────────────
  // Each starts on a fresh /coach/chat unless `stay` (a follow-up asked where
  // the last case left the student). A page change is part of the answer:
  // `urlMust` / `urlNot` grade it.
  { id: 'R5', setup: 'chat', ask: 'I want to practice the Italian opening, teach me', from: 'walk',
    must: [/Italian/i], mustNot: [/\bme walkthrough/, /Ware/], urlNot: /opening=me\b/ },
  { id: 'R7', setup: 'chat', stay: true, ask: 'can I start now?', from: 'walk + native (Thai: ผมเริ่มได้เลยใช่ไหม) — asked under R5\'s "Ready to start…"',
    must: [/Italian/i], mustNot: [/The best move is/] },
  { id: 'R6', setup: 'chat', ask: 'make me a full training plan', from: 'walk + native (Thai, 2026-09-16)',
    urlMust: /\/coach\/plan/ },
  { id: 'R8', setup: 'chat', ask: 'reset the board and teach me the Italian', from: 'walk',
    must: [/Italian/i], urlMust: /opening=Italian/ },
  { id: 'R9', setup: 'chat', ask: 'Knight_mare_01', from: 'native 2026-09-02 (a username)',
    must: [/username|import|Lichess|Chess\.com/i] },
  { id: 'N1', setup: 'chat', ask: "What's my best opening?", from: 'native 2026-09-03', mustNot: [/Material is even/] },
  { id: 'N2', setup: 'chat', ask: 'Which phase am I weakest in?', from: 'native 2026-09-02', mustNot: [/Material is even/] },
];
