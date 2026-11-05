import { ThemeToggle } from './theme/ThemeToggle';

const accounts = [
  { name: 'Everyday', detail: 'Current account ·· 4021', balance: '8,214.30' },
  { name: 'Savings', detail: '3.1% a year ·· 7730', balance: '4,266.26' },
];

const activity = [
  { name: 'Northside Grocers', date: 'Today', amount: '− 48.20' },
  { name: 'Salary · Halden & Co.', date: 'Yesterday', amount: '+ 3,250.00', incoming: true },
  { name: 'City Water Utility', date: '3 Nov', amount: '− 62.75' },
];

export function App() {
  return (
    <div className="page">
      <header className="topbar">
        <span className="t-title">Ledgerline</span>
        <ThemeToggle className="btn btn-secondary" />
      </header>

      <main className="content">
        <section aria-labelledby="balance-title">
          <p id="balance-title" className="t-label t-muted">
            Total balance
          </p>
          <p className="t-display balance">
            <span className="t-muted">$</span>12,480<span className="t-muted">.56</span>
          </p>
          <div className="actions">
            <button type="button" className="btn btn-primary">
              Send money
            </button>
            <button type="button" className="btn btn-secondary">
              Add account
            </button>
          </div>
        </section>

        <section className="grid" aria-label="Accounts">
          {accounts.map((a) => (
            <article key={a.name} className="card">
              <h2 className="t-title">{a.name}</h2>
              <p className="t-caption t-muted">{a.detail}</p>
              <p className="t-headline num account-balance">${a.balance}</p>
            </article>
          ))}
        </section>

        <section aria-labelledby="activity-title">
          <h2 id="activity-title" className="t-title">
            Recent activity
          </h2>
          <ul className="list card">
            {activity.map((t) => (
              <li key={t.name} className="row">
                <span>
                  <span className="t-body">{t.name}</span>
                  <span className="t-caption t-muted row-date">{t.date}</span>
                </span>
                <span className={`t-body num ${t.incoming ? 'positive' : ''}`}>${t.amount}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
