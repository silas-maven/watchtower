import './globals.css';
import type { Metadata } from 'next';
import { Inter, Fira_Code } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';
import { TopNav } from '@/components/TopNav';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { getSessionUser } from '@/lib/auth';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fira-code',
});

export const metadata: Metadata = {
  title: 'SPA',
  description: 'Stock Pickers Academy asset intelligence, watchlists, alerts, and admin controls.',
};

export const preferredRegion = 'fra1';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser().catch(() => null);

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className={`${inter.variable} ${firaCode.variable}`}>
        <body className="antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <ToastProvider>
              <TopNav initialUser={user}>{children}</TopNav>
            </ToastProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
