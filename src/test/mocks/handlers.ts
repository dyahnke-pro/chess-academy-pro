import { http, HttpResponse } from 'msw';

export const handlers = [
  // Lichess API
  http.get('https://lichess.org/api/games/user/:username', () => {
    return HttpResponse.text('[Event "Rated Blitz game"]\n[Site "lichess.org"]\n[Date "2024.01.01"]\n[White "Player1"]\n[Black "Player2"]\n[Result "1-0"]\n\n1.e4 e5 2.Nc3 1-0\n\n');
  }),

  // Chess.com API — archives list
  http.get('https://api.chess.com/pub/player/:username/games/archives', () => {
    return HttpResponse.json({
      archives: [],
    });
  }),

  // Chess.com API — monthly games
  http.get('https://api.chess.com/pub/player/:username/games/:year/:month', () => {
    return HttpResponse.json({
      games: [],
    });
  }),

  // Chess.com API — player stats
  http.get('https://api.chess.com/pub/player/:username/stats', () => {
    return HttpResponse.json({});
  }),

  // Lichess API — user profile/stats
  http.get('https://lichess.org/api/user/:username', () => {
    return HttpResponse.json({
      username: 'testuser',
      perfs: {},
    });
  }),

  // Lichess Opening Explorer — Lichess database
  http.get('https://explorer.lichess.ovh/lichess', () => {
    return HttpResponse.json({
      white: 4200,
      draws: 1800,
      black: 4000,
      moves: [
        { uci: 'e2e4', san: 'e4', averageRating: 1850, white: 2100, draws: 900, black: 2000, game: null },
        { uci: 'd2d4', san: 'd4', averageRating: 1820, white: 1400, draws: 600, black: 1200, game: null },
      ],
      topGames: [],
      opening: { eco: 'A00', name: 'Starting Position' },
    });
  }),

  // Lichess Opening Explorer — Masters database
  http.get('https://explorer.lichess.ovh/masters', () => {
    return HttpResponse.json({
      white: 800,
      draws: 600,
      black: 600,
      moves: [
        { uci: 'e2e4', san: 'e4', averageRating: 2650, white: 400, draws: 300, black: 300, game: null },
      ],
      topGames: [],
      opening: { eco: 'A00', name: 'Starting Position' },
    });
  }),

  // Lichess Cloud Eval
  http.get('https://lichess.org/api/cloud-eval', () => {
    return HttpResponse.json({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      knodes: 2547,
      depth: 40,
      pvs: [
        { moves: 'e2e4 e7e5 g1f3', cp: 28 },
        { moves: 'd2d4 d7d5 c2c4', cp: 14 },
        { moves: 'g1f3 d7d5 d2d4', cp: 12 },
      ],
    });
  }),

  // Lichess Puzzle Activity (NDJSON)
  http.get('https://lichess.org/api/puzzle/activity', () => {
    return HttpResponse.text(
      JSON.stringify({ date: 1700000000000, puzzleId: 'puz001', win: true }) + '\n' +
      JSON.stringify({ date: 1700000100000, puzzleId: 'puz002', win: false }) + '\n',
    );
  }),

  // Lichess Puzzle Dashboard
  http.get('https://lichess.org/api/puzzle/dashboard/:days', () => {
    return HttpResponse.json({
      days: 30,
      global: { firstWins: 42, replayWins: 12, nb: 60 },
      themes: {
        fork: { results: { firstWins: 8, replayWins: 2, nb: 10 } },
        pin: { results: { firstWins: 3, replayWins: 1, nb: 8 } },
        mateIn2: { results: { firstWins: 5, replayWins: 2, nb: 7 } },
      },
    });
  }),

  // DeepSeek API — chat completions
  http.post('https://api.deepseek.com/chat/completions', ({ request }) => {
    const url = new URL(request.url);
    const isStream = url.searchParams.get('stream') === 'true';

    if (isStream) {
      return HttpResponse.text(
        'data: {"choices":[{"delta":{"content":"Great move!"}}]}\n\n',
        { headers: { 'Content-Type': 'text/event-stream' } },
      );
    }

    return HttpResponse.json({
      id: 'chatcmpl-mock',
      object: 'chat.completion',
      choices: [{ message: { role: 'assistant', content: "Great move! You're developing your pieces actively." } }],
      model: 'deepseek-chat',
      usage: { prompt_tokens: 100, completion_tokens: 20 },
    });
  }),

  // Anthropic Claude API — messages
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

  // ElevenLabs TTS API
  http.post('https://api.elevenlabs.io/v1/text-to-speech/:voiceId', () => {
    // Return a fake audio ArrayBuffer (44 bytes WAV header)
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    // RIFF header
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36, true);          // file size - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"
    return HttpResponse.arrayBuffer(buffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  }),

  // ElevenLabs TTS streaming
  http.post('https://api.elevenlabs.io/v1/text-to-speech/:voiceId/stream', () => {
    const buffer = new ArrayBuffer(44);
    return HttpResponse.arrayBuffer(buffer, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
  }),

  // Supabase Storage — list objects
  http.get('https://:project.supabase.co/storage/v1/object/list/:bucket', () => {
    return HttpResponse.json([
      {
        name: 'backup-2024-01-01.json',
        id: 'file_1',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        metadata: { size: 1024 },
      },
    ]);
  }),

  // Supabase Storage — upload
  http.post('https://:project.supabase.co/storage/v1/object/:bucket/*', () => {
    return HttpResponse.json({ Key: 'backups/backup.json' });
  }),

  // Supabase Storage — download
  http.get('https://:project.supabase.co/storage/v1/object/:bucket/*', () => {
    return HttpResponse.json({
      profiles: [],
      sessions: [],
      openings: [],
      flashcards: [],
    });
  }),
];
