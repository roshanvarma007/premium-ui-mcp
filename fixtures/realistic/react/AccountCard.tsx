import { clsx } from 'clsx';

interface Props {
  name: string;
  balance: string;
  active?: boolean;
  onSelect: () => void;
}

export function AccountCard({ name, balance, active = false, onSelect }: Props) {
  return (
    <button
      type="button"
      className={clsx('card account', active && 'is-active')}
      aria-pressed={active}
      onClick={onSelect}
    >
      <span className="t-title">{name}</span>
      <span className={`t-headline num ${active ? 'account-balance-active' : ''}`}>${balance}</span>
    </button>
  );
}
