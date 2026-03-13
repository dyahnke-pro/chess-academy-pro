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
