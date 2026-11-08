// Which App Store review submission a version goes on.
//
// A review submission is OPEN until it is submitted and reviewed, or
// cancelled. A closed one (COMPLETE, CANCELING) keeps its items forever, so
// "the submission that holds this version" can be a finished one — the 4.0.8
// resubmission on 2026-11-08 reused the submission it had just been pulled out
// of, added nothing, and reported "already in review" while the version sat at
// PREPARE_FOR_SUBMISSION. Only an open submission may be reused.

/** States of a submission still open to this version (reuse it). */
export const OPEN_SUB_STATES = new Set([
  'READY_FOR_REVIEW', 'WAITING_FOR_REVIEW', 'IN_REVIEW',
  'UNRESOLVED_ISSUES', 'COMPLETING',
]);

/** States a submission can be sent from (first submit, or resubmit after a rejection). */
export const RESUBMITTABLE_SUB_STATES = new Set(['READY_FOR_REVIEW', 'UNRESOLVED_ISSUES']);

/**
 * The submission to put the version on, or null to create one.
 * @param {Array<{id: string, state: string, hasVersion: boolean}>} subs
 * @param {string | null} skipId a submission just cancelled, never reused
 */
export function pickReviewSubmission(subs, skipId = null) {
  const open = subs.filter((s) => s.id !== skipId && OPEN_SUB_STATES.has(s.state));
  return open.find((s) => s.hasVersion)
    ?? open.find((s) => s.state === 'READY_FOR_REVIEW')
    ?? open[0]
    ?? null;
}
