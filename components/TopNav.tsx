import Link from 'next/link';

export function TopNav() {
  return (
    <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight text-zinc-900">Watchtower</Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/community" className="text-zinc-700 hover:text-zinc-900">Community</Link>
          <Link href="/summary" className="text-zinc-700 hover:text-zinc-900">Daily Brief</Link>
          <Link href="/owner" className="text-zinc-700 hover:text-zinc-900">Owner</Link>
          <Link href="/admin" className="text-zinc-700 hover:text-zinc-900">Admin</Link>
        </div>
      </div>
    </div>
  );
}
