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

  it('retries on a different CDN on first image load failure before auditing', async () => {
    // Audit (2026-05-27/28): 48 asset-load-errors on the jsdelivr
    // primary in a single 48h window. Previously we retried with a
    // cache-bust query on the SAME CDN, which defeated jsdelivr's
    // edge cache and re-cold-fetched the very CDN that just failed.
    // The retry now switches to raw.githack.com (different infra)
    // so a regional jsdelivr issue doesn't take rendering down.
    const auditor = await import('./appAuditor');
    const pieces = buildPieceRenderer('alpha');
    const RenderBishop = pieces!.bB;
    const { container } = render(<RenderBishop />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    // First error: should retry on the fallback CDN, NOT audit yet.
    fireEvent.error(img!);
    expect(auditor.logAppAudit).not.toHaveBeenCalled();
    expect(img!.dataset.retried).toBe('1');
    expect(img!.src).toContain('raw.githack.com');
    expect(img!.src).toContain('alpha/bB.svg');
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
