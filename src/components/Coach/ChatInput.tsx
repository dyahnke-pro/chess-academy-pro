import { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { voiceInputService } from '../../services/voiceInputService';
import { voiceService } from '../../services/voiceService';
import { useAppStore } from '../../stores/appStore';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

interface ChatInputProps {
  onSend: (text: string, modality?: 'voice' | 'text') => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps): JSX.Element {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const voiceSupported = voiceInputService.isSupported();
  const prefersReducedMotion = usePrefersReducedMotion();

  // Auto-focus the textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Keep a ref to onSend so the voice handler subscription doesn't
  // re-register on every parent render (which creates a window where
  // both the OLD and NEW handler receive a final transcript and
  // double-send the message).
  const onSendRef = useRef(onSend);
  useEffect(() => { onSendRef.current = onSend; }, [onSend]);

  useEffect(() => {
    const unsubscribe = voiceInputService.onResult((transcript) => {
      const trimmed = transcript.trim();
      if (!trimmed) return;
      // Voice turns auto-send with modality='voice' so the assistant
      // reply plays as TTS only — no text bubble. The input field
      // stays empty (no appending) so the user can keep talking.
      onSendRef.current(trimmed, 'voice');
    });
    return unsubscribe;
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, 'text');
    setText('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    // Re-focus input after sending
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [text, disabled, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleVoice = useCallback(() => {
    if (listening) {
      voiceInputService.stopListening();
      setListening(false);
    } else {
      // Pre-warm mic so first-tap reliably starts (fixes the
      // "press twice" bug).
      void voiceInputService.prewarmMic();
      // Mic on = voice narration on (implicit). Student enabling the
      // mic is implicitly opting into a spoken conversation, so flip
      // the per-move / reply TTS flag on too. Left on when they later
      // stop the mic — explicit voice-off button still overrides.
      if (!useAppStore.getState().coachVoiceOn) {
        useAppStore.getState().setCoachVoiceOn(true);
      }
      const started = voiceInputService.startListening({
        // Student starts talking → coach stops mid-sentence. Trainer
        // feel: never talked over.
        onSpeechStart: () => voiceService.stop(),
      });
      setListening(started);
    }
  }, [listening]);

  // Auto-resize textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  const handleSubmit = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    handleSend();
  }, [handleSend]);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 p-3 border-t border-theme-border bg-theme-bg"
      data-testid="chat-input"
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? 'Type a message...'}
        disabled={disabled}
        rows={1}
        enterKeyHint="send"
        className="flex-1 resize-none rounded-xl border border-theme-border bg-theme-surface px-4 py-2.5 text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-accent disabled:opacity-50 min-h-[40px] max-h-[200px]"
        data-testid="chat-text-input"
      />

      {voiceSupported && (
        <motion.button
          onClick={handleVoice}
          disabled={disabled}
          // min-h/w 44px = WCAG AA tap target minimum
          className={`min-h-[44px] min-w-[44px] p-3 rounded-xl border transition-colors flex items-center justify-center ${
            listening
              ? 'border-red-500 bg-red-500/10 text-red-500'
              : 'border-theme-border text-theme-text-muted hover:text-theme-text'
          } disabled:opacity-50`}
          animate={listening && !prefersReducedMotion ? { scale: [1, 1.1, 1] } : { scale: 1 }}
          transition={listening && !prefersReducedMotion ? { duration: 1, repeat: Infinity } : {}}
          data-testid="voice-input-btn"
        >
          {listening ? <MicOff size={18} /> : <Mic size={18} />}
        </motion.button>
      )}

      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="p-2.5 rounded-xl bg-theme-accent text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
        data-testid="chat-send-btn"
      >
        <Send size={18} />
      </button>
    </form>
  );
}
