import { Star } from 'lucide-react';

interface StarDisplayProps {
  earned: number;
  total: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_MAP: Record<string, number> = {
  sm: 14,
  md: 20,
  lg: 28,
};

export function StarDisplay({
  earned,
  total,
  size = 'md',
}: StarDisplayProps): JSX.Element {
  const iconSize = SIZE_MAP[size] ?? 20;

  return (
    <div className="flex items-center gap-0.5" data-testid="star-display">
      {Array.from({ length: total }).map((_, i) => (
        <Star
          key={i}
          size={iconSize}
          className={
            i < earned
              ? 'fill-yellow-400 text-yellow-400'
              : 'fill-none text-gray-400'
          }
          data-testid={i < earned ? 'star-filled' : 'star-empty'}
        />
      ))}
    </div>
  );
}
