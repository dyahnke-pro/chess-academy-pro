import { Link } from 'react-router-dom';
import { GraduationCap, Target, Brain, MessageCircle, Sparkles, Check } from 'lucide-react';

/**
 * LandingPage
 * -----------
 * Marketing page shown to visitors hitting the root domain before
 * they've committed to using the app. Linked from:
 *   - External marketing (tweets, Product Hunt, etc.)
 *   - Paywall / subscribe flow CTA
 *   - Eventually, root redirect for first-time visitors
 *
 * Kept intentionally simple: hero, value props, pricing, FAQ, footer.
 * Copy is written for a chess-improving adult (not kid mode), since
 * that's the audience paying $7.99/mo.
 *
 * IMPORTANT placeholders to swap before the real launch:
 *   - `support@chessacademy.pro` (your real email)
 *   - `chessacademy.pro` references (once the domain is live)
 *   - Social proof section (add real testimonials when you have them)
 */
export function LandingPage(): JSX.Element {
  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
      data-testid="landing-page"
    >
      {/* ── Top nav ───────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <GraduationCap
            size={22}
            style={{ color: 'var(--color-accent)' }}
          />
          <span className="font-bold text-lg">Chess Academy Pro</span>
        </div>
        <Link
          to="/"
          className="text-sm px-4 py-2 rounded-lg font-semibold"
          style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
          data-testid="landing-open-app"
        >
          Open app
        </Link>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="flex flex-col items-center text-center px-6 pt-16 pb-20 max-w-3xl mx-auto w-full">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-5"
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          <Sparkles size={12} /> AI-powered chess training
        </div>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
          The coach that actually watches your games.
        </h1>
        <p
          className="text-lg mb-8 leading-relaxed"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Import your Chess.com and Lichess games. Get a coach that narrates your
          play, spots your weaknesses, drills the openings you actually face, and
          runs puzzles tuned to the mistakes you keep making.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Link
            to="/"
            className="px-6 py-3 rounded-xl font-semibold text-base"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="landing-cta-trial"
          >
            Start 7-day free trial
          </Link>
          <a
            href="#pricing"
            className="text-sm underline"
            style={{ color: 'var(--color-text-muted)' }}
          >
            See pricing
          </a>
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          No credit card required to start. Cancel any time.
        </p>
      </section>

      {/* ── Value props ───────────────────────────────────────── */}
      <section
        className="px-6 py-16 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">
            Built for people who want to actually improve.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ValueCard
              icon={<MessageCircle size={20} />}
              title="Agent coach, not a chatbot"
              body="Ask 'analyze a previous game with me' and it pulls from your imported history — no PGN pasting. Ask 'play the KIA against me' and you're in a KIA game. Ask it to narrate while you play, and it does."
              color="rgb(251, 113, 133)"
            />
            <ValueCard
              icon={<Brain size={20} />}
              title="Weakness-tuned puzzles"
              body="Stockfish analyzes every move in every imported game, classifies your mistakes by theme, and generates puzzles from your own blunders. Spaced-repetition scheduling so you actually remember the lessons."
              color="rgb(139, 92, 246)"
            />
            <ValueCard
              icon={<Target size={20} />}
              title="Openings you actually play"
              body="Adaptive opening training against the specific lines you face online. Drilled variations, pawn-break walkthroughs, middlegame plans — all tied to the openings in your real repertoire, not generic theory."
              color="rgb(52, 211, 153)"
            />
            <ValueCard
              icon={<GraduationCap size={20} />}
              title="Voice coaching"
              body="Premium AI voice narrates your moves and the engine's response. Turn it on by saying 'narrate a game while we play.' Works hands-free on mobile and desktop."
              color="rgb(6, 182, 212)"
            />
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────── */}
      <section
        id="pricing"
        className="px-6 py-16 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-3">Simple pricing.</h2>
          <p
            className="text-center mb-10"
            style={{ color: 'var(--color-text-muted)' }}
          >
            One plan. 7-day free trial. Cancel any time.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PricingCard
              title="Monthly"
              price="$7.99"
              period="/ month"
              cta="Start free trial"
              features={PRO_FEATURES}
            />
            <PricingCard
              title="Yearly"
              price="$79.99"
              period="/ year"
              sublabel="~$6.67 / mo — save 17%"
              cta="Start free trial"
              features={PRO_FEATURES}
              highlighted
            />
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section
        className="px-6 py-16 border-t"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">
            Questions you probably have.
          </h2>
          <div className="space-y-6">
            <FaqItem
              q="Do I need a Chess.com or Lichess account?"
              a="No, but it's better if you do. Connect one (or both) to auto-import your games and get coaching tuned to how you actually play. You can also manually paste PGNs or play against the in-app coach."
            />
            <FaqItem
              q="Does it work on my phone?"
              a="Yes. The app is a Progressive Web App — open it in Safari or Chrome, tap 'Add to Home Screen' and it behaves like a native app. Works offline after first load."
            />
            <FaqItem
              q="What AI does it use?"
              a="DeepSeek for chat and coaching, with Anthropic's Claude as a fallback. Stockfish runs on your device for actual chess calculation. Your chess data stays on your device unless you explicitly share it."
            />
            <FaqItem
              q="Can I cancel?"
              a="Any time. Cancellation takes effect at the end of your current billing period, and you keep access until then. Your data stays on your device either way."
            />
            <FaqItem
              q="Is my data private?"
              a={
                <>
                  Yes — almost everything lives in your browser's local
                  database. See our{' '}
                  <Link
                    to="/legal/privacy"
                    className="underline"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    Privacy Policy
                  </Link>{' '}
                  for the details.
                </>
              }
            />
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer
        className="mt-auto px-6 py-10 border-t"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} style={{ color: 'var(--color-accent)' }} />
            <span className="font-semibold">Chess Academy Pro</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <Link to="/legal/privacy" className="hover:underline" data-testid="footer-privacy">
              Privacy
            </Link>
            <Link to="/legal/terms" className="hover:underline" data-testid="footer-terms">
              Terms
            </Link>
            <a
              href="mailto:support@chessacademy.pro"
              className="hover:underline"
              data-testid="footer-support"
            >
              Support
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

