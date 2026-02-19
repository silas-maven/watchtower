import './globals.css';
import type { Metadata } from 'next';
import { TopNav } from '@/components/TopNav';
import { ToastProvider } from '@/components/ui/ToastProvider';

export const metadata: Metadata = {
  title: 'Watchtower',
  description: 'Mock watchlist + alerts dashboard',
};

// Keep server rendering close to Supabase (eu-central) to reduce roundtrip latency.
export const preferredRegion = 'fra1';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900">
        <ToastProvider>
          <TopNav />
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
