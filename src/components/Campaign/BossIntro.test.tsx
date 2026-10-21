import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BossIntro } from './BossIntro';

describe('BossIntro', () => {
  it('names the boss, shows its intro and starts on tap', () => {
    const onStart = vi.fn();
    render(<BossIntro name="The Grabber" intro="It takes everything you leave lying around." onStart={onStart} />);
    expect(screen.getByTestId('boss-intro')).toHaveTextContent('The Grabber');
    expect(screen.getByTestId('boss-intro-text')).toHaveTextContent('lying around');
    fireEvent.click(screen.getByTestId('boss-intro-start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
