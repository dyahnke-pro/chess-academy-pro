/**
 * MOVES IN A TRANSLATED ANSWER ARE IN THE STUDENT'S LANGUAGE OR IN NOTATION —
 * NEVER ENGLISH WORDS (chat-surfaces audit 2026-11-06: "¿cuál es la mejor
 * jugada aquí?" was answered "Su respuesta más fuerte es bishop to b6 (Bb6)").
 * The beginner register wrote English move words over the bubble AFTER the
 * translation door; now the words are written on the English source inside
 * the door, so the translation carries them, and text already in another
 * language keeps its moves in notation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const translateCalls: string[] = [];
vi.mock('../../services/coachApi', () => ({
  voiceFacts: vi.fn(async (text: string) => {
    translateCalls.push(text);
    return /bishop to b6/.test(text) ? 'Su respuesta más fuerte es alfil a b6 (Bb6).' : 'Su respuesta más fuerte es Bb6.';
  }),
}));

import { ChatMessage } from './ChatMessage';
import { noteTurnLanguage, resetDetectedLanguage } from '../../services/spokenLanguage';

const show = (content: string): void => {
  render(<MemoryRouter><ChatMessage message={{ id: `m-${content.length}`, role: 'assistant', content, timestamp: 0 }} /></MemoryRouter>);
};

beforeEach(() => { translateCalls.length = 0; noteTurnLanguage('Spanish'); });
afterEach(() => { resetDetectedLanguage(); });

describe('the beginner register in a Spanish conversation', () => {
  it('the app\'s English answer is given move words BEFORE it is translated', async () => {
    show('Their strongest reply is Bb6.');
    expect(await screen.findByText('Su respuesta más fuerte es alfil a b6 (Bb6).')).toBeInTheDocument();
    expect(translateCalls).toEqual(['Their strongest reply is bishop to b6 (Bb6).']);
    expect(document.body.textContent).not.toMatch(/bishop to/);
  });

  it('an answer already in Spanish keeps its moves in notation', () => {
    show('La mejor jugada aquí es Bb6, que desarrolla el alfil.');
    expect(screen.getByText('La mejor jugada aquí es Bb6, que desarrolla el alfil.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/bishop to/);
    expect(translateCalls).toEqual([]);
  });

  it('in an English conversation the words are still written', () => {
    resetDetectedLanguage();
    show('Their strongest reply is Bb6.');
    expect(screen.getByText('Their strongest reply is bishop to b6 (Bb6).')).toBeInTheDocument();
  });
});
