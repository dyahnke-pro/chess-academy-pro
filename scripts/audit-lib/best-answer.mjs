// best-answer — the rubric for "correct AND the best answer" (escalating walk,
// 2026-10-17). Shared so a negative control can run it on recorded answers.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sanRe = (san) => new RegExp(`(?:^|[^A-Za-z0-9])${esc(san.replace(/[+#]$/, ''))}(?![A-Za-z0-9])`);

// THE BEST-ANSWER RUBRIC (David 2026-10-17: "Answered and correct are two
// different things. Were they also the best answer?"). Correct is the board
// check above; best is what a strong coach would have said: the move asked
// about is the one answered, a line is said with its point and not recited,
// nothing is said twice, nothing contradicts itself, "cover it" says how, and
// a plan is one thread.
const SAN_TOKEN = /^(?:…?[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|O-O(?:-O)?[+#]?|\([^)]*\))$/;
export function bestAnswerIssues(rung, q, answer, ctx) {
  const out = [];
  const sentences = answer.split(/(?<=[.!?])\s+|⏎/).map((x) => x.trim().toLowerCase()).filter((x) => x.length > 12);
  const seen = new Set();
  for (const s of sentences) { if (seen.has(s)) out.push(`said twice: "${s.slice(0, 60)}"`); seen.add(s); }
  // A recited line: six or more move tokens with no words between them.
  let run = 0; let worst = 0;
  for (const w of answer.replace(/[,;:—]/g, ' ').split(/\s+/)) {
    if (SAN_TOKEN.test(w) || /^(?:king|queen|rook|bishop|knight|pawn|to|takes|on|with|check|checkmate|[a-h][1-8])$/i.test(w)) run += 1; else { worst = Math.max(worst, run); run = 0; }
  }
  worst = Math.max(worst, run);
  if (worst >= 18) out.push(`recites a bare line (${worst} move words in a row, no why between them)`);
  if (/\bquiet move\b/i.test(answer) && /\b(?:the point of|it stops|stops your|wins)\b/i.test(answer)) out.push('calls the move quiet and gives its point');
  if (rung.check === 'second' && ctx.second && !sanRe(ctx.second).test(answer)) out.push(`never talks about ${ctx.second}, the move asked about`);
  if (rung.check === 'why' && ctx.gapCp >= 150 && /no single reason/i.test(answer)) out.push(`no reason given for a ${ctx.gapCp}cp gap`);
  // "Cover it" must say how in the SAME sentence (a move, or "by/with …").
  for (const sent of answer.split(/(?<=[.!?])\s+|⏎/)) {
    const m = /\b(?:cover it|defend it|deal with it|guard it)\b(.*)$/i.exec(sent);
    if (m && !/\b[KQRBN]?[a-h]?x?[a-h][1-8]\b|\bby\b|\bwith\b/.test(m[1])) out.push('says to cover it without saying how');
  }
  // One fact twice in different words: the same square called hanging again.
  const hung = [...answer.matchAll(/\b([a-h][1-8])\b[^.⏎]{0,40}\bhang|\bhanging:[^.⏎]{0,30}?\b([a-h][1-8])\b/gi)].map((m) => m[1] ?? m[2]);
  for (const sq of new Set(hung)) if (hung.filter((x) => x === sq).length > 1) out.push(`says ${sq} hangs twice`);
  if (/plan/i.test(q)) {
    const aims = (answer.match(/\b(?:plant|put|improve|push|win|attack|trade|open|overprotect|escort|aim|stack|double|bring)\b/gi) ?? []).length;
    if (aims >= 6) out.push(`plan is a list of ${aims} aims, not one thread`);
  }
  return out;
}

