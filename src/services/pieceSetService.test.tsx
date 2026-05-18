import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { buildPieceRenderer } from './pieceSetService';

vi.mock('./appAuditor', () => ({
  logAppAudit: vi.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildPieceRenderer', () => {
  it('returns undefined for the default set with no filters', () => {
    expect(buildPieceRenderer('staunton')).toBeUndefined();
  });

  it('produces 12 piece renderers for a configured set', () => {
    const pieces = buildPieceRenderer('alpha');
    expect(pieces).toBeDefined();
    expect(Object.keys(pieces!)).toHaveLength(12);
  });

  it('retries once on a failed image load before logging an asset-load-error audit', async () => {
    // Audit (2026-05-18): pieces sometimes fail their first fetch on
    // cold-start (jsdelivr race / CDN throttling); retry once with a
    // cache-buster before surrendering to the alt-text fallback. The
    // audit should fire on the SECOND error, not the first.
    const auditor = await import('./appAuditor');
    const pieces = buildPieceRenderer('alpha');
    const RenderBishop = pieces!.bB;
    const { container } = render(<RenderBishop />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    // First error: should retry, NOT audit yet.
    fireEvent.error(img!);
    expect(auditor.logAppAudit).not.toHaveBeenCalled();
    expect(img!.dataset.retried).toBe('1');
    expect(img!.src).toContain('retry=');
    // Second error: now we audit + give up to alt text.
    fireEvent.error(img!);
    expect(auditor.logAppAudit).toHaveBeenCalled();
    const call = (auditor.logAppAudit as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.kind).toBe('asset-load-error');
    expect(call.summary).toContain('bB');
    expect(call.summary).toContain('alpha');
    expect(call.summary).toContain('retry exhausted');
  });
});
