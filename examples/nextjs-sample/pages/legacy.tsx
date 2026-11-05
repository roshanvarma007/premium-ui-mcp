// Pages Router route, so the generated _document and _app are built and exercised too.
import { ThemeToggle } from '../components/theme/ThemeToggle';

export default function Legacy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <p className="t-label text-text-muted">Pages Router</p>
      <h1 className="t-headline mt-3">Statements</h1>
      <p className="mt-4 text-body text-text-muted">
        Same tokens, same fonts, same theme switch, rendered by pages/_app and pages/_document.
      </p>
      <div className="mt-8">
        <ThemeToggle className="inline-flex size-touch items-center justify-center rounded-md border border-border-strong text-text" />
      </div>
    </main>
  );
}
