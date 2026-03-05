import { motion } from 'framer-motion';
import type { CoachPersonality, CoachExpression } from '../../types';

interface CoachAvatarProps {
  personality: CoachPersonality;
  expression: CoachExpression;
  speaking: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  sm: 48,
  md: 80,
  lg: 120,
};

// Colors per personality
const PERSONALITY_COLORS: Record<CoachPersonality, {
  primary: string;
  secondary: string;
  accent: string;
  skin: string;
  hair: string;
}> = {
  danya: {
    primary: '#4F9D69',  // warm green
    secondary: '#2D6A4F',
    accent: '#95D5B2',
    skin: '#F4C99B',
    hair: '#5C4033',
  },
  kasparov: {
    primary: '#C62828',  // intense red
    secondary: '#8E0000',
    accent: '#FF5252',
    skin: '#E8B88A',
    hair: '#2C2C2C',
  },
  fischer: {
    primary: '#1565C0',  // cool blue
    secondary: '#0D47A1',
    accent: '#42A5F5',
    skin: '#F5CCA9',
    hair: '#8B7355',
  },
};

// Expression morphing values
const EXPRESSION_SHAPES: Record<CoachExpression, {
  eyeScale: number;
  mouthPath: string;
  browOffset: number;
}> = {
  neutral: {
    eyeScale: 1,
    mouthPath: 'M 35,62 Q 50,66 65,62',
    browOffset: 0,
  },
  encouraging: {
    eyeScale: 1.1,
    mouthPath: 'M 35,60 Q 50,70 65,60',
    browOffset: -1,
  },
  excited: {
    eyeScale: 1.3,
    mouthPath: 'M 32,58 Q 50,74 68,58',
    browOffset: -3,
  },
  disappointed: {
    eyeScale: 0.9,
    mouthPath: 'M 35,66 Q 50,60 65,66',
    browOffset: 2,
  },
  thinking: {
    eyeScale: 0.8,
    mouthPath: 'M 40,64 Q 50,62 55,64',
    browOffset: -2,
  },
};

export function CoachAvatar({ personality, expression, speaking, size = 'md' }: CoachAvatarProps): JSX.Element {
  const px = SIZE_MAP[size];
  const colors = PERSONALITY_COLORS[personality];
  const shape = EXPRESSION_SHAPES[expression];

  return (
    <motion.div
      className="relative inline-flex items-center justify-center"
      animate={speaking ? {
        scale: [1, 1.03, 1],
      } : { scale: 1 }}
      transition={speaking ? {
        duration: 0.8,
        repeat: Infinity,
        ease: 'easeInOut',
      } : { duration: 0.3 }}
      data-testid="coach-avatar"
      data-personality={personality}
      data-expression={expression}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-label={`Coach ${personality} avatar`}
      >
        {/* Background circle */}
        <circle cx="50" cy="50" r="48" fill={colors.primary} opacity="0.15" />
        <circle cx="50" cy="50" r="45" fill={colors.primary} opacity="0.25" />

        {/* Head */}
        <motion.ellipse
          cx="50" cy="45" rx="28" ry="30"
          fill={colors.skin}
          animate={{ ry: speaking ? 31 : 30 }}
          transition={{ duration: 0.3 }}
        />

        {/* Hair */}
        {personality === 'danya' && (
          <path d="M 22,38 Q 25,15 50,12 Q 75,15 78,38 Q 70,25 50,22 Q 30,25 22,38" fill={colors.hair} />
        )}
        {personality === 'kasparov' && (
          <path d="M 22,40 Q 22,12 50,10 Q 78,12 78,40 Q 72,20 50,18 Q 28,20 22,40" fill={colors.hair} />
        )}
        {personality === 'fischer' && (
          <path d="M 24,42 Q 24,18 50,14 Q 76,18 76,42 Q 74,22 50,20 Q 26,22 24,42" fill={colors.hair} />
        )}

        {/* Eyes */}
        <motion.ellipse
          cx="38" cy="42" rx="4" ry="4"
          fill="#2C2C2C"
          animate={{ scaleY: shape.eyeScale }}
          transition={{ duration: 0.3 }}
        />
        <motion.ellipse
          cx="62" cy="42" rx="4" ry="4"
          fill="#2C2C2C"
          animate={{ scaleY: shape.eyeScale }}
          transition={{ duration: 0.3 }}
        />

        {/* Eye highlights */}
        <circle cx="39.5" cy="40.5" r="1.5" fill="white" opacity="0.8" />
        <circle cx="63.5" cy="40.5" r="1.5" fill="white" opacity="0.8" />

        {/* Eyebrows */}
        <motion.line
          x1="32" y1={35 + shape.browOffset} x2="44" y2={33 + shape.browOffset}
          stroke={colors.hair} strokeWidth="2.5" strokeLinecap="round"
          animate={{ y1: 35 + shape.browOffset, y2: 33 + shape.browOffset }}
          transition={{ duration: 0.3 }}
        />
        <motion.line
          x1="56" y1={33 + shape.browOffset} x2="68" y2={35 + shape.browOffset}
          stroke={colors.hair} strokeWidth="2.5" strokeLinecap="round"
          animate={{ y1: 33 + shape.browOffset, y2: 35 + shape.browOffset }}
          transition={{ duration: 0.3 }}
        />

        {/* Mouth */}
        <motion.path
          d={shape.mouthPath}
          fill="none"
          stroke="#8B4513"
          strokeWidth="2"
          strokeLinecap="round"
          animate={{ d: speaking
            ? ['M 35,62 Q 50,70 65,62', 'M 35,60 Q 50,68 65,60', 'M 35,62 Q 50,70 65,62']
            : shape.mouthPath
          }}
          transition={speaking ? {
            duration: 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
          } : { duration: 0.3 }}
        />

        {/* Personality accent (collar/accessory) */}
        <path
          d="M 30,72 Q 50,80 70,72 L 72,85 Q 50,92 28,85 Z"
          fill={colors.primary}
        />

        {/* Thinking indicator */}
        {expression === 'thinking' && (
          <motion.g
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <circle cx="78" cy="25" r="3" fill={colors.accent} />
            <circle cx="84" cy="18" r="2" fill={colors.accent} opacity="0.7" />
            <circle cx="88" cy="13" r="1.5" fill={colors.accent} opacity="0.4" />
          </motion.g>
        )}

        {/* Speaking pulse ring */}
        {speaking && (
          <motion.circle
            cx="50" cy="50" r="48"
            fill="none"
            stroke={colors.accent}
            strokeWidth="2"
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 1.15 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </svg>
    </motion.div>
  );
}
