import { useState, useCallback } from 'react';
import { Flag, Check, X } from 'lucide-react';

interface ResignButtonProps {
  onResign: () => void;
  disabled?: boolean;
  /** The board bar's extras row: one small line on a phone. */
  compact?: boolean;
}

export function ResignButton({ onResign, disabled = false, compact = false }: ResignButtonProps): JSX.Element {
  const [confirming, setConfirming] = useState(false);

  const handleClick = useCallback(() => {
    if (confirming) return;
    setConfirming(true);
  }, [confirming]);

  const handleConfirm = useCallback(() => {
    setConfirming(false);
    onResign();
  }, [onResign]);

  const handleCancel = useCallback(() => {
    setConfirming(false);
  }, []);

  if (confirming) {
    return (
      <div className="flex items-center gap-1" data-testid="resign-confirm">
        <span className="text-xs font-medium" style={{ color: 'var(--color-error)' }}>
          Resign?
        </span>
        <button
          onClick={handleConfirm}
          className="p-1 rounded hover:opacity-80"
          style={{ color: 'var(--color-error)' }}
          data-testid="resign-yes"
        >
          <Check size={16} />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 rounded hover:opacity-80"
          style={{ color: 'var(--color-text-muted)' }}
          data-testid="resign-no"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center gap-1 ${compact ? 'px-2 py-1 rounded-md border text-[11px] whitespace-nowrap' : 'px-3 py-2 rounded-lg border-2 text-sm'} border-red-500/30 text-red-400/70 hover:text-red-300 disabled:opacity-30 transition-all duration-200`}
      style={{ boxShadow: '0 0 10px rgba(239, 68, 68, 0.2), 0 0 3px rgba(239, 68, 68, 0.1)' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 18px rgba(239, 68, 68, 0.4), 0 0 6px rgba(239, 68, 68, 0.2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.2), 0 0 3px rgba(239, 68, 68, 0.1)'; }}
      data-testid="resign-btn"
    >
      <Flag size={compact ? 12 : 14} />
      Resign
    </button>
  );
}
