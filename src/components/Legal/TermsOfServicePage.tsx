import { Link } from 'react-router-dom';
import { PRICE_MONTHLY, PRICE_YEARLY, TRIAL_DAYS } from '../../data/pricing';

/**
 * Terms of Service / EULA — reachable at /terms on the production domain so it
 * doubles as the hosted Terms URL the App Store and Google Play require, and
 * the EULA linked from the subscription paywall (Apple Guideline 3.1.2 requires
 * functional Terms + Privacy links wherever an auto-renewable subscription is
 * offered). Standalone route (no app chrome).
 *
 * The subscription terms come from `src/data/pricing.ts` — a comment asking a
 * human to "keep them in sync with the live offering" is exactly how a Terms
 * page ends up stating a price the store no longer charges.
 */
const LAST_UPDATED = 'June 28, 2026';
const CONTACT_EMAIL = 'dyahnke@gmail.com';

export function TermsOfServicePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-200">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-[#c9a84c]">Terms of Service</h1>
          <p className="mt-1 text-sm text-zinc-400">Chess Academy Pro</p>
          <p className="mt-1 text-xs text-zinc-500">Last updated: {LAST_UPDATED}</p>
        </header>

        <Section title="Acceptance">
          <p>
            By downloading or using Chess Academy Pro (the "App"), you agree to
            these Terms of Service. If you don't agree, don't use the App.
          </p>
        </Section>

        <Section title="What the App is">
          <p>
            Chess Academy Pro is a chess training app: an AI coach, opening
            masterclasses, tactics puzzles, and game analysis. It's a learning
            tool — engine evaluations and coaching are provided for educational
            purposes and may not always be perfect.
          </p>
        </Section>

        <Section title="Subscriptions, free trial, and billing">
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              Chess Academy Pro is offered as an auto-renewable subscription:{' '}
              <strong>{PRICE_MONTHLY} per month</strong> or <strong>{PRICE_YEARLY} per year</strong>{' '}
              (or the equivalent in your local currency as shown in the App at
              purchase). You choose the plan at checkout.
            </li>
            <li>
              New subscribers may be offered a <strong>{TRIAL_DAYS}-day free trial</strong>.
              Starting the trial requires confirming the subscription with your
              store account (a payment method on file). If you don't cancel at
              least 24 hours before the trial ends, it automatically converts to
              the paid plan you selected.
            </li>
            <li>
              Payment is charged to your Apple ID (App Store) or Google account
              (Google Play) at confirmation of purchase.
            </li>
            <li>
              The subscription renews automatically each month unless you turn off
              auto-renew at least 24 hours before the end of the current period.
              Your account is charged for renewal within 24 hours of the period's
              end.
            </li>
            <li>
              You manage and cancel your subscription in your App Store or Google
              Play account settings, not inside the App. Deleting the App does not
              cancel your subscription.
            </li>
            <li>
              Any unused portion of a free trial is forfeited when you purchase a
              subscription, where applicable.
            </li>
          </ul>
          <p className="mt-2">
            Refunds are handled by Apple or Google under their respective policies;
            we can't issue store refunds directly.
          </p>
        </Section>

        <Section title="Acceptable use">
          <p>
            Use the App for personal, non-commercial chess training. Don't
            attempt to reverse-engineer, resell, or abuse the service (including
            automated scraping of the AI coach). We may suspend access for misuse.
          </p>
        </Section>

        <Section title="Your content and data">
          <p>
            Your training data lives on your device. Optional cloud sync and the
            data sent to power AI coaching and voice are described in our{' '}
            <Link to="/privacy" className="text-[#c9a84c] underline">
              Privacy Policy
            </Link>
            .
          </p>
        </Section>

        <Section title="Disclaimer and liability">
          <p>
            The App is provided "as is," without warranties of any kind. To the
            maximum extent permitted by law, we aren't liable for any indirect or
            consequential damages arising from your use of the App.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            We may update these Terms. Continued use after an update means you
            accept the revised Terms. Material changes will be reflected by the
            "last updated" date above.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about these Terms? Email{' '}
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
