import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRepertoireOpenings, searchOpenings } from '../../services/openingService';
import { seedDatabase } from '../../services/dataLoader';
import type { OpeningRecord } from '../../types';
import { Search, BookOpen, Target } from 'lucide-react';

type ColorFilter = 'all' | 'white' | 'black';

export function OpeningExplorerPage(): JSX.Element {
  const navigate = useNavigate();
  const [openings, setOpenings] = useState<OpeningRecord[]>([]);
  const [searchResults, setSearchResults] = useState<OpeningRecord[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      await seedDatabase();
      const all = await getRepertoireOpenings();
      setOpenings(all);
      setLoading(false);
    }
    void load();
  }, []);

  // Search effect
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

  const displayOpenings = useMemo((): OpeningRecord[] => {
    const source = searchResults ?? openings;
    if (colorFilter === 'all') return source;
    return source.filter((o) => o.color === colorFilter);
  }, [openings, searchResults, colorFilter]);

  const whites = displayOpenings.filter((o) => o.color === 'white');
  const blacks = displayOpenings.filter((o) => o.color === 'black');

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-theme-text-muted">Loading openings...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-4 md:p-6 overflow-y-auto" data-testid="opening-explorer">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <BookOpen size={24} className="text-theme-accent" />
        <h1 className="text-2xl font-bold text-theme-text">Opening Explorer</h1>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search openings by name or ECO code..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-theme-surface text-theme-text text-sm placeholder:text-theme-text-muted border border-theme-border focus:border-theme-accent focus:outline-none transition-colors"
            data-testid="opening-search"
          />
        </div>

        <div className="flex bg-theme-surface rounded-lg p-0.5">
          {(['all', 'white', 'black'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setColorFilter(filter)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                colorFilter === filter
                  ? 'bg-theme-accent text-white'
                  : 'text-theme-text-muted hover:text-theme-text'
              }`}
              data-testid={`filter-${filter}`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex gap-3 mb-4 text-sm text-theme-text-muted">
        <span>{displayOpenings.length} openings</span>
        {searchResults !== null && <span>(filtered by search)</span>}
      </div>

      {/* Opening grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* White openings */}
        {(colorFilter === 'all' || colorFilter === 'white') && whites.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-theme-text-muted uppercase tracking-wide">
              White Repertoire ({whites.length})
            </h2>
            <div className="space-y-1.5">
              {whites.map((opening) => (
                <OpeningCard
                  key={opening.id}
                  opening={opening}
                  onClick={() => void navigate(`/openings/${opening.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Black openings */}
        {(colorFilter === 'all' || colorFilter === 'black') && blacks.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-theme-text-muted uppercase tracking-wide">
              Black Repertoire ({blacks.length})
            </h2>
            <div className="space-y-1.5">
              {blacks.map((opening) => (
                <OpeningCard
                  key={opening.id}
                  opening={opening}
                  onClick={() => void navigate(`/openings/${opening.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {displayOpenings.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-theme-text-muted">
          No openings found.
        </div>
      )}
    </div>
  );
}

// ─── Opening Card ───────────────────────────────────────────────────────────

interface OpeningCardProps {
  opening: OpeningRecord;
  onClick: () => void;
}

function OpeningCard({ opening, onClick }: OpeningCardProps): JSX.Element {
  const accuracy = opening.drillAttempts > 0
    ? Math.round(opening.drillAccuracy * 100)
    : null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-theme-surface hover:bg-theme-border rounded-lg p-3 transition-colors group"
      data-testid={`opening-card-${opening.id}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-theme-accent">{opening.eco}</span>
            <span className="text-sm font-medium text-theme-text truncate">
              {opening.name}
            </span>
          </div>
          {opening.style && (
            <p className="text-xs text-theme-text-muted mt-0.5">{opening.style}</p>
          )}
        </div>

        <div className="flex items-center gap-3 ml-2">
          {accuracy !== null && (
            <div className="flex items-center gap-1">
              <Target size={12} className="text-theme-text-muted" />
              <span
                className={`text-xs font-medium ${
                  accuracy >= 80 ? 'text-green-500' : accuracy >= 50 ? 'text-yellow-500' : 'text-red-500'
                }`}
              >
                {accuracy}%
              </span>
            </div>
          )}
          <span className="text-xs text-theme-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
            Study
          </span>
        </div>
      </div>
    </button>
  );
}
