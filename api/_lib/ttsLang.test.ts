import { describe, it, expect } from 'vitest';
import { detectVoiceForText, LANG_VOICES } from './ttsLang';

describe('detectVoiceForText', () => {
  it('returns null for English (keep the requested English voice)', () => {
    expect(detectVoiceForText('Why is it important to control the center of the board in chess?')).toBeNull();
    expect(detectVoiceForText('Great question. Knights love the center — from e4 a knight reaches eight squares.')).toBeNull();
    expect(detectVoiceForText('')).toBeNull();
  });

  it('detects non-Latin scripts by Unicode range (definitive)', () => {
    expect(detectVoiceForText('Почему важно контролировать центр доски?')).toBe(LANG_VOICES.ru);
    expect(detectVoiceForText('チェスで盤の中央を支配することがなぜ重要なのですか？')).toBe(LANG_VOICES.ja);
    expect(detectVoiceForText('在国际象棋中，为什么控制棋盘中心很重要？')).toBe(LANG_VOICES.zh);
    expect(detectVoiceForText('لماذا من المهم السيطرة على مركز الرقعة في الشطرنج؟')).toBe(LANG_VOICES.ar);
    expect(detectVoiceForText('शतरंज में बोर्ड के केंद्र को नियंत्रित करना क्यों महत्वपूर्ण है?')).toBe(LANG_VOICES.hi);
    expect(detectVoiceForText('체스에서 보드의 중앙을 통제하는 것이 왜 중요한가요?')).toBe(LANG_VOICES.ko);
  });

  it('Japanese kana wins over shared Han characters', () => {
    // Contains Han (中央/支配) + kana (を/する) → must be Japanese, not Chinese.
    expect(detectVoiceForText('中央を支配することが大切です')).toBe(LANG_VOICES.ja);
  });

  it('detects Latin-script languages by stopwords + diacritics', () => {
    expect(detectVoiceForText('¿Por qué es importante controlar el centro del tablero en el ajedrez?')).toBe(LANG_VOICES.es);
    expect(detectVoiceForText("Pourquoi est-il important de contrôler le centre de l'échiquier aux échecs ?")).toBe(LANG_VOICES.fr);
    expect(detectVoiceForText('Warum ist es wichtig, das Zentrum des Schachbretts zu kontrollieren?')).toBe(LANG_VOICES.de);
    expect(detectVoiceForText('Por que é importante controlar o centro do tabuleiro no xadrez?')).toBe(LANG_VOICES.pt);
    expect(detectVoiceForText('Perché è importante controllare il centro della scacchiera negli scacchi?')).toBe(LANG_VOICES.it);
  });

  it('a stray foreign word does not flip an otherwise-English passage', () => {
    // One borrowed word shouldn't clear the >1 threshold.
    expect(detectVoiceForText('The en passant capture is a special pawn move in chess.')).toBeNull();
    expect(detectVoiceForText('That was a blunder — you dropped the queen.')).toBeNull();
  });

  it('every mapped voice carries a locale + a supported engine', () => {
    for (const v of Object.values(LANG_VOICES)) {
      expect(v.voiceId).toBeTruthy();
      expect(v.languageCode).toBeTruthy();
      expect(['neural', 'standard', 'generative']).toContain(v.engine);
    }
  });
});