const PRO_FEATURES: string[] = [
  'Unlimited AI coaching chat',
  'Per-move voice narration during play',
  'Unlimited game imports + Stockfish analysis',
  'Weakness-tuned puzzle training',
  'Opening repertoire drilling',
  'Middlegame plans + game review',
  'Bring your own API key (optional)',
  'Works offline after first load',
];

interface ValueCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  color: string;
}

function ValueCard({ icon, title, body, color }: ValueCardProps): JSX.Element {
  return (
    <div
      className="rounded-xl p-5 border-2"
      style={{
        background: `color-mix(in srgb, ${color} 6%, transparent)`,
        borderColor: `color-mix(in srgb, ${color} 25%, transparent)`,
      }}
    >
      <div
        className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
      >
        {icon}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        {body}
      </p>
    </div>
  );
}

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  sublabel?: string;
  cta: string;
  features: string[];
  highlighted?: boolean;
}

function PricingCard({
  title,
  price,
  period,
  sublabel,
  cta,
  features,
  highlighted,
}: PricingCardProps): JSX.Element {
  const border = highlighted
    ? 'var(--color-accent)'
    : 'var(--color-border)';
  return (
    <div
      className="rounded-2xl p-6 border-2 flex flex-col gap-4"
      style={{
        background: 'var(--color-surface)',
        borderColor: border,
      }}
    >
      <div>
        <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          {title}
        </div>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-3xl font-bold">{price}</span>
          <span style={{ color: 'var(--color-text-muted)' }}>{period}</span>
        </div>
        {sublabel && (
          <div className="text-xs mt-1" style={{ color: 'var(--color-accent)' }}>
            {sublabel}
          </div>
        )}
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-accent)' }} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/"
        className="mt-auto text-center py-2.5 rounded-lg font-semibold"
        style={{
          background: highlighted ? 'var(--color-accent)' : 'var(--color-bg)',
          color: highlighted ? 'var(--color-bg)' : 'var(--color-text)',
          border: `1px solid var(--color-accent)`,
        }}
        data-testid={`landing-pricing-cta-${title.toLowerCase()}`}
      >
        {cta}
      </Link>
    </div>
  );
}

interface FaqItemProps {
  q: string;
  a: React.ReactNode;
}

function FaqItem({ q, a }: FaqItemProps): JSX.Element {
  return (
    <div>
      <h3 className="font-semibold text-base mb-1.5">{q}</h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
        {a}
      </p>
    </div>
  );
}
