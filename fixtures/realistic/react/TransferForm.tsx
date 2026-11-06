import { type FormEvent, useId, useState } from 'react';

export function TransferForm({ onSubmit }: { onSubmit: (amount: number) => void }) {
  const id = useId();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      setError('Enter an amount greater than $0.');
      return;
    }
    onSubmit(value);
  }

  return (
    <form className="stack" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${id}-amount`}>Amount</label>
        <input
          id={`${id}-amount`}
          className="input num"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && setAmount('')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p id={`${id}-error`} className="t-caption field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <button className="btn btn-primary" type="submit">
        Review transfer
      </button>
    </form>
  );
}
