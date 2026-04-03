import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  getRepertoireOpenings,
  searchOpenings,
  getOpeningsByEcoLetter,
  toggleFavorite,
} from '../../services/openingService';
import { seedDatabase } from '../../services/dataLoader';
import { OpeningCard } from './OpeningCard';
import type { OpeningRecord } from '../../types';
import { ProRepertoiresTab } from './ProRepertoiresTab';
import { GambitsTab } from './GambitsTab';
import { Search, BookOpen, Library, ChevronDown, ChevronRight, Users, Swords } from 'lucide-react';

type TabMode = 'common' | 'pro' | 'gambits' | 'all';

const ECO_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

const ECO_DESCRIPTIONS: Record<string, string> = {
  A: 'Flank Openings',
  B: 'Semi-Open Games',
  C: 'Open Games & French',
  D: "Queen's Pawn & Closed",
  E: 'Indian Defences',
};

export function OpeningExplorerPage(): JSX.Element {
  const navigate = useNavigate();
  const [repertoire, setRepertoire] = useState<OpeningRecord[]>([]);
  const [searchResults, setSearchResults] = useState<OpeningRecord[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabMode>('common');

  // ECO groups for "All Openings" tab
  const [ecoGroups, setEcoGroups] = useState<Record<string, OpeningRecord[]>>({});
  const [expandedLetters, setExpandedLetters] = useState<Set<string>>(new Set());
  const [allLoading, setAllLoading] = useState(false);

  useEffect(() => {
    async function load(): Promise<void> {
      await seedDatabase();
      const all = await getRepertoireOpenings();
      setRepertoire(all);
      setLoading(false);
    }
    void load();
  }, []);

  // Load ECO groups when switching to "All Openings" tab
  useEffect(() => {
    if (tab !== 'all' || Object.keys(ecoGroups).length > 0) return;
    setAllLoading(true);
    async function loadAll(): Promise<void> {
      const groups: Record<string, OpeningRecord[]> = {};
      for (const letter of ECO_LETTERS) {
        groups[letter] = await getOpeningsByEcoLetter(letter);
      }
      setEcoGroups(groups);
      setAllLoading(false);
    }
    void loadAll();
  }, [tab, ecoGroups]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      void searchOpenings(searchQuery).then((results) => {
        setSearchResults(results);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleLetter = useCallback((letter: string): void => {
    setExpandedLetters((prev) => {
      const next = new Set(prev);
      if (next.has(letter)) {
        next.delete(letter);
      } else {
        next.add(letter);
      }
      return next;
    });
  }, []);

  const handleToggleFavorite = useCallback(async (id: string): Promise<void> => {
    const newVal = await toggleFavorite(id);
    setRepertoire((prev) =>
      prev.map((o) => (o.id === id ? { ...o, isFavorite: newVal } : o)),
    );
  }, []);

  // Most Common display (with optional search)
  const displayCommon = useMemo((): OpeningRecord[] => {
    if (searchResults && tab === 'common') {
      return searchResults.filter((o) => o.isRepertoire);
    }
    return repertoire;
  }, [repertoire, searchResults, tab]);

  // All openings search results
  const displayAllSearch = useMemo((): OpeningRecord[] | null => {
    if (tab !== 'all' || !searchResults) return null;
    return searchResults;
  }, [tab, searchResults]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-theme-text-muted">Loading openings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto" data-testid="opening-explorer">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <BookOpen size={24} className="text-theme-accent" />
        <h1 className="text-2xl font-bold text-theme-text">Openings</h1>
      </div>

      {/* Tab toggle */}
      <div className="grid grid-cols-4 gap-1 mb-4 p-1 bg-theme-surface rounded-xl" data-testid="tab-toggle">
        {([
          { id: 'common' as const, label: 'Most Common', icon: BookOpen, testId: 'tab-common' },
          { id: 'pro' as const, label: 'Pro', icon: Users, testId: 'tab-pro' },
          { id: 'gambits' as const, label: 'Gambits', icon: Swords, testId: 'tab-gambits' },
          { id: 'all' as const, label: 'All', icon: Library, testId: 'tab-all' },
        ]).map(({ id, label, icon: Icon, testId }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-colors ${
              tab === id
                ? 'bg-theme-accent text-white'
                : 'text-theme-text-muted hover:text-theme-text'
            }`}
            data-testid={testId}
          >
            <Icon size={16} />
            <span className="leading-tight text-center">{label}</span>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or ECO code..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-theme-surface text-theme-text text-sm placeholder:text-theme-text-muted border border-theme-border focus:border-theme-accent focus:outline-none transition-colors"
          data-testid="opening-search"
        />
      </div>

      {/* ─── Most Common tab ────────────────────────────────────────────── */}
      {tab === 'common' && (
        <>
          <h2 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-3">
            Most Common Openings
          </h2>
          <div className="space-y-2">
            {displayCommon.map((opening, i) => (
              <motion.div
                key={opening.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.25 }}
              >
                <OpeningCard
                  opening={opening}
                  onClick={() => void navigate(`/openings/${opening.id}`)}
                  onToggleFavorite={() => void handleToggleFavorite(opening.id)}
                />
              </motion.div>
            ))}
          </div>
          {displayCommon.length === 0 && (
            <div className="flex flex-1 items-center justify-center text-theme-text-muted">
              No openings found.
            </div>
          )}
        </>
      )}

      {/* ─── Pro Repertoires tab ──────────────────────────────────────────── */}
      {tab === 'pro' && <ProRepertoiresTab />}

      {/* ─── Gambits tab ─────────────────────────────────────────────────── */}
      {tab === 'gambits' && <GambitsTab />}

      {/* ─── All Openings tab ────────────────────────────────────────────── */}
      {tab === 'all' && (
        <>
          {allLoading && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-theme-text-muted">Loading opening encyclopedia...</p>
            </div>
          )}

          {/* Search results in All tab */}
          {displayAllSearch && (
            <div className="mb-6">
              <h2 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-3">
                Search Results ({displayAllSearch.length})
              </h2>
              <div className="space-y-1.5">
                {displayAllSearch.map((opening) => (
                  <OpeningCard
                    key={opening.id}
                    opening={opening}
                    onClick={() => void navigate(`/openings/${opening.id}`)}
                  />
                ))}
              </div>
              {displayAllSearch.length === 0 && (
                <p className="text-sm text-theme-text-muted text-center py-4">No openings match your search.</p>
              )}
            </div>
          )}

          {/* ECO letter groups */}
          {!displayAllSearch && !allLoading && ECO_LETTERS.map((letter) => {
            const group = ecoGroups[letter] ?? [];
            const isExpanded = expandedLetters.has(letter);
            return (
              <div key={letter} className="mb-3" data-testid={`eco-group-${letter}`}>
                <button
                  onClick={() => toggleLetter(letter)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-theme-surface hover:bg-theme-border transition-colors"
                  data-testid={`eco-toggle-${letter}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-theme-accent">{letter}</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-theme-text">{ECO_DESCRIPTIONS[letter]}</p>
                      <p className="text-xs text-theme-text-muted">{group.length} openings</p>
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronDown size={16} className="text-theme-text-muted" />
                    : <ChevronRight size={16} className="text-theme-text-muted" />
                  }
                </button>
                {isExpanded && (
                  <div className="mt-1.5 space-y-1.5 pl-2">
                    {group.map((opening) => (
                      <OpeningCard
                        key={opening.id}
                        opening={opening}
                        onClick={() => void navigate(`/openings/${opening.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
