import Link from 'next/link';

export function TopNav() {
  return (
    <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight text-zinc-900">Watchtower</Link>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-zinc-700 hover:text-zinc-900">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
