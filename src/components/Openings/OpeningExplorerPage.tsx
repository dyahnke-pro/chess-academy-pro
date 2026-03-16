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
import { Search, BookOpen, Library, ChevronDown, ChevronRight, Star, Users } from 'lucide-react';

type TabMode = 'repertoire' | 'all' | 'pro';

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
  const [tab, setTab] = useState<TabMode>('repertoire');

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

  // Repertoire display (with optional search)
  const displayRepertoire = useMemo((): OpeningRecord[] => {
    if (searchResults && tab === 'repertoire') {
      return searchResults.filter((o) => o.isRepertoire);
    }
    return repertoire;
  }, [repertoire, searchResults, tab]);

  const favorites = displayRepertoire.filter((o) => o.isFavorite);
  const whites = displayRepertoire.filter((o) => o.color === 'white' && !o.isFavorite);
  const blacks = displayRepertoire.filter((o) => o.color === 'black' && !o.isFavorite);

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
      <div className="flex gap-1 mb-4 p-1 bg-theme-surface rounded-xl" data-testid="tab-toggle">
        <button
          onClick={() => setTab('repertoire')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tab === 'repertoire'
              ? 'bg-theme-accent text-white'
              : 'text-theme-text-muted hover:text-theme-text'
          }`}
          data-testid="tab-repertoire"
        >
          <BookOpen size={14} />
          My Repertoire
        </button>
        <button
          onClick={() => setTab('all')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tab === 'all'
              ? 'bg-theme-accent text-white'
              : 'text-theme-text-muted hover:text-theme-text'
          }`}
          data-testid="tab-all"
        >
          <Library size={14} />
          All Openings
        </button>
        <button
          onClick={() => setTab('pro')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            tab === 'pro'
              ? 'bg-theme-accent text-white'
              : 'text-theme-text-muted hover:text-theme-text'
          }`}
          data-testid="tab-pro"
        >
          <Users size={14} />
          Pro Repertoires
        </button>
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

      {/* ─── Repertoire tab ──────────────────────────────────────────────── */}
      {tab === 'repertoire' && (
        <>
          {favorites.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Star size={12} className="text-amber-500 fill-amber-500" />
                Favorites
              </h2>
              <div className="space-y-2">
                {favorites.map((opening, i) => (
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
            </div>
          )}

          {whites.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-3">
                My White Openings
              </h2>
              <div className="space-y-2">
                {whites.map((opening, i) => (
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
            </div>
          )}

          {blacks.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs font-bold text-theme-text-muted uppercase tracking-widest mb-3">
                My Black Openings
              </h2>
              <div className="space-y-2">
                {blacks.map((opening, i) => (
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
            </div>
          )}

          {displayRepertoire.length === 0 && (
            <div className="flex flex-1 items-center justify-center text-theme-text-muted">
              No openings found.
            </div>
          )}
        </>
      )}

      {/* ─── Pro Repertoires tab ──────────────────────────────────────────── */}
      {tab === 'pro' && <ProRepertoiresTab />}

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
