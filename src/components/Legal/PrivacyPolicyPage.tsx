import { Link } from 'react-router-dom';

/**
 * Privacy policy — reachable at /privacy on the production domain, so
 * it doubles as the hosted privacy-policy URL the App Store and Google
 * Play both require. Standalone route (no app chrome) so a store
 * reviewer opening the link sees a clean, self-contained page.
 *
 * Keep this in sync with the actual data flows:
 *  - Local-first: all training data (games, puzzles, openings, SRS,
 *    progress) lives in on-device IndexedDB (Dexie). No account required.
 *  - Optional cloud sync via Supabase when the user opts in.
 *  - Voice: microphone is used ONLY for in-app voice chat with the coach;
 *    audio is processed for speech-to-text and not stored.
 *  - Network: chess moves / prompts are sent to the AI providers
 *    (DeepSeek / Anthropic) for coaching responses, to AWS Polly for
 *    text-to-speech, and to Lichess / Chess.com when the user imports
 *    their games. No data is sold.
 */
const LAST_UPDATED = 'June 1, 2026';
const CONTACT_EMAIL = 'dyahnke@gmail.com';

export function PrivacyPolicyPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-200">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-[#c9a84c]">Privacy Policy</h1>
          <p className="mt-1 text-sm text-zinc-400">Chess Academy Pro</p>
          <p className="mt-1 text-xs text-zinc-500">Last updated: {LAST_UPDATED}</p>
        </header>

        <Section title="The short version">
          <p>
            Chess Academy Pro is built to keep your data on your device. Your
            games, puzzles, opening progress, and settings are stored locally in
            your browser/app storage — not on our servers. You don't need an
            account to use the app. We don't sell your data. The only data that
            leaves your device is what's needed to power the features you use:
            AI coaching, voice, and game import.
          </p>
        </Section>

        <Section title="What we store on your device">
          <p>
            The app stores the following locally (IndexedDB), under your control
            and deletable at any time by clearing app data:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Imported games and their analysis</li>
            <li>Puzzle history, spaced-repetition cards, and opening progress</li>
            <li>Your profile preferences (difficulty, voice, theme)</li>
            <li>Coaching chat history for the current session</li>
          </ul>
        </Section>

        <Section title="Microphone">
          <p>
            If you use voice chat with the coach, the app accesses your
            microphone <em>only</em> while you're actively talking to it. Audio
            is used for live speech-to-text so the coach can hear your question.
            We do not record, store, or share your microphone audio. You can use
            the entire app with the microphone disabled — voice is optional.
          </p>
        </Section>

        <Section title="Data sent to third parties">
          <p>To provide AI coaching and voice, limited data is sent to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>AI providers (DeepSeek, Anthropic):</strong> the chess
              position, your question, and relevant context are sent to generate
              coaching responses.
            </li>
            <li>
              <strong>AWS Polly:</strong> the coach's text response is sent to
              synthesize spoken audio (text-to-speech).
            </li>
            <li>
              <strong>Lichess / Chess.com:</strong> when you import games, your
              public username is sent to fetch your game archive.
            </li>
          </ul>
          <p className="mt-2">
            These providers process the data to deliver the feature and under
            their own privacy terms. We do not send them your name, email, or
            payment information.
          </p>
        </Section>

        <Section title="Optional cloud sync">
          <p>
            If you choose to enable cloud sync, your training data is backed up
            to a Supabase database so you can restore it on another device. This
            is off by default and entirely opt-in. Disabling it and clearing app
            data removes the local copy; you may request deletion of any
            synced copy by contacting us.
          </p>
        </Section>

        <Section title="Children">
          <p>
            The app includes a kid-friendly section designed for young learners.
            It does not request personal information, does not include ads or
            third-party tracking, and the AI coach in kid mode runs under a
            restricted, safety-first prompt. Voice and chat in kid mode follow
            the same microphone rules above.
          </p>
        </Section>

        <Section title="Analytics">
          <p>
            We use privacy-respecting product analytics to understand which
            features are used and to fix bugs. Events are tied to an anonymous
            device identifier, not to your real identity.
          </p>
        </Section>

        <Section title="Your choices">
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Use the app without an account.</li>
            <li>Disable the microphone — voice features become text-only.</li>
            <li>Clear all local data from the app's settings or your device.</li>
            <li>Leave cloud sync off (the default).</li>
          </ul>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy or a data request? Email{' '}
            <a className="text-[#c9a84c] underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <footer className="mt-10 border-t border-zinc-800 pt-6 text-sm text-zinc-500">
          <Link to="/" className="text-[#c9a84c] underline">
            ← Back to the app
          </Link>
        </footer>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-semibold text-zinc-100">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-zinc-300">{children}</div>
    </section>
  );
}
