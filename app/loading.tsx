export default function GlobalLoading() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="text-sm font-semibold text-zinc-800">Loading…</div>
      <div className="mt-2 h-2 w-40 animate-pulse rounded bg-zinc-200" />
    </div>
  );
}

