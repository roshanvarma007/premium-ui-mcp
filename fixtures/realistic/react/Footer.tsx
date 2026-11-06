const links = [
  { href: '#add', label: 'Add money' },
  { href: '#faq', label: 'FAQ' },
  { href: '/legal/terms', label: 'Terms' },
  { href: 'https://status.example.com', label: 'Status' },
];

export function Footer() {
  return (
    <footer className="footer t-body-small t-muted">
      <nav aria-label="Footer">
        <ul className="footer-links">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>
      </nav>
      <p>© 2026 Ledgerline Ltd. Registered in England and Wales.</p>
    </footer>
  );
}
