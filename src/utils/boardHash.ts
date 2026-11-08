/** FNV-1a (32 bits, 8 hex) of a string — the hash every stored game tree is
 *  sharded by: the master tree's late-transposition buckets
 *  (`masterTree.ts`), the club tree (`clubTree.ts`) and the engine lines
 *  (`engineLine.ts`). The offline scripts run the same function and pin this
 *  vector: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -' →
 *  '44941583'. Pure. */
export function boardHash(key: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
