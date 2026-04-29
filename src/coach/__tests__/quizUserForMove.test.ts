import { describe, it, expect, vi } from 'vitest';
import { quizUserForMoveTool } from '../tools/cerebrum/quizUserForMove';

interface ToolResult {
  ok: boolean;
  result?: { played?: string; expected?: string; stub?: boolean };
  error?: string;
}

describe('quiz_user_for_move tool', () => {
  it('rejects when expectedSan is missing', async () => {
    const r = (await quizUserForMoveTool.execute({ prompt: 'Find a move' })) as ToolResult;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/expectedSan is required/);
  });

  it('rejects when prompt is missing', async () => {
    const r = (await quizUserForMoveTool.execute({ expectedSan: 'Nf3' })) as ToolResult;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/prompt is required/);
  });

  it('graceful no-op when no callback wired (stub=true)', async () => {
    const r = (await quizUserForMoveTool.execute({
      expectedSan: 'Nf3',
      prompt: 'Find the developing move',
    })) as ToolResult;
    expect(r.ok).toBe(true);
    expect(r.result?.stub).toBe(true);
  });

  it('returns ok=true with played SAN when surface accepts', async () => {
    const cb = vi.fn().mockResolvedValue({ ok: true, played: 'Nf3' });
    const r = (await quizUserForMoveTool.execute(
      { expectedSan: 'Nf3', prompt: 'Find the developing move' },
      { onQuizUserForMove: cb },
    )) as ToolResult;
    expect(cb).toHaveBeenCalledWith({
      expectedSan: 'Nf3',
      prompt: 'Find the developing move',
      allowAlternatives: [],
    });
    expect(r.ok).toBe(true);
    expect(r.result?.played).toBe('Nf3');
    expect(r.result?.expected).toBe('Nf3');
  });

  it('returns ok=false with played + expected when surface rejects', async () => {
    const cb = vi.fn().mockResolvedValue({ ok: false, played: 'a3', expected: 'Nf3' });
    const r = (await quizUserForMoveTool.execute(
      { expectedSan: 'Nf3', prompt: 'Find the developing move' },
      { onQuizUserForMove: cb },
    )) as ToolResult;
    expect(r.ok).toBe(false);
    expect(r.result?.played).toBe('a3');
    expect(r.result?.expected).toBe('Nf3');
  });

  it('parses comma-separated allowAlternatives', async () => {
    const cb = vi.fn().mockResolvedValue({ ok: true, played: 'Nc3' });
    await quizUserForMoveTool.execute(
      {
        expectedSan: 'Nf3',
        prompt: 'Find a developing move',
        allowAlternatives: 'Nc3, Bc4 , g3',
      },
      { onQuizUserForMove: cb },
    );
    expect(cb).toHaveBeenCalledWith({
      expectedSan: 'Nf3',
      prompt: 'Find a developing move',
      allowAlternatives: ['Nc3', 'Bc4', 'g3'],
    });
  });
});
