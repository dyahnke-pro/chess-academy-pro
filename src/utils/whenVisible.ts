/**
 * Resolves once the page is visible — at once when it already is (or there is
 * no document). iOS suspends a hidden app, and WebKit tears down the
 * IndexedDB transactions of a suspended page: a read STARTED while hidden dies
 * on resume with "Attempt to iterate a cursor that doesn't exist". Work that
 * can wait for the student to come back waits here before it reads.
 */
export function whenVisible(): Promise<void> {
  if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const onChange = (): void => {
      if (document.visibilityState === 'hidden') return;
      document.removeEventListener('visibilitychange', onChange);
      resolve();
    };
    document.addEventListener('visibilitychange', onChange);
  });
}
