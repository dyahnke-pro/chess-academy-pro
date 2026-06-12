/**
 * Split a prose block into readable, individually-clickable paragraphs.
 *
 * Book/wisdom passages are usually ONE long block with no blank lines, which
 * leaves a reader with a single un-clickable wall — so "tap a paragraph to
 * start reading from there" has nothing to tap between. This splits on blank
 * lines first, then breaks any long block into ~2-sentence paragraphs.
 *
 * Splitting is on REAL sentence boundaries only — punctuation followed by a
 * space and a capital. It deliberately does NOT break on chess move notation
 * like "...d5" / "...b4" (no space after the dots; the move starts with no
 * preceding boundary), which a naive [.!?] split shredded into fragments.
 *
 * Short blocks (≤ maxLen) pass through untouched.
 */
export function splitIntoReadableBlocks(text: string, maxLen = 280): string[] {
  const blocks = text
    .split('\n\n')
    .map((b) => b.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const block of blocks) {
    if (block.length <= maxLen) {
      out.push(block);
      continue;
    }
    const sentences = block
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (let i = 0; i < sentences.length; i += 2) {
      const chunk = sentences.slice(i, i + 2).join(' ').trim();
      if (chunk) out.push(chunk);
    }
  }
  return out;
}
