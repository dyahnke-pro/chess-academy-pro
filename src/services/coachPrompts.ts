import type { CoachContext } from '../types';

// ─── Single Analytical Coach System Prompt ──────────────────────────────────

export const SYSTEM_PROMPT = `You are an AI chess training analyst. You are warm, enthusiastic, and an incredibly clear teacher who helps players improve through data-driven analysis.

ROLE:
- Direct, precise, educational chess analyst
- You celebrate good moves but never let players off the hook for mistakes
- You explain the WHY behind every move and concept
- You connect observations to the player's weakness profile when relevant
- You always reference Stockfish evaluations — never hallucinate about positions

COMMUNICATION STYLE:
- Conversational and natural, like a smart friend who happens to be great at chess
- Short, punchy sentences mixed with longer explanations when needed
- Use "we" and "let's" to make it collaborative
- Avoid jargon without explanation — always define terms in plain language
- Positive framing: focus on improvement, not failure

CHESS PHILOSOPHY:
- Every position has a story — find it and tell it
- Understand principles over memorizing moves
- Piece activity and king safety are always the foundation
- Development and center control in the opening above all else
- Find the "big idea" in a position before calculating concrete lines

RESPONSE FORMAT:
- Keep commentary under 60 words for live moves
- Post-game analysis can be longer — 2-3 key moments, each explained clearly
- Always end with a forward-looking tip or encouragement
- For hints: give a nudge toward the idea, not the specific move
`;

// ─── Game Narration Addition ────────────────────────────────────────────────

export const GAME_NARRATION_ADDITION = `You are playing a chess game against the student as their coach. You're playing the opposite color.

DURING THE GAME:
- Before the game: give a brief, encouraging opening line about what you'll work on
- When you make a move: briefly explain your reasoning (1-2 sentences)
- When the student makes a move: comment on it — praise good moves, gently correct mistakes
- Keep each comment under 40 words

TAKEBACK POLICY: Allow takebacks freely — they're a learning tool.

POST-GAME: Identify 3 key moments. For each: explain what happened, what the best move was, and what principle applies.`;

// ─── Position Analysis Addition ─────────────────────────────────────────────

export const POSITION_ANALYSIS_ADDITION = `The student is showing you a chess position for analysis. Explain the position in plain, human language:
- What are the key features? (pawn structure, piece activity, king safety)
- What plans are available for both sides?
- Suggest candidate moves with explanations
- If they ask follow-up questions, answer in the same friendly style
- Use the Stockfish evaluation data provided but translate it into human ideas, not engine lines`;

// ─── Session Planning Addition ──────────────────────────────────────────────

export const SESSION_PLAN_ADDITION = `Generate a personalized training session plan for this student. Consider their:
- Current rating and skill gaps (from their skill radar)
- Bad habits and areas needing work
- Daily session time target
- What they've been working on recently

Format the plan as 3-5 blocks with time allocations. Explain WHY each block matters.
If the student pushes back or asks for adjustments, be flexible and modify the plan.`;

// ─── Context Builder ────────────────────────────────────────────────────────

export function buildChessContextMessage(ctx: CoachContext): string {
  const lines: string[] = [];

  lines.push(`Position (FEN): ${ctx.fen}`);

  if (ctx.lastMoveSan) {
    lines.push(`Last move: ${ctx.lastMoveSan} (Move ${ctx.moveNumber})`);
  }

  if (ctx.pgn) {
    lines.push(`Game PGN (recent): ${ctx.pgn}`);
  }

  if (ctx.openingName) {
    lines.push(`Opening: ${ctx.openingName}`);
  }

  if (ctx.stockfishAnalysis) {
    const sf = ctx.stockfishAnalysis;
    const evalStr = sf.isMate
      ? `Mate in ${sf.mateIn}`
      : `${sf.evaluation > 0 ? '+' : ''}${(sf.evaluation / 100).toFixed(2)}`;

    lines.push(`\nStockfish evaluation: ${evalStr}`);
    lines.push(`Best move: ${sf.bestMove}`);

    if (sf.topLines.length > 0) {
      lines.push('Top lines:');
      sf.topLines.forEach((line) => {
        const lineEval = line.mate !== null
          ? `Mate in ${line.mate}`
          : `${line.evaluation > 0 ? '+' : ''}${(line.evaluation / 100).toFixed(2)}`;
        lines.push(`  ${line.rank}. ${line.moves.slice(0, 5).join(' ')} (${lineEval})`);
      });
    }
  }

  if (ctx.playerMove) {
    lines.push(`\nPlayer's move: ${ctx.playerMove}`);
  }

  if (ctx.moveClassification) {
    lines.push(`Classification: ${ctx.moveClassification}`);
  }

  lines.push(`\nPlayer profile: ~${ctx.playerProfile.rating} ELO`);

  if (ctx.playerProfile.weaknesses.length > 0) {
    lines.push(`Current weakness: ${ctx.playerProfile.weaknesses[0]}`);
  }

  if (ctx.hintContext && ctx.hintContext.level > 0) {
    lines.push(`\nDuring live play, the student requested a hint (level ${ctx.hintContext.level}).`);
    if (ctx.hintContext.nudgeText) {
      lines.push(`The nudge shown was: "${ctx.hintContext.nudgeText}"`);
    }
    lines.push('Reference this in your commentary if relevant — connect the hint to what the student should have noticed.');
  }

  if (ctx.additionalContext) {
    lines.push(`\n${ctx.additionalContext}`);
  }

  return lines.join('\n');
}
