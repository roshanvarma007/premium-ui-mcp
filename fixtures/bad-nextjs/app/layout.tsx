'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  return (
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-950 text-white">{children}</body>
    </html>
  );
}
