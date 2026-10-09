/**
 * THE COMPUTED REPLY TO A TURN WITH NO CHESS IN IT (answers swarm P7).
 *
 * A thank-you, a greeting or an unmatched remark used to go to the model with
 * "no chess content" in its prompt, and a stripper swept out whatever chess it
 * said anyway. Nothing about that reply needs a model: it acknowledges the
 * student and, when the turn was not small talk, asks what they meant. The
 * stem is ROTATED on the text (never random), so the same turn reads the same.
 */

export type SmallTalkKind = 'presence' | 'thanks' | 'greeting' | 'agree' | 'goodbye' | 'unclear';

const KIND_RE: ReadonlyArray<[SmallTalkKind, RegExp]> = [
  // "you there?", "can you hear me", "do you understand me" — the student
  // checking the coach is listening, never a question about the board.
  ['presence', /^\s*(?:(?:are\s+)?you\s+there|can\s+you\s+(?:hear|see|understand)\s+me|do\s+you\s+understand(?:\s+me)?|are\s+you\s+(?:listening|working|awake|real))\b/i],
  ['thanks', /\b(?:thanks?|thank\s+you|thx|ty|cheers|appreciate\s+it)\b/i],
  ['goodbye', /\b(?:bye|goodbye|good\s*night|see\s+you|gotta\s+go|later)\b/i],
  ['greeting', /^\s*(?:hi|hey|hello|yo|sup|good\s+(?:morning|afternoon|evening)|howdy|test(?:ing)?)\b/i],
  ['agree', /^\s*(?:ok(?:ay)?|k|cool|nice|great|got\s+it|i\s+see|makes\s+sense|sure|alright|yes|yeah|yep|wow|lol|haha)\b/i],
];

export function smallTalkKind(text: string): SmallTalkKind {
  for (const [kind, re] of KIND_RE) if (re.test(text)) return kind;
  return 'unclear';
}

const STEMS: Record<SmallTalkKind, readonly string[]> = {
  presence: [
    'I am here. What would you like to know?',
    'Yes, I am listening. Go ahead.',
  ],
  thanks: ['Any time.', 'Glad it helped.', 'You are welcome.'],
  goodbye: ['See you next game.', 'Good playing. See you soon.'],
  greeting: [
    'Hi. What would you like to look at?',
    'Hello. What are we working on?',
  ],
  agree: ['Good.', 'Right.', 'Then on we go.'],
  unclear: [
    'I am not sure what you mean. Could you say it another way?',
    'I did not catch that. Could you put it differently?',
  ],
};

function rotation(text: string, n: number): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h % n;
}

export function smallTalkReply(text: string): string {
  const stems = STEMS[smallTalkKind(text)];
  return stems[rotation(text.trim().toLowerCase(), stems.length)];
}
