import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { createElement } from 'react';
import {
  championBoardPieceUrl,
  championHeroPieceUrl,
  CHAMPION_PIECE_KEYS,
  CHAMPION_USE_CUSTOM_IMAGES,
} from './championPieceSet';

describe('championPieceSet', () => {
  it('builds board + hero URLs from the public paths', () => {
    expect(championBoardPieceUrl('wN')).toBe('/pieces/champion-board/wN.png');
    expect(championHeroPieceUrl('bK')).toBe('/pieces/champion-hero/bK.png');
  });

  it('lists exactly the 12 piece keys react-chessboard expects', () => {
    expect(CHAMPION_PIECE_KEYS).toHaveLength(12);
    expect(CHAMPION_PIECE_KEYS).toContain('wK');
    expect(CHAMPION_PIECE_KEYS).toContain('bP');
  });

  it('ships with custom images OFF until the real renders are committed', () => {
    // Guards against accidentally enabling the loader before art exists
    // (every piece would 404 to the tinted fallback). Flip intentionally.
    expect(CHAMPION_USE_CUSTOM_IMAGES).toBe(false);
  });
});

describe('buildChampionImagePieces (custom-image path)', () => {
  afterEach(() => {
    vi.doUnmock('./championPieceSet');
    vi.doUnmock('./appAuditor');
    vi.resetModules();
  });

  it('serves the custom render, falling back to the tinted glyph on error', async () => {
    // Enable the custom-image flag in isolation so we exercise the loader
    // path without flipping the shipped default.
    vi.resetModules();
    vi.doMock('./championPieceSet', async () => {
      const actual = await vi.importActual<typeof import('./championPieceSet')>('./championPieceSet');
      return { ...actual, CHAMPION_USE_CUSTOM_IMAGES: true };
    });
    vi.doMock('./appAuditor', () => ({ logAppAudit: vi.fn(() => Promise.resolve()) }));

    const { buildPieceRenderer } = await import('./pieceSetService');
    const pieces = buildPieceRenderer('gold');
    expect(pieces).toBeDefined();
    expect(Object.keys(pieces!)).toHaveLength(12);

    const { container } = render(createElement(pieces!.wN, {}));
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    // Primary source = the custom render.
    expect(img!.src).toContain('/pieces/champion-board/wN.png');
    // On a missing render, fall back to the gold-tinted cburnett glyph.
    fireEvent.error(img!);
    expect(img!.src).toContain('cburnett/wN.svg');
    expect(img!.style.filter).toContain('sepia');
  });
});
