import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { ErrorBoundary } from './ErrorBoundary';

function ThrowingComponent(): JSX.Element {
  throw new Error('Test error');
}

function SafeComponent(): JSX.Element {
  return <div data-testid="safe-child">All good</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('safe-child')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    // Suppress console.error for the expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByTestId('error-refresh-btn')).toBeInTheDocument();

    spy.mockRestore();
  });
});
