import { Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../stores/appStore';
import { voiceService } from '../../services/voiceService';

export function CoachOverlay(): JSX.Element {
  const bubbleVisible = useAppStore((s) => s.coachBubbleVisible);
  const bubbleText = useAppStore((s) => s.coachBubbleText);
  const voiceOn = useAppStore((s) => s.coachVoiceOn);
  const toggleBubble = useAppStore((s) => s.toggleCoachBubble);
  const toggleVoice = useAppStore((s) => s.toggleCoachVoice);

  const handleToggleVoice = (): void => {
    if (voiceOn) {
      voiceService.stop();
    }
    toggleVoice();
  };

  return (
    <div className="flex items-start gap-2 justify-end" data-testid="coach-overlay">
      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        {bubbleVisible && bubbleText.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: 10 }}
            transition={{ duration: 0.15 }}
            className="relative max-w-xs rounded-xl px-4 py-3 border shadow-lg"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
            data-testid="coach-bubble"
          >
            {/* Bubble tail pointing right toward toggle */}
            <div
              className="absolute top-3 -right-2 w-0 h-0"
              style={{
                borderTop: '6px solid transparent',
                borderBottom: '6px solid transparent',
                borderLeft: '8px solid var(--color-surface)',
              }}
            />
            <p className="text-xl leading-relaxed font-medium">{bubbleText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble toggle */}
      <button
        onClick={toggleBubble}
        className="flex-shrink-0 p-2 rounded-lg border transition-colors cursor-pointer hover:opacity-90"
        style={{
          background: bubbleVisible ? 'var(--color-accent)' : 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: bubbleVisible ? 'var(--color-bg)' : 'var(--color-text-muted)',
        }}
        aria-label={bubbleVisible ? 'Hide speech bubble' : 'Show speech bubble'}
        data-testid="coach-avatar-toggle"
      >
        💬
      </button>

      {/* Speaker button */}
      <button
        onClick={handleToggleVoice}
        className="flex-shrink-0 p-2 rounded-lg border transition-colors"
        style={{
          background: voiceOn ? 'var(--color-accent)' : 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: voiceOn ? 'var(--color-bg)' : 'var(--color-text-muted)',
        }}
        aria-label={voiceOn ? 'Mute voice' : 'Unmute voice'}
        data-testid="coach-speaker-toggle"
      >
        {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
    </div>
  );
}
