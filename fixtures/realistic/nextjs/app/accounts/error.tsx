'use client';

export default function AccountsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center" role="alert">
      <h1 className="t-title">We could not load your accounts</h1>
      <p className="mt-2 text-body-small text-text-muted">Your money is safe. This is a display problem on our side.</p>
      <button type="button" onClick={reset} className="mt-6 inline-flex min-h-touch items-center rounded-md bg-accent px-6 text-on-accent">
        Try again
      </button>
    </main>
  );
}
