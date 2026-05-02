// VoiceDebugPanel — a fixed-position diagnostic overlay that shows the
// current voice tier, last Polly response status, audio context state,
// and the most recent text passed to voiceService.speak(). Mounted in
// WalkthroughMode when the URL has `?debug=1` (or hostname matches a
// non-production preview deploy by default). Polls voiceService every
// 500ms; intentionally minimal styling.
import { useEffect, useState } from 'react';
import { voiceService } from '../../services/voiceService';

export function VoiceDebugPanel(): JSX.Element | null {
  const [snap, setSnap] = useState(() => voiceService.getLastSpeakDiagnostic());

  useEffect(() => {
    const id = setInterval(() => {
      setSnap(voiceService.getLastSpeakDiagnostic());
    }, 500);
    return () => clearInterval(id);
  }, []);

  const tierColor: Record<string, string> = {
    polly: 'text-emerald-400',
    'voice-pack': 'text-emerald-400',
    'web-speech': 'text-amber-400',
    muted: 'text-rose-400',
  };

  return (
    <div
      className="fixed bottom-2 left-2 z-50 max-w-xs rounded-md bg-black/85 p-2 text-[10px] font-mono leading-tight text-neutral-200 shadow-lg"
      style={{ pointerEvents: 'none' }}
      data-testid="voice-debug-panel"
    >
      <div className="mb-1 font-bold text-emerald-300">VOICE DEBUG</div>
      <div>tier: <span className={tierColor[snap.tier] ?? 'text-neutral-300'}>{snap.tier}</span></div>
      <div>polly: {snap.pollyAttempted ? `${snap.pollyOk ? 'OK' : 'FAIL'} (${snap.pollyStatus ?? '—'})` : 'not attempted'}</div>
      <div>audioCtx: {snap.audioContextState}</div>
      <div className="mt-1 text-neutral-400">
        text: {snap.text ? `"${snap.text}…"` : '(none)'}
      </div>
      {snap.error && (
        <div className="mt-1 text-rose-300">err: {snap.error.slice(0, 100)}</div>
      )}
      <div className="mt-1 text-neutral-500">
        origin: {typeof window !== 'undefined' ? window.location.host : '—'}
      </div>
      <div className="text-neutral-500">
        last: {snap.timestamp ? `${Math.round((Date.now() - snap.timestamp) / 100) / 10}s ago` : '—'}
      </div>
    </div>
  );
}
