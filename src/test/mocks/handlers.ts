import { http, HttpResponse } from 'msw';

export const handlers = [
  // Lichess API
  http.get('https://lichess.org/api/games/user/:username', () => {
    return HttpResponse.text('[Event "Rated Blitz game"]\n[Site "lichess.org"]\n[Date "2024.01.01"]\n[White "Player1"]\n[Black "Player2"]\n[Result "1-0"]\n\n1.e4 e5 2.Nc3 1-0\n\n');
  }),

  // Chess.com API
  http.get('https://api.chess.com/pub/player/:username/games/:year/:month', () => {
    return HttpResponse.json({
      games: [],
    });
  }),

  // Anthropic Claude API
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      id: 'msg_mock',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: "Great move! You're developing your pieces actively." }],
      model: 'claude-haiku-4-5-20251001',
      stop_reason: 'end_turn',
      usage: { input_tokens: 100, output_tokens: 20 },
    });
  }),
];
