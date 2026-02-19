'use client';

export function HelpTip({ text }: { text: string }) {
  return (
    <span
      title={text}
      aria-label={text}
      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-zinc-300 text-[10px] font-bold text-zinc-500"
    >
      ?
    </span>
  );
}
