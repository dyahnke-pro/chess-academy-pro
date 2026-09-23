import { describe, it, expect, vi } from 'vitest';

vi.mock('./coachApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./coachApi')>()),
  voiceFacts: async (): Promise<string | null> => null,
}));

describe('the recap states the swing from the student\'s side (walk 5, R14)', () => {
  it('a Black student\'s losing move reads negative, not "+0.6 to +3.7"', { timeout: 30_000 }, async () => {
    const { generateNarrativeSummary } = await import('./coachFeatureService');
    const sans = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'Qa5'];
    const moveData = sans.map((san, i) => ({
      moveNumber: i + 1, san, commentary: '', bestMove: null, isCoachMove: false,
      classification: i === 9 ? 'blunder' : 'good',
      evaluation: i === 9 ? 370 : 60,
    }));
    const out = await generateNarrativeSummary(sans.join(' '), 'black', 'Sicilian Defense', '1-0', 1500, undefined, moveData, 'full');
    expect(out).toMatch(/from -0\.6 to -3\.7, counted from your side/);
    expect(out).not.toMatch(/\+3\.7/);
  });
});
