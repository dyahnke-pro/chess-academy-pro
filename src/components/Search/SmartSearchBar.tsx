import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Sparkles, BookOpen, Swords, Target, Puzzle, Loader2, MessageCircle, Play } from 'lucide-react';
import { useSmartSearch } from '../../hooks/useSmartSearch';
import { useAppStore } from '../../stores/appStore';
import { parseCoachIntent } from '../../services/coachAgent';
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
};

const CATEGORY_LABELS: Record<SmartSearchCategory, string> = {
  opening: 'Opening',
  game: 'Game',
  mistake: 'Mistake',
  puzzle: 'Puzzle',
};

const ASK_COACH_MIN_LENGTH = 3;

export function SmartSearchBar({ scope, placeholder, onResultsChange }: SmartSearchBarProps): JSX.Element {
  const navigate = useNavigate();
  const { query, setQuery, results, loading, clear } = useSmartSearch({ scope });
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const setCoachDrawerOpen = useAppStore((s) => s.setCoachDrawerOpen);
  const setCoachDrawerInitialMessage = useAppStore((s) => s.setCoachDrawerInitialMessage);

  const showAskCoach = query.trim().length >= ASK_COACH_MIN_LENGTH;
  // Detect agent-routable intents (e.g. "run me through the middlegame",
  // "play the Sicilian against me"). When matched we show a fast-path
  // "Start session" suggestion at the top of the dropdown.
  const agentIntent = useMemo(
    () =>
      query.trim().length >= ASK_COACH_MIN_LENGTH
        ? parseCoachIntent(query.trim())
        : { kind: 'qa' as const, raw: '' },
    [query],
  );
  const showAgentAction =
    agentIntent.kind === 'continue-middlegame' ||
    agentIntent.kind === 'play-against';
  const totalItems =
    results.length + (showAskCoach ? 1 : 0) + (showAgentAction ? 1 : 0);
  const agentActionIndex = showAgentAction ? 0 : -1;
  const resultsOffset = showAgentAction ? 1 : 0;
  const askCoachIndex = showAskCoach ? resultsOffset + results.length : -1;

  // Notify parent of result changes (for Openings page integration)
  useEffect(() => {
    onResultsChange?.(results);
  }, [results, onResultsChange]);

  // Show dropdown when there are results, loading, or query is long enough for "Ask Coach"
  useEffect(() => {
    if (query.trim() && (results.length > 0 || loading || showAskCoach || showAgentAction)) {
      setShowDropdown(true);
    } else if (!query.trim()) {
      setShowDropdown(false);
    }
  }, [query, results, loading, showAskCoach, showAgentAction]);

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

  const askCoach = useCallback((text: string): void => {
    setCoachDrawerInitialMessage(text);
    setCoachDrawerOpen(true);
    clear();
    setShowDropdown(false);
    inputRef.current?.blur();
  }, [setCoachDrawerInitialMessage, setCoachDrawerOpen, clear]);

  const startAgentSession = useCallback((): void => {
    clear();
    setShowDropdown(false);
    inputRef.current?.blur();
    if (agentIntent.kind === 'continue-middlegame') {
      const subject = encodeURIComponent(agentIntent.subject ?? '');
      void navigate(`/coach/session/middlegame?subject=${subject}`);
    } else if (agentIntent.kind === 'play-against') {
      const subject = encodeURIComponent(agentIntent.subject ?? '');
      const difficulty = agentIntent.difficulty ?? 'auto';
      void navigate(
        `/coach/session/play-against?subject=${subject}&difficulty=${difficulty}`,
      );
    }
  }, [agentIntent, clear, navigate]);

  const handleSelect = useCallback((result: SmartSearchResult): void => {
    setShowDropdown(false);
    void navigate(result.route);
  }, [navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
    if (!showDropdown || totalItems === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex === agentActionIndex && showAgentAction) {
        startAgentSession();
      } else if (
        selectedIndex >= resultsOffset &&
        selectedIndex < resultsOffset + results.length
      ) {
        handleSelect(results[selectedIndex - resultsOffset]);
      } else if (selectedIndex === askCoachIndex) {
        askCoach(query.trim());
      } else if (selectedIndex === -1 && showAgentAction) {
        // Unselected default → prefer agent action over ask-coach.
        startAgentSession();
      } else if (selectedIndex === -1 && showAskCoach) {
        askCoach(query.trim());
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  }, [showDropdown, totalItems, results, selectedIndex, handleSelect, askCoachIndex, showAskCoach, askCoach, query, agentActionIndex, showAgentAction, startAgentSession, resultsOffset]);

  const defaultPlaceholder = scope === 'opening'
    ? 'Search openings — try "Sicilian as black" or "B01"...'
    : 'Ask a question or search games, openings, puzzles...';

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
          onFocus={() => { if (results.length > 0 || showAskCoach) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? defaultPlaceholder}
          className="w-full pl-9 pr-16 py-2.5 rounded-xl text-sm transition-all duration-200 focus:outline-none"
          style={{
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            borderTop: '1px solid rgba(201, 168, 76, 0.15)',
            borderRight: '1px solid rgba(201, 168, 76, 0.15)',
            borderLeft: '2px solid rgba(201, 168, 76, 0.5)',
            borderBottom: '2px solid rgba(201, 168, 76, 0.5)',
            boxShadow: '0 0 6px rgba(201, 168, 76, 0.35), 0 0 14px rgba(201, 168, 76, 0.2), 0 0 24px rgba(201, 168, 76, 0.1)',
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderLeft = '2px solid rgba(201, 168, 76, 0.8)';
            e.currentTarget.style.borderBottom = '2px solid rgba(201, 168, 76, 0.8)';
            e.currentTarget.style.borderTop = '1px solid rgba(201, 168, 76, 0.3)';
            e.currentTarget.style.borderRight = '1px solid rgba(201, 168, 76, 0.3)';
            e.currentTarget.style.boxShadow = '0 0 8px rgba(201, 168, 76, 0.5), 0 0 18px rgba(201, 168, 76, 0.3), 0 0 30px rgba(201, 168, 76, 0.15)';
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderLeft = '2px solid rgba(201, 168, 76, 0.5)';
            e.currentTarget.style.borderBottom = '2px solid rgba(201, 168, 76, 0.5)';
            e.currentTarget.style.borderTop = '1px solid rgba(201, 168, 76, 0.15)';
            e.currentTarget.style.borderRight = '1px solid rgba(201, 168, 76, 0.15)';
            e.currentTarget.style.boxShadow = '0 0 6px rgba(201, 168, 76, 0.35), 0 0 14px rgba(201, 168, 76, 0.2), 0 0 24px rgba(201, 168, 76, 0.1)';
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
          AI-powered — try &quot;my worst opening as black&quot; or ask your coach a question
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
          {!loading && results.length === 0 && !showAskCoach && !showAgentAction && query.trim() && (
            <div className="p-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
              No results found
            </div>
          )}
          {/* Agent action suggestion — takes priority when detected */}
          {showAgentAction && (
            <button
              onClick={startAgentSession}
              className="w-full px-3 py-3 flex items-center gap-3 text-left transition-colors border-b"
              style={{
                background: selectedIndex === agentActionIndex ? 'var(--color-border)' : 'transparent',
                borderColor: 'var(--color-border)',
              }}
              onMouseEnter={() => setSelectedIndex(agentActionIndex)}
              data-testid="agent-action-option"
            >
              <div
                className="p-1.5 rounded-lg shrink-0"
                style={{ background: 'rgba(34, 211, 238, 0.2)', color: '#22d3ee' }}
              >
                <Play size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                  {agentIntent.kind === 'continue-middlegame'
                    ? 'Run the middlegame plans'
                    : `Play${agentIntent.subject ? ` ${agentIntent.subject}` : ''} vs. Coach`}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {agentIntent.kind === 'play-against' && agentIntent.difficulty !== 'auto'
                    ? `Difficulty: ${agentIntent.difficulty}`
                    : 'Opens a lesson session with the coach'}
                </div>
              </div>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                style={{ background: 'rgba(34, 211, 238, 0.3)', color: '#22d3ee' }}
              >
                Start
              </span>
            </button>
          )}
          {results.map((result, i) => {
            const Icon = CATEGORY_ICONS[result.category];
            const itemIndex = resultsOffset + i;
            return (
              <button
                key={`${result.category}-${result.id}`}
                onClick={() => handleSelect(result)}
                className="w-full px-3 py-2.5 flex items-start gap-3 text-left transition-colors"
                style={{
                  background: itemIndex === selectedIndex ? 'var(--color-border)' : 'transparent',
                }}
                onMouseEnter={() => setSelectedIndex(itemIndex)}
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

          {/* Ask Coach option */}
          {showAskCoach && (
            <>
              {results.length > 0 && (
                <div className="mx-3 border-t" style={{ borderColor: 'var(--color-border)' }} />
              )}
              <button
                onClick={() => askCoach(query.trim())}
                className="w-full px-3 py-3 flex items-center gap-3 text-left transition-colors"
                style={{
                  background: selectedIndex === askCoachIndex ? 'var(--color-border)' : 'transparent',
                }}
                onMouseEnter={() => setSelectedIndex(askCoachIndex)}
                data-testid="ask-coach-option"
              >
                <div
                  className="p-1.5 rounded-lg shrink-0"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  <MessageCircle size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
                    Ask Coach
                  </div>
                  <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    &ldquo;{query.trim()}&rdquo;
                  </div>
                </div>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: 'var(--color-accent)', color: 'white' }}
                >
                  Enter
                </span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
