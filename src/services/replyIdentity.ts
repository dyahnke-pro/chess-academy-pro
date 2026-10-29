import type { SublineRef } from './openingCourse';

/**
 * The ONE identity of an opponent reply inside its opening — what its
 * narration key (`sublineKey`) and its review / rung key (`sublineLineKey`)
 * both carry, so the two can never name a reply differently. A reply on its
 * tab's own line (every curated and games reply) keeps the key it always had;
 * a reply inside another reply's line adds that line (`via`), so two replies
 * at the same move and ply on different boards never share their narration,
 * their review cards or their rungs (WO-COURSE-01 D). A leaf: the review
 * service reads it without pulling in the course data.
 */
export function replyIdentity(s: SublineRef): string {
  return `${s.tab}::${s.triggerMove}@${s.atPly}${s.via ? `<${s.via}` : ''}`;
}
