/**
 * 🔒 THE NAME THE SITE KNOWS, NOT THE KEYSTROKES (2026-11-26). Every first
 * import that failed on an App Store phone in 30 days failed `user-not-found`:
 * the importers sent the box's text as typed, and a phone keyboard leaves a
 * trailing space (autocorrect's "name "), a pasted profile link, or "@name" —
 * none of which is a username. One normaliser, read by both importers at the
 * API boundary and by the page that saves the name. PURE.
 */
export function normalizeChessUsername(input: string): string {
  let s = input.trim();
  // A pasted profile link: chess.com/member/<name>, lichess.org/@/<name>.
  const link = /(?:chess\.com\/(?:member|players?|stats\/[a-z]+\/[a-z]+)\/|lichess\.org\/(?:@\/)?)([A-Za-z0-9_-]+)/i.exec(s);
  if (link) s = link[1];
  s = s.replace(/^@+/, '');
  return s.replace(/\s+/g, '');
}
