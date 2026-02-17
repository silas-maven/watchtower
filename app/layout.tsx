import './globals.css';
import type { Metadata } from 'next';
import { TopNav } from '@/components/TopNav';

export const metadata: Metadata = {
  title: 'Watchtower',
  description: 'Mock watchlist + alerts dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900">
        <TopNav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
