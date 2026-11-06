export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12" aria-busy="true">
      <div className="h-8 w-48 rounded-md bg-surface-alt motion-safe:animate-pulse" />
      <ul className="mt-6 grid gap-3">
        {[0, 1, 2].map((i) => (
          <li key={i} className="h-12 rounded-md bg-surface-alt motion-safe:animate-pulse" />
        ))}
      </ul>
      <span className="sr-only">Loading accounts</span>
    </main>
  );
}
