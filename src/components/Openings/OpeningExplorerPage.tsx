import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getRepertoireOpenings, searchOpenings } from '../../services/openingService';
import { seedDatabase } from '../../services/dataLoader';
import { OpeningCard } from './OpeningCard';
import type { OpeningRecord } from '../../types';
import { Search, BookOpen } from 'lucide-react';

export function OpeningExplorerPage(): JSX.Element {
  const navigate = useNavigate();
  const [openings, setOpenings] = useState<OpeningRecord[]>([]);
  const [searchResults, setSearchResults] = useState<OpeningRecord[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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

  const displayOpenings = useMemo((): OpeningRecord[] => {
    return searchResults ?? openings;
  }, [openings, searchResults]);

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
        <h1 className="text-2xl font-bold text-theme-text">My Openings</h1>
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

      {/* White openings */}
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
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Black openings */}
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
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {displayOpenings.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-theme-text-muted">
          No openings found.
        </div>
      )}
    </div>
  );
}
