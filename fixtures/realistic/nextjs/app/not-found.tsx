import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-24">
      <p className="t-label text-text-muted">404</p>
      <h1 className="t-headline mt-3">This page does not exist</h1>
      <p className="mt-4 text-body text-text-muted">It may have moved. Your dashboard has everything in one place.</p>
      <Link href="/" className="mt-8 inline-flex min-h-touch items-center rounded-md border border-border-strong px-6 text-text">
        Go to dashboard
      </Link>
    </main>
  );
}
