interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  className = '',
}: SkeletonProps): JSX.Element {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{
        width,
        height,
        background: 'var(--color-border)',
      }}
      data-testid="skeleton"
    />
  );
}
