// Server Component: styled with Tailwind theme utilities only. The toggle is the only
// Client Component on the page.
import { ThemeToggle } from '../components/theme/ThemeToggle';

const plans = [
  { name: 'Personal', price: '0', note: 'One account, card controls, monthly statements.' },
  { name: 'Household', price: '6', note: 'Shared spaces, bill splitting and two cards.', featured: true },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-6">
      <header className="flex min-h-16 items-center justify-between">
        <span className="t-title">Ledgerline</span>
        <nav aria-label="Main" className="flex items-center gap-6">
          <a href="#pricing" className="text-body-small text-text">
            Pricing
          </a>
          <ThemeToggle className="inline-flex size-touch items-center justify-center rounded-md border border-border-strong text-text" />
        </nav>
      </header>

      <main>
        <section className="py-24" aria-labelledby="hero-title">
          <p className="t-label text-text-muted">For households that budget together</p>
          <h1 id="hero-title" className="t-display mt-3 max-w-2xl">
            See every bill before it is due
          </h1>
          <p className="mt-4 max-w-xl text-body text-text-muted">
            Ledgerline shows shared balances, upcoming bills and who paid what, in one calm view.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#pricing"
              className="inline-flex min-h-touch items-center rounded-md bg-accent px-6 font-semibold text-on-accent"
            >
              Open an account
            </a>
            <a
              href="/legacy"
              className="inline-flex min-h-touch items-center rounded-md border border-border-strong px-6 text-text"
            >
              Pages Router demo
            </a>
          </div>
        </section>

        <section id="pricing" className="border-t border-border py-24" aria-labelledby="pricing-title">
          <h2 id="pricing-title" className="t-headline">
            Pricing
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {plans.map((p) => (
              <article
                key={p.name}
                className={`rounded-md border bg-surface p-6 ${p.featured ? 'border-accent' : 'border-border'}`}
              >
                <h3 className="t-title">{p.name}</h3>
                <p className="t-headline mt-4 tabular-nums">
                  ${p.price}
                  <span className="text-body text-text-muted"> per month</span>
                </p>
                <p className="mt-2 text-body-small text-text-muted">{p.note}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
