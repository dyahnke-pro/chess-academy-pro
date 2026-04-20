import { describe, it, expect } from 'vitest';
import { formatLogAsMarkdown } from './NarrationAuditPanel';
import type { AuditLogEntry } from '../../services/narrationAuditor';

/**
 * `formatLogAsMarkdown` is the bridge between the runtime auditor and
 * a Claude Code session: the user taps "Copy for Claude" and pastes
 * the output into a new session. The format needs to be stable and
 * self-contained so Claude can act on findings without extra context.
 */
describe('formatLogAsMarkdown', () => {
  it('returns an empty-state message for an empty log', () => {
    expect(formatLogAsMarkdown([])).toContain('_No findings._');
  });

  it('includes header, summary, and findings for a populated log', () => {
    const log: AuditLogEntry[] = [
      {
        timestamp: 1_700_000_000_000,
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        context: 'move-commentary',
        flags: [
          {
            kind: 'piece-on-square',
            narrationExcerpt: 'the queen on f3',
            explanation: 'claims queen on f3, but f3 is empty',
          },
        ],
      },
      {
        timestamp: 1_700_000_100_000,
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        context: 'coach-chat',
        flags: [
          {
            kind: 'check-claim',
            narrationExcerpt: 'check claim',
            explanation: 'narration references a check but the position is not in check',
          },
          {
            kind: 'illegal-san',
            narrationExcerpt: 'Qh8',
            explanation: 'narration references Qh8 but it is not a legal move in this position',
          },
        ],
      },
    ];

    const md = formatLogAsMarkdown(log);

    // Title + count
    expect(md).toContain('# Narration audit log');
    expect(md).toContain('Total: **2**');
    // By-kind summary — sorted descending by count, ties stable
    expect(md).toMatch(/By kind[\s\S]+piece-on-square: 1[\s\S]+check-claim: 1[\s\S]+illegal-san: 1/);
    // Individual findings
    expect(md).toContain('### Finding 1');
    expect(md).toContain('### Finding 2');
    // Each block has timestamp, context, FEN
    expect(md).toContain('context: `coach-chat`');
    expect(md).toContain('context: `move-commentary`');
    expect(md).toContain('FEN: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`');
    // Flag labels and excerpts are present
    expect(md).toContain('**[piece-on-square]**');
    expect(md).toContain('**[illegal-san]**');
    expect(md).toContain('excerpt: "the queen on f3"');
    expect(md).toContain('excerpt: "Qh8"');
  });

  it('uses most-recent-first ordering in findings section', () => {
    const log: AuditLogEntry[] = [
      {
        timestamp: 1_000,
        fen: 'fen-old',
        context: 'move-commentary',
        flags: [{ kind: 'piece-on-square', narrationExcerpt: 'old', explanation: 'old' }],
      },
      {
        timestamp: 2_000,
        fen: 'fen-new',
        context: 'coach-chat',
        flags: [{ kind: 'illegal-san', narrationExcerpt: 'new', explanation: 'new' }],
      },
    ];
    const md = formatLogAsMarkdown(log);
    const oldIdx = md.indexOf('fen-old');
    const newIdx = md.indexOf('fen-new');
    expect(newIdx).toBeGreaterThan(-1);
    expect(oldIdx).toBeGreaterThan(-1);
    expect(newIdx).toBeLessThan(oldIdx);
  });

  it('skips the excerpt line when it equals the kind', () => {
    const log: AuditLogEntry[] = [
      {
        timestamp: 1,
        fen: 'fen',
        context: 'move-commentary',
        flags: [{
          kind: 'check-claim',
          narrationExcerpt: 'check-claim',
          explanation: 'claims check but position is not in check',
        }],
      },
    ];
    const md = formatLogAsMarkdown(log);
    expect(md).not.toContain('excerpt:');
  });

  it('handles missing context gracefully', () => {
    const log: AuditLogEntry[] = [
      {
        timestamp: 1,
        fen: 'fen',
        flags: [{ kind: 'piece-on-square', narrationExcerpt: 'x', explanation: 'y' }],
      },
    ];
    const md = formatLogAsMarkdown(log);
    expect(md).toContain('context: `(no context)`');
  });
});
