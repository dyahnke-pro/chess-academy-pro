/**
 * bugReport — in-app "Report a problem" (David 2026-06-02).
 * --------------------------------------------------------
 * The one bug channel automation can't replace: a tester taps a button and
 * tells us "this felt wrong" — catching wrong-but-legal content, UX confusion,
 * and "the coach said something dumb" that no detector fires on.
 *
 * It rides the existing rails: emits a `user-report` audit, which (a) streams
 * to the audit-stream so Claude can read it live, and (b) flows to PostHog as
 * a `user_report` event via the allowlist. The report carries the tester's
 * note + build id + the recent error/defect context so the report is
 * actionable without a back-and-forth.
 */
import { getAppAuditLog, getBuildId, getSessionId, logAppAudit } from './appAuditor';

const MAX_NOTE = 2000;
const RECENT_CONTEXT = 15;

/** Submit a user bug report. Resolves true if the audit was emitted. Never
 *  throws — a failed report must not throw in the user's face. */
export async function submitBugReport(note: string): Promise<boolean> {
  try {
    const trimmed = note.trim().slice(0, MAX_NOTE);
    const log = await getAppAuditLog().catch(() => []);
    // The recent runtime/app issues are the most useful context for a report.
    const recent = log
      .filter((e) => e.category === 'runtime' || e.category === 'app')
      .slice(-RECENT_CONTEXT)
      .map((e) => `${e.kind} — ${e.summary}`)
      .join('\n');
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';

    await logAppAudit({
      kind: 'user-report',
      category: 'app',
      source: 'BugReportPanel',
      summary: trimmed.slice(0, 200) || '(no note)',
      details: [
        `NOTE:\n${trimmed || '(none)'}`,
        `BUILD: ${getBuildId()}`,
        `SESSION: ${getSessionId()}`,
        `UA: ${ua}`,
        `RECENT ISSUES:\n${recent || '(none)'}`,
      ].join('\n\n'),
    });
    return true;
  } catch {
    return false;
  }
}
