import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Swords, Flame } from 'lucide-react';
import {
  getMasterclassOpenings,
  getAntiOpenings,
  getGambitCourseOpenings,
} from '../../services/openingService';
import { AcademyCourseCard } from './AcademyCourseCard';
import type { OpeningRecord } from '../../types';

interface CourseSectionProps {
  title: string;
  icon: JSX.Element;
  openings: OpeningRecord[];
  testid: string;
  onOpen: (id: string) => void;
}

function CourseSection({ title, icon, openings, testid, onOpen }: CourseSectionProps): JSX.Element | null {
  if (openings.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" data-testid={testid}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-theme-text-muted">
        {icon}
        <span>{title}</span>
      </div>
      {openings.map((opening, i) => (
        <motion.div
          key={opening.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.25 }}
        >
          <AcademyCourseCard opening={opening} onOpen={() => onOpen(opening.id)} />
        </motion.div>
      ))}
    </section>
  );
}

/**
 * The Academy COURSES — opening content as enrolled GM-style courses, in three
 * shelves: Masterclasses (the canonical openings), Counter-Weapons (White
 * anti-opening repertoires vs the defenses amateurs struggle to face), and
 * Gambits. Each card → the course syllabus.
 */
export function AcademyCourses(): JSX.Element {
  const navigate = useNavigate();
  const [masterclasses, setMasterclasses] = useState<OpeningRecord[]>([]);
  const [antiOpenings, setAntiOpenings] = useState<OpeningRecord[]>([]);
  const [gambits, setGambits] = useState<OpeningRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let tries = 0;
    // Anti-openings + gambits seed in the DEFERRED backfill, so on a cold first
    // load they aren't in Dexie yet at mount. Re-poll until they land (or give
    // up after ~40s) so their shelves appear without a manual reload.
    const fetchAll = async (): Promise<void> => {
      const [mc, anti, gam] = await Promise.all([
        getMasterclassOpenings(),
        getAntiOpenings(),
        getGambitCourseOpenings(),
      ]);
      if (!alive) return;
      setMasterclasses(mc);
      setAntiOpenings(anti);
      setGambits(gam);
      setLoading(false);
      if ((anti.length === 0 || gam.length === 0) && tries < 20) {
        tries += 1;
        setTimeout(() => { void fetchAll(); }, 2000);
      }
    };
    void fetchAll();
    return () => { alive = false; };
  }, []);

  const open = (id: string): void => void navigate(`/academy/course/${id}`);

  return (
    <div className="max-w-lg mx-auto w-full flex flex-col gap-5" data-testid="academy-courses">
      {loading ? (
        <p className="text-sm text-theme-text-muted py-4 text-center" data-testid="academy-courses-loading">
          Loading courses…
        </p>
      ) : (
        <>
          <CourseSection title="Masterclasses" icon={<GraduationCap size={14} className="text-amber-400" />} openings={masterclasses} testid="academy-section-masterclasses" onOpen={open} />
          <CourseSection title="Counter-Weapons — beat their opening" icon={<Swords size={14} className="text-rose-400" />} openings={antiOpenings} testid="academy-section-anti" onOpen={open} />
          <CourseSection title="Gambits" icon={<Flame size={14} className="text-orange-400" />} openings={gambits} testid="academy-section-gambits" onOpen={open} />
          {masterclasses.length === 0 && antiOpenings.length === 0 && gambits.length === 0 && (
            <p className="text-sm text-theme-text-muted py-4 text-center" data-testid="academy-courses-empty">No courses available yet.</p>
          )}
        </>
      )}
    </div>
  );
}
