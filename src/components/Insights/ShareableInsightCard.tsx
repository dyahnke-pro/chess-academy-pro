import { useRef, useState, useCallback } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import type { ShareableInsight } from '../../services/shareableInsightsService';

/**
 * ShareableInsightCard — renders one headline-worthy stat in a
 * polished, screenshot-friendly layout. Pressing Share captures the
 * card as a PNG and opens the native share sheet so the user can
 * post it to X, Reddit, iMessage, Discord, whatever.
 *
 * This is the launch growth lever. Each user's card is unique to
 * their game history, which makes it genuinely share-worthy — not
 * generic marketing.
 *
 * Export layout is intentionally standalone (square, strong branding,
 * punchy copy): works equally well as an X image, a Reddit post
 * preview, or an Instagram story.
 */

interface ShareableInsightCardProps {
  insight: ShareableInsight;
}

export function ShareableInsightCard({ insight }: ShareableInsightCardProps): JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    if (!cardRef.current || sharing) return;
    setSharing(true);

    try {
      // html2canvas is dynamically imported so it doesn't bloat the
      // initial bundle — most users never share, and 48KB only
      // matters on first share.
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        logging: false,
        useCORS: true,
        backgroundColor: null,
        scale: 2, // 2x for crisp share images on retina
      });
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png', 0.95);
      });
      if (!blob) {
        setSharing(false);
        return;
      }

      const file = new File([blob], 'chess-academy-insight.png', { type: 'image/png' });
      const shareText = `${insight.emoji ? `${insight.emoji} ` : ''}${insight.headline}\n\n${insight.detail}\n\nFrom Chess Academy Pro — an AI coach that watches your games. Try it: chessacademy.pro/landing`;

      // Prefer native share sheet so the PNG attaches on mobile.
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: insight.headline,
            text: shareText,
            files: [file],
          });
          setSharing(false);
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            // User cancelled the share sheet — not an error.
            setSharing(false);
            return;
          }
          // Fall through to download.
        }
      }

      // Fallback: download the PNG so the user can attach it wherever
      // they want. Open a blank share-intent URL isn't useful without
      // the image, so just download.
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'chess-academy-insight.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('[ShareableInsightCard] share failed:', err);
    } finally {
      setSharing(false);
    }
  }, [insight, sharing]);

  const toneAccent = toneToAccent(insight.tone);

  return (
    <div className="flex flex-col gap-2" data-testid={`shareable-insight-${insight.id}`}>
      {/* The card that gets screenshot. Styled to look good both in-app
          AND as a standalone image. */}
      <div
        ref={cardRef}
        className="relative rounded-2xl p-6 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${toneAccent.bg1} 0%, ${toneAccent.bg2} 100%)`,
          border: `1px solid ${toneAccent.border}`,
          minHeight: 200,
        }}
      >
        {/* Brand mark — small, top-right, always present in share */}
        <div
          className="absolute top-3 right-4 text-[10px] font-bold tracking-wider uppercase opacity-80"
          style={{ color: '#fff' }}
        >
          Chess Academy Pro
        </div>

        {insight.emoji && (
          <div className="text-3xl mb-3" aria-hidden>
            {insight.emoji}
          </div>
        )}
        <div className="text-2xl font-bold leading-tight mb-2" style={{ color: '#fff' }}>
          {insight.headline}
        </div>
        <div className="text-sm leading-relaxed" style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
          {insight.detail}
        </div>

        {insight.stats && insight.stats.length > 0 && (
          <div className="flex gap-6 mt-4">
            {insight.stats.map((s) => (
              <div key={s.label}>
                <div className="text-xs opacity-75 uppercase tracking-wide" style={{ color: '#fff' }}>
                  {s.label}
                </div>
                <div className="text-lg font-bold" style={{ color: '#fff' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share button lives outside the card so it doesn't appear in
          the screenshot. */}
      <button
        onClick={() => { void handleShare(); }}
        disabled={sharing}
        className="self-start flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
        }}
        data-testid={`shareable-insight-share-${insight.id}`}
        aria-label={`Share: ${insight.headline}`}
      >
        {sharing ? (
          <>
            <Loader2 size={12} className="animate-spin" /> Generating…
          </>
        ) : (
          <>
            <Share2 size={12} /> Share
          </>
        )}
      </button>
    </div>
  );
}

interface ToneAccent {
  bg1: string;
  bg2: string;
  border: string;
}

function toneToAccent(tone: ShareableInsight['tone']): ToneAccent {
  switch (tone) {
    case 'achievement':
      // Warm gold → orange gradient
      return {
        bg1: 'rgb(234, 179, 8)',
        bg2: 'rgb(234, 88, 12)',
        border: 'rgba(234, 179, 8, 0.4)',
      };
    case 'strength':
      // Emerald gradient
      return {
        bg1: 'rgb(16, 185, 129)',
        bg2: 'rgb(5, 150, 105)',
        border: 'rgba(16, 185, 129, 0.4)',
      };
    case 'weakness':
      // Rose gradient — softer red so it doesn't read like "error"
      return {
        bg1: 'rgb(244, 63, 94)',
        bg2: 'rgb(225, 29, 72)',
        border: 'rgba(244, 63, 94, 0.4)',
      };
    case 'pattern':
      // Purple gradient
      return {
        bg1: 'rgb(139, 92, 246)',
        bg2: 'rgb(109, 40, 217)',
        border: 'rgba(139, 92, 246, 0.4)',
      };
    case 'neutral':
    default:
      // Slate gradient
      return {
        bg1: 'rgb(71, 85, 105)',
        bg2: 'rgb(51, 65, 85)',
        border: 'rgba(71, 85, 105, 0.4)',
      };
  }
}
