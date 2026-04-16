import { useState, useCallback } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { generateSidelineExplanation } from '../../services/contentGenerationService';
import type { OpeningRecord, OpeningVariation } from '../../types';

interface SidelineExplainerProps {
  opening: OpeningRecord;
  variation: OpeningVariation;
  fen: string;
}

export function SidelineExplainer({
  opening,
  variation,
  fen,
}: SidelineExplainerProps): JSX.Element {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExplain = useCallback(async (): Promise<void> => {
    if (explanation) {
      setExplanation(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generateSidelineExplanation(
        opening,
        variation.pgn,
        variation.name,
        fen,
      );
      // Non-empty result — including the offline fallback string — is
      // a success. Showing "Try again later" when the service actually
      // returned fallback text was the root cause of the button
      // appearing broken.
      if (result && result.trim().length > 0) {
        setExplanation(result);
      } else {
        setError('AI coach is offline. Add an API key in Settings → Coach to enable explanations.');
      }
    } catch (err: unknown) {
      console.warn('[SidelineExplainer] failed:', err);
      setError('Could not generate explanation. Check Settings → Coach for API key status.');
    } finally {
      setLoading(false);
    }
  }, [opening, variation, fen, explanation]);

  return (
    <div className="inline-flex flex-col" data-testid="sideline-explainer">
      <button
        onClick={() => void handleExplain()}
        disabled={loading}
        className="p-1.5 rounded-lg hover:bg-purple-500/20 text-theme-text-muted hover:text-purple-400 transition-colors disabled:opacity-50"
        aria-label={explanation ? 'Close explanation' : `Explain ${variation.name}`}
        title={explanation ? 'Close' : 'AI Explain'}
        data-testid="sideline-explain-btn"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin text-purple-400" />
        ) : explanation ? (
          <X size={16} />
        ) : (
          <Sparkles size={16} />
        )}
      </button>
      {explanation && (
        <div className="mt-2 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-sm text-theme-text leading-relaxed" data-testid="sideline-explanation">
          {explanation}
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-400" data-testid="sideline-error">{error}</p>
      )}
    </div>
  );
}
