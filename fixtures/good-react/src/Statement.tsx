import { useReducedMotion } from './theme/useReducedMotion';

interface Bill {
  id: string;
  payee: string;
  due: string;
  amount: string;
}

export function Statement({ bills, onPay }: { bills: Bill[]; onPay: (id: string) => void }) {
  const reduce = useReducedMotion();
  if (bills.length === 0) {
    return (
      <section className="card" aria-labelledby="empty-title">
        <h2 id="empty-title" className="t-title">No bills due</h2>
        <p className="t-body-small t-muted">New bills appear here a week before they are due.</p>
      </section>
    );
  }
  return (
    <ul className="list card" data-animate={reduce ? 'off' : 'on'}>
      {bills.map((b) => (
        <li key={b.id} className="row">
          <span>
            <span className="t-body">{b.payee}</span>
            <span className="t-caption t-muted row-date">Due {b.due}</span>
          </span>
          <button type="button" className="btn btn-secondary" onClick={() => onPay(b.id)}>
            Pay <span className="num">${b.amount}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
