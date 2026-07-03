import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AiConsentModal } from './AiConsentModal';
import { useAppStore } from '../../stores/appStore';
import { useAiConsentStore } from '../../stores/aiConsentStore';
import { buildUserProfile } from '../../test/factories';
import { db } from '../../db/schema';

function renderModal(): void {
  render(
    <MemoryRouter>
      <AiConsentModal />
    </MemoryRouter>,
  );
}

describe('AiConsentModal', () => {
  beforeEach(async () => {
    useAiConsentStore.setState({ promptOpen: false, _resolve: null });
    await db.profiles.clear();
    const profile = buildUserProfile({ aiDataConsent: undefined });
    await db.profiles.put(profile);
    useAppStore.setState({ activeProfile: profile });
    useAiConsentStore.setState({ promptOpen: true });
  });

  it('persists a granted decision to Dexie so it survives a full app close', async () => {
    const { id } = useAppStore.getState().activeProfile!;
    renderModal();

    fireEvent.click(screen.getByTestId('ai-consent-allow'));

    // In-memory state updated…
    expect(useAppStore.getState().activeProfile?.aiDataConsent).toBe('granted');
    // …AND persisted to Dexie — the write that was missing, which caused the
    // modal to re-prompt on every cold boot.
    await waitFor(async () => {
      const persisted = await db.profiles.get(id);
      expect(persisted?.aiDataConsent).toBe('granted');
    });
  });

  it('persists a denied decision to Dexie', async () => {
    const { id } = useAppStore.getState().activeProfile!;
    renderModal();

    fireEvent.click(screen.getByTestId('ai-consent-deny'));

    expect(useAppStore.getState().activeProfile?.aiDataConsent).toBe('denied');
    await waitFor(async () => {
      const persisted = await db.profiles.get(id);
      expect(persisted?.aiDataConsent).toBe('denied');
    });
  });
});
