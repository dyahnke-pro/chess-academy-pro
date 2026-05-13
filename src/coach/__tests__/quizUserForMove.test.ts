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

  it('returns ok=false with an explanatory error when no callback is wired', async () => {
    // Previous behavior was ok=true + stub=true, but the old stub path
    // was misleading the brain into thinking it had quizzed the student
    // on surfaces with no quiz UI (build 26bbad4 audit). The tool now
    // surfaces a hard failure with a message the brain can act on.
    const r = (await quizUserForMoveTool.execute({
      expectedSan: 'Nf3',
      prompt: 'Find the developing move',
    })) as ToolResult;
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not supported on this surface/);
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
