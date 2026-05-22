import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { MasterclassCoachChat } from './MasterclassCoachChat';

const wrap = (ui: ReactElement): ReturnType<typeof render> => render(<MemoryRouter>{ui}</MemoryRouter>);

vi.mock('../../services/coachApi', () => ({
  getCoachChatResponse: vi.fn().mockResolvedValue('The plan is the …c5 break.'),
}));
import { getCoachChatResponse } from '../../services/coachApi';
const mockCoach = vi.mocked(getCoachChatResponse);

describe('MasterclassCoachChat', () => {
  beforeEach(() => mockCoach.mockClear());

  it('renders nothing for a non-masterclass opening', () => {
    const { container } = wrap(<MasterclassCoachChat openingId="not-a-real-opening" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('opens with a course-naming greeting and sends a scoped call', async () => {
    wrap(<MasterclassCoachChat openingId="caro-kann" variationName="Advance Variation" />);
    fireEvent.click(screen.getByTestId('masterclass-coach-open'));
    // Greeting names the course.
    expect(screen.getAllByText(/Caro-Kann Defence — Advance Variation/).length).toBeGreaterThan(0);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'what is the plan here?' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(mockCoach).toHaveBeenCalled());
    // The 2nd arg (systemPromptAddition) carries the course scope — so a
    // generic question still anchors the coach to the Caro Advance.
    const systemAddition = mockCoach.mock.calls[0][1];
    expect(systemAddition).toContain('MASTERCLASS COURSE SCOPE');
    expect(systemAddition).toContain('Caro-Kann');
    expect(systemAddition).toContain('Advance Variation');
  });
});
