import Image from 'next/image';
import Link from 'next/link';
import { getAccounts } from '../../lib/accounts';

export default async function AccountsPage() {
  const accounts = await getAccounts();
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="t-headline">Accounts</h1>
      <ul className="mt-6 divide-y divide-border rounded-md border border-border bg-surface">
        {accounts.map((a) => (
          <li key={a.id}>
            <Link href={`/accounts/${a.id}`} className="flex min-h-touch items-center justify-between px-6 py-4 text-text">
              <span className="text-body">{a.name}</span>
              <span className="text-body tabular-nums">${a.balance}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Image src="/illustrations/vault.png" alt="" width={320} height={200} className="mt-12" />
    </main>
  );
}
