import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Privacy Policy — plain, honest, short. Covers what's collected,
 * where it's stored, who it's shared with, and how to delete it.
 *
 * IMPORTANT: Update the support email + effective date once real
 * values are known. Update the AI-provider list if you swap
 * DeepSeek for something else.
 */
export function PrivacyPolicyPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-6 max-w-3xl mx-auto w-full overflow-y-auto pb-20">
      <Link
        to="/"
        className="flex items-center gap-2 text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft size={16} /> Back
      </Link>

      <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Privacy Policy</h1>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Effective date: April 17, 2026. Last updated: April 17, 2026.
      </p>

      <Section title="The short version">
        <p>
          Chess Academy Pro stores your chess data (imported games,
          training progress, chat history) on your device. Your data is
          not sold, and we share it with third parties only to deliver
          core features (AI coaching, payments) — described below. You
          can delete everything at any time.
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Account &amp; profile:</strong> your display name,
            rating preferences, coach settings, and (optionally)
            Chess.com / Lichess usernames you choose to link.
          </li>
          <li>
            <strong>Chess data:</strong> games you import or play in the
            app, annotations, puzzle attempts, opening-training
            progress, and chat messages with the AI coach.
          </li>
          <li>
            <strong>Device data:</strong> anonymous analytics (page
            views, feature usage, performance) via Vercel Analytics.
            No cookies, no ad tracking, no cross-site fingerprinting.
          </li>
          <li>
            <strong>Subscription data:</strong> if you subscribe, Stripe
            (via RevenueCat) stores your payment method and transaction
            history. We receive a subscription status (active, trial,
            cancelled) and billing receipts — we never see your card
            number.
          </li>
          <li>
            <strong>AI API keys (optional):</strong> if you choose to
            bring your own API key (DeepSeek / Anthropic), it is stored
            encrypted on your device only. It is never sent to our
            servers.
          </li>
        </ul>
      </Section>

      <Section title="Where it's stored">
        <p>
          Almost all your data lives on your device in IndexedDB. Games,
          puzzles, chat history, and AI API keys never leave your
          browser. The app works offline once loaded.
        </p>
        <p className="mt-2">
          Subscription status is synced through RevenueCat. AI coaching
          requests are sent to our AI providers (see next section) only
          when you explicitly interact with the coach.
        </p>
      </Section>

      <Section title="Who we share data with">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>DeepSeek</strong> (primary AI provider) and{' '}
            <strong>Anthropic</strong> (fallback) — chat messages and
            chess positions are sent when you interact with the AI
            coach, so it can respond. These providers process the data
            per their own privacy policies and do not receive account
            identifiers from us.
          </li>
          <li>
            <strong>Amazon Polly</strong> (via our own server proxy) —
            text-to-speech conversion for coach narration. Only the
            text being spoken is sent; no account data.
          </li>
          <li>
            <strong>Stripe</strong> and <strong>RevenueCat</strong> —
            payment processing and subscription management.
          </li>
          <li>
            <strong>Vercel</strong> — web hosting and anonymous
            analytics.
          </li>
        </ul>
        <p className="mt-2">
          We do not sell your data. We do not share data with
          advertisers. We do not use your chess history to train AI
          models.
        </p>
      </Section>

      <Section title="Your rights">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Delete:</strong> clear all local data from Settings
            → About → Reset. This wipes every game, puzzle, chat
            message, and setting.
          </li>
          <li>
            <strong>Export:</strong> download a JSON of your entire
            profile from Settings → About → Export.
          </li>
          <li>
            <strong>Cancel subscription:</strong> manage or cancel any
            time from Settings → Subscription. Cancellations take
            effect at the end of the current billing period.
          </li>
          <li>
            <strong>Contact us:</strong> privacy questions,
            data-deletion requests, or anything else — email{' '}
            <a
              href="mailto:support@chessacademy.pro"
              className="underline"
              style={{ color: 'var(--color-accent)' }}
            >
              support@chessacademy.pro
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section title="Children">
        <p>
          Chess Academy Pro is not directed to children under 13. If you
          believe a child has provided personal information, contact us
          and we will delete it.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If we change this policy we will update the "Last updated"
          date at the top of this page. Material changes will be
          surfaced in the app before they take effect.
        </p>
      </Section>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps): JSX.Element {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold mt-4" style={{ color: 'var(--color-text)' }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>
        {children}
      </div>
    </section>
  );
}
