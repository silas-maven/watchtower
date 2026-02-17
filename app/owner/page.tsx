import Link from 'next/link';
import { Card } from '@/components/Card';

export default function OwnerPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm font-semibold text-blue-700">← Dashboard</Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Owner / Admin (mock)</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Business owner view: manage members, master watchlist entries, and automation settings. UI-only for now.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Member Access (planned)">
          <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
            <li>Invite / remove members</li>
            <li>Access tiers (free/paid/admin)</li>
            <li>Expiry dates + audit log</li>
          </ul>
        </Card>
        <Card title="Watchlist Management (planned)">
          <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
            <li>Add/remove assets</li>
            <li>Edit targets (entry/exit), notes, tags</li>
            <li>Bulk import from Google Sheets/Excel</li>
          </ul>
        </Card>
        <Card title="Automations (planned)">
          <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-1">
            <li>Scheduled daily AI brief</li>
            <li>Alert cooldown + delivery channels</li>
            <li>Exception report: missing/stale data</li>
          </ul>
        </Card>
        <Card title="Existing Admin UI" right={<Link className="text-sm font-semibold text-blue-700" href="/admin">Open →</Link>}>
          <div className="text-sm text-zinc-600">Current mock admin page (levels-style editor) at /admin.</div>
        </Card>
      </div>
    </div>
  );
}
