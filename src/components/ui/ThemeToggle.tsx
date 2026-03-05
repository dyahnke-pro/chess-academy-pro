import { useState, useRef, useEffect } from 'react';
import { Palette } from 'lucide-react';
import { ThemePickerPanel } from './ThemePickerPanel';

export function ThemeToggle(): JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full text-theme-text-muted hover:text-theme-text hover:bg-theme-surface"
        data-testid="theme-toggle-btn"
      >
        <Palette size={16} />
        Themes
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border shadow-lg z-50"
          style={{
            background: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
          }}
          data-testid="theme-popover"
        >
          <ThemePickerPanel />
        </div>
      )}
    </div>
  );
}
