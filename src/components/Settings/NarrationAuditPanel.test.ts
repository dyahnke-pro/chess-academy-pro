import { describe, it, expect } from 'vitest';
import { formatLogAsMarkdown } from './NarrationAuditPanel';
import type { AuditEntry } from '../../services/appAuditor';

/**
 * `formatLogAsMarkdown` is the bridge between the unified app auditor
 * and a Claude Code session: the user taps "Copy for Claude" and
 * pastes the output into a new session. The format needs to be stable
 * and self-contained so Claude can act on findings without extra
 * context.
 */
describe('formatLogAsMarkdown', () => {
  it('returns an empty-state message for an empty log', () => {
    expect(formatLogAsMarkdown([])).toContain('_No findings._');
  });

  it('includes header, summaries, and findings for a populated log', () => {
    const log: AuditEntry[] = [
      {
        timestamp: 1_700_000_000_000,
        kind: 'piece-on-square',
        category: 'narration',
        source: 'move-commentary',
        summary: 'claims queen on f3, but f3 is empty',
        details: 'excerpt: "the queen on f3"',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        context: 'move-commentary',
      },
      {
        timestamp: 1_700_000_100_000,
        kind: 'uncaught-error',
        category: 'runtime',
        source: 'window.onerror',
        summary: 'TypeError: Cannot read properties of undefined',
        details: 'at Foo (bar.tsx:123)',
      },
      {
        timestamp: 1_700_000_200_000,
        kind: 'polly-fallback',
        category: 'subsystem',
        source: 'voiceService.speakPolly',
        summary: 'Polly cooling down for 60s',
        details: 'HTTP 429',
      },
    ];

    const md = formatLogAsMarkdown(log);

    expect(md).toContain('# App audit log');
    expect(md).toContain('Total: **3**');
    expect(md).toContain('## By category');
    expect(md).toContain('narration: 1');
    expect(md).toContain('runtime: 1');
    expect(md).toContain('subsystem: 1');
    expect(md).toContain('## By kind');
    expect(md).toContain('piece-on-square: 1');
    expect(md).toContain('polly-fallback: 1');
    expect(md).toContain('### Finding 1 — [');
    expect(md).toContain('source: `move-commentary`');
    expect(md).toContain('source: `voiceService.speakPolly`');
    expect(md).toContain('FEN: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`');
  });

  it('sorts newest-first with runtime errors floated when timestamps tie', () => {
    const log: AuditEntry[] = [
      {
        timestamp: 1000,
        kind: 'piece-on-square',
        category: 'narration',
        source: 'move-commentary',
        summary: 'old narration issue',
      },
      {
        timestamp: 2000,
        kind: 'uncaught-error',
        category: 'runtime',
        source: 'window.onerror',
        summary: 'new runtime error',
      },
    ];
    const md = formatLogAsMarkdown(log);
    const oldIdx = md.indexOf('old narration issue');
    const newIdx = md.indexOf('new runtime error');
    expect(newIdx).toBeGreaterThan(-1);
    expect(oldIdx).toBeGreaterThan(-1);
    expect(newIdx).toBeLessThan(oldIdx);
  });

  it('includes per-finding category/kind header', () => {
    const log: AuditEntry[] = [
      {
        timestamp: 1,
        kind: 'bad-fen',
        category: 'subsystem',
        source: 'safeChessFromFen',
        summary: 'Invalid FEN rejected',
        fen: 'not a fen',
      },
    ];
    const md = formatLogAsMarkdown(log);
    expect(md).toContain('### Finding 1 — [subsystem/bad-fen]');
  });

  it('formats details as a fenced code block when present', () => {
    const log: AuditEntry[] = [
      {
        timestamp: 1,
        kind: 'error-boundary',
        category: 'app',
        source: 'ErrorBoundary',
        summary: 'Something exploded',
        details: 'stack trace line 1\nstack trace line 2',
      },
    ];
    const md = formatLogAsMarkdown(log);
    expect(md).toContain('```\nstack trace line 1\nstack trace line 2\n```');
  });

  it('omits optional fields cleanly', () => {
    const log: AuditEntry[] = [
      {
        timestamp: 1,
        kind: 'network-error',
        category: 'subsystem',
        source: 'fetch',
        summary: 'Request timed out',
      },
    ];
    const md = formatLogAsMarkdown(log);
    expect(md).not.toContain('FEN: `');
    expect(md).not.toContain('context: `');
    expect(md).not.toContain('route: `');
  });
});
