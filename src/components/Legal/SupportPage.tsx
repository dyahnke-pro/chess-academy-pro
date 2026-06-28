import { Link } from 'react-router-dom';

/**
 * Support page — reachable at /support on the production domain so it doubles
 * as the hosted Support URL the App Store requires (App Store Connect mandates
 * a working support URL for every app). Standalone route (no app chrome).
 */
const CONTACT_EMAIL = 'dyahnke@gmail.com';

export function SupportPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-200">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-[#c9a84c]">Support</h1>
          <p className="mt-1 text-sm text-zinc-400">Chess Academy Pro</p>
        </header>

        <Section title="Get help">
          <p>
            Need a hand, hit a bug, or have a feature request? Email{' '}
            <a className="text-[#c9a84c] underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>{' '}
            and we'll get back to you. Include your device and what you were doing
            when something went wrong — it speeds up the fix.
          </p>
        </Section>

        <Section title="Managing your subscription">
          <p>
            Chess Academy Pro is a $7.99/month subscription with a 7-day free
            trial for new subscribers. You manage or cancel it in your store
            account, not in the app:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>iPhone / iPad:</strong> Settings → tap your name → Subscriptions
              → Chess Academy Pro.
            </li>
            <li>
              <strong>Android:</strong> Google Play → profile → Payments &amp;
              subscriptions → Subscriptions → Chess Academy Pro.
            </li>
          </ul>
          <p className="mt-2">
            Restored a device or switched phones? Open the app's paywall and tap{' '}
            <em>Restore Purchases</em>.
          </p>
        </Section>

        <Section title="Privacy &amp; terms">
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <Link to="/privacy" className="text-[#c9a84c] underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="text-[#c9a84c] underline">
                Terms of Service
              </Link>
            </li>
          </ul>
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
