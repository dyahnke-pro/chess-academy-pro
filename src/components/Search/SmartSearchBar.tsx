import { useRef, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Sparkles, BookOpen, Swords, Target, Puzzle, Settings, Loader2 } from 'lucide-react';
import { useSmartSearch } from '../../hooks/useSmartSearch';
import type { SmartSearchResult, SmartSearchCategory } from '../../types';

interface SmartSearchBarProps {
  scope?: SmartSearchCategory;
  placeholder?: string;
  onResultsChange?: (results: SmartSearchResult[]) => void;
}

const CATEGORY_ICONS: Record<SmartSearchCategory, typeof BookOpen> = {
  opening: BookOpen,
  game: Swords,
  mistake: Target,
  puzzle: Puzzle,
  setting: Settings,
};

const CATEGORY_LABELS: Record<SmartSearchCategory, string> = {
  opening: 'Opening',
  game: 'Game',
  mistake: 'Mistake',
  puzzle: 'Puzzle',
  setting: 'Setting',
};

export function SmartSearchBar({ scope, placeholder, onResultsChange }: SmartSearchBarProps): JSX.Element {
  const navigate = useNavigate();
  const { query, setQuery, results, loading, clear } = useSmartSearch({ scope });
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notify parent of result changes (for Openings page integration)
  useEffect(() => {
    onResultsChange?.(results);
  }, [results, onResultsChange]);

  // Show dropdown when there are results or loading
  useEffect(() => {
    if (query.trim() && (results.length > 0 || loading)) {
      setShowDropdown(true);
    } else if (!query.trim()) {
      setShowDropdown(false);
    }
  }, [query, results, loading]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback((result: SmartSearchResult): void => {
    setShowDropdown(false);
    void navigate(result.route);
  }, [navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
    if (!showDropdown || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  }, [showDropdown, results, selectedIndex, handleSelect]);

  const defaultPlaceholder = scope === 'opening'
    ? 'Search openings — try "Sicilian as black" or "B01"...'
    : 'Search your games, openings, puzzles...';

  return (
    <div className="relative" data-testid="smart-search">
      {/* Input */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? defaultPlaceholder}
          className="w-full pl-9 pr-16 py-2.5 rounded-xl text-sm transition-colors focus:outline-none"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
          data-testid="smart-search-input"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2
              size={14}
              className="animate-spin"
              style={{ color: 'var(--color-accent)' }}
              data-testid="search-loading"
            />
          )}
          {query && (
            <button
              onClick={() => { clear(); setShowDropdown(false); }}
              className="p-1 rounded-md hover:opacity-70"
              aria-label="Clear search"
              data-testid="search-clear"
            >
              <X size={14} style={{ color: 'var(--color-text-muted)' }} />
            </button>
          )}
        </div>
      </div>

      {/* AI badge caption */}
      <div className="flex items-center gap-1 mt-1.5 ml-1">
        <Sparkles size={10} style={{ color: 'var(--color-accent)' }} />
        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          AI-powered — try &quot;my worst opening as black&quot; or &quot;blunders in the Sicilian&quot;
        </span>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-lg max-h-80 overflow-y-auto"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
          data-testid="search-dropdown"
        >
          {loading && results.length === 0 && (
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <Sparkles size={12} style={{ color: 'var(--color-accent)' }} />
                Searching with AI...
              </div>
            </div>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <div className="p-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
              No results found
            </div>
          )}
          {results.map((result, i) => {
            const Icon = CATEGORY_ICONS[result.category];
            return (
              <button
                key={`${result.category}-${result.id}`}
                onClick={() => handleSelect(result)}
                className="w-full px-3 py-2.5 flex items-start gap-3 text-left transition-colors"
                style={{
                  background: i === selectedIndex ? 'var(--color-border)' : 'transparent',
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                data-testid="search-result"
              >
                <div
                  className="mt-0.5 p-1.5 rounded-lg shrink-0"
                  style={{ background: 'var(--color-bg)' }}
                >
                  <Icon size={14} style={{ color: 'var(--color-accent)' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {result.title}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {result.subtitle}
                  </div>
                </div>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 mt-0.5"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
                >
                  {CATEGORY_LABELS[result.category]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
