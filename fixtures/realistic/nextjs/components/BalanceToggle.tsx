'use client';

import { useState } from 'react';

export function BalanceToggle({ balance }: { balance: string }) {
  const [hidden, setHidden] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <p className="t-display tabular-nums" aria-live="polite">
        {hidden ? '••••••' : `$${balance}`}
      </p>
      <button
        type="button"
        onClick={() => setHidden((h) => !h)}
        aria-pressed={hidden}
        className="inline-flex min-h-touch items-center rounded-md border border-border-strong px-4 text-body-small text-text"
      >
        {hidden ? 'Show balance' : 'Hide balance'}
      </button>
    </div>
  );
}
