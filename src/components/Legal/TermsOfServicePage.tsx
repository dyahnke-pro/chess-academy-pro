import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Terms of Service — straightforward SaaS terms. Written for a small
 * single-operator product, not an enterprise SLA. Covers
 * subscription terms, acceptable use, IP, warranties, liability,
 * and governing law.
 *
 * IMPORTANT: Before real traction, have a lawyer review. Specifically:
 * governing law, liability cap, and arbitration clause if added.
 * Update the company name, business address, and jurisdiction once
 * those are real.
 */
export function TermsOfServicePage(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-6 max-w-3xl mx-auto w-full overflow-y-auto pb-20">
      <Link
        to="/"
        className="flex items-center gap-2 text-sm"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <ArrowLeft size={16} /> Back
      </Link>

      <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>Terms of Service</h1>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Effective date: April 17, 2026. Last updated: April 17, 2026.
      </p>

      <Section title="Acceptance">
        <p>
          By using Chess Academy Pro ("the Service"), you agree to
          these Terms. If you don't agree, don't use the Service.
          You must be at least 13 years old to use the Service.
        </p>
      </Section>

      <Section title="What the Service does">
        <p>
          Chess Academy Pro is a chess training product that includes
          AI-powered coaching, game analysis, puzzles, opening
          training, and related features. Features are added and
          removed over time; we make no guarantee that any specific
          feature will remain available.
        </p>
      </Section>

      <Section title="Subscriptions, trials, and billing">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Free trial:</strong> new users get a 7-day free
            trial of the full product. No payment is required to start
            the trial; you must provide payment info to convert to a
            paid subscription afterward.
          </li>
          <li>
            <strong>Pricing:</strong> $7.99 USD per month or $79.99 USD
            per year, billed in advance through Stripe. We may change
            prices with at least 30 days notice for existing
            subscribers; your current billing period is unaffected.
          </li>
          <li>
            <strong>Auto-renewal:</strong> subscriptions automatically
            renew at the end of each billing period unless you cancel
            before renewal.
          </li>
          <li>
            <strong>Cancellation:</strong> cancel any time from
            Settings → Subscription. Cancellation takes effect at the
            end of the current billing period; you keep access until
            then.
          </li>
          <li>
            <strong>Refunds:</strong> charges are non-refundable except
            where required by law. If you believe you were charged in
            error, contact support and we will review in good faith.
          </li>
          <li>
            <strong>Failed payments:</strong> if your payment method
            fails, we will retry for up to 14 days. During that time
            your access may be limited. If payment cannot be recovered
            your subscription will be cancelled.
          </li>
        </ul>
      </Section>

      <Section title="Your account">
        <p>
          You are responsible for activity under your account. Don't
          share your account with others. If you suspect unauthorized
          access, notify us at{' '}
          <a
            href="mailto:support@chessacademy.pro"
            className="underline"
            style={{ color: 'var(--color-accent)' }}
          >
            support@chessacademy.pro
          </a>
          .
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc pl-6 space-y-1.5 mt-2">
          <li>use the Service to violate any law;</li>
          <li>
            attempt to reverse engineer, decompile, or extract the
            underlying models, prompts, or code — except to the
            extent permitted by applicable law;
          </li>
          <li>
            use the Service in a manner that imposes unusual or
            disproportionately large load on our infrastructure, or
            otherwise interferes with other users;
          </li>
          <li>
            scrape, resell, or repackage Service output as a
            competitive AI chess product;
          </li>
          <li>
            submit content you do not have the right to submit, or
            that infringes someone else's rights.
          </li>
        </ul>
      </Section>

      <Section title="AI output">
        <p>
          The Service uses third-party AI models (currently DeepSeek
          and Anthropic) to generate coaching feedback. AI output may
          be inaccurate, incomplete, or inappropriate for every
          situation. Use your judgment — especially in over-the-board
          or rated play — and don't rely on AI output as the sole
          basis for an important decision.
        </p>
      </Section>

      <Section title="Intellectual property">
        <p>
          The Service — including all software, content we create,
          curated annotations, narrations, and design — is owned by
          the operator and protected by copyright. You retain
          ownership of games and content you upload or create in the
          Service.
        </p>
        <p className="mt-2">
          You grant us a license to process your content solely to
          provide the Service (e.g. sending game context to the AI
          coach so it can respond).
        </p>
      </Section>

      <Section title="Third-party services">
        <p>
          The Service integrates Stripe (payments), RevenueCat
          (subscription management), DeepSeek and Anthropic (AI),
          Amazon Polly (text-to-speech), and Vercel (hosting). Your
          use of the Service is also subject to the applicable terms
          of these third parties.
        </p>
      </Section>

      <Section title="Warranties and disclaimers">
        <p>
          The Service is provided "as is" and "as available" without
          warranties of any kind, express or implied. We do not
          warrant that the Service will be uninterrupted, error-free,
          or suited to your particular needs.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the maximum extent permitted by law, the operator's
          aggregate liability arising out of or relating to the
          Service will not exceed the greater of $100 USD or the
          total amount you paid for the Service in the twelve months
          before the event giving rise to liability. In no event
          will we be liable for indirect, incidental, special,
          consequential, or punitive damages.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These Terms are governed by the laws of the State of
          Delaware, USA, without regard to its conflict-of-laws
          rules. Any dispute not resolvable by good-faith discussion
          will be heard in the state or federal courts located in
          Delaware.
        </p>
      </Section>

      <Section title="Changes to these Terms">
        <p>
          We may update these Terms from time to time. If the changes
          are material, we will notify you in the app before they take
          effect. Continued use after the effective date of updated
          Terms constitutes acceptance.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about these Terms? Email{' '}
          <a
            href="mailto:support@chessacademy.pro"
            className="underline"
            style={{ color: 'var(--color-accent)' }}
          >
            support@chessacademy.pro
          </a>
          .
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
