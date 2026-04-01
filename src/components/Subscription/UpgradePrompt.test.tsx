import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import { UpgradePrompt } from './UpgradePrompt';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('UpgradePrompt', () => {
  it('renders the feature title and description', () => {
    render(<UpgradePrompt feature="aiCoach" />);

    expect(screen.getByText('AI Chess Coach')).toBeInTheDocument();
    expect(screen.getByText(/personalized coaching/)).toBeInTheDocument();
  });

  it('renders the upgrade button', () => {
    render(<UpgradePrompt feature="aiCoach" />);

    expect(screen.getByRole('button', { name: /upgrade to pro/i })).toBeInTheDocument();
  });

  it('navigates to /upgrade on button click', () => {
    render(<UpgradePrompt feature="aiCoach" />);

    const button = screen.getByRole('button', { name: /upgrade to pro/i });
    button.click();

    expect(mockNavigate).toHaveBeenCalledWith('/upgrade');
  });

  it('renders compact mode', () => {
    render(<UpgradePrompt feature="weaknessDetection" compact />);

    expect(screen.getByText(/unlock weakness detection/i)).toBeInTheDocument();
  });

  it('shows pricing info in full mode', () => {
    render(<UpgradePrompt feature="cloudSync" />);

    expect(screen.getByText(/\$4\.99\/month/)).toBeInTheDocument();
  });
});
