import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { getMasterclassOpenings } from '../../services/openingService';
import { AcademyCourseCard } from './AcademyCourseCard';
import type { OpeningRecord } from '../../types';

/**
 * The Academy COURSES section — the opening masterclasses presented as enrolled
 * GM-style courses (syllabus + chapters + progress), vs the free Openings tab's
 * browsable library. The list comes from `getMasterclassOpenings()` (driven by
 * `opening-manifests.json`), so a new masterclass appears here automatically.
 * v1 deep-links a course into the existing opening detail page; P3 inserts the
 * dedicated syllabus screen.
 */
export function AcademyCourses(): JSX.Element {
  const navigate = useNavigate();
  const [openings, setOpenings] = useState<OpeningRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void getMasterclassOpenings().then((data) => {
      if (alive) {
        setOpenings(data);
        setLoading(false);
      }
    });
    return () => { alive = false; };
  }, []);

  return (
    <section className="max-w-lg mx-auto w-full flex flex-col gap-2" data-testid="academy-courses">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-theme-text-muted">
        <GraduationCap size={14} className="text-indigo-400" />
        <span>Courses</span>
      </div>

      {loading ? (
        <p className="text-sm text-theme-text-muted py-4 text-center" data-testid="academy-courses-loading">
          Loading courses…
        </p>
      ) : openings.length === 0 ? (
        <p className="text-sm text-theme-text-muted py-4 text-center" data-testid="academy-courses-empty">
          No courses available yet.
        </p>
      ) : (
        openings.map((opening, i) => (
          <motion.div
            key={opening.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.25 }}
          >
            <AcademyCourseCard
              opening={opening}
              onOpen={() => void navigate(`/openings/${opening.id}`)}
            />
          </motion.div>
        ))
      )}
    </section>
  );
}
