import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { requirePageUser } from '@/lib/server/pageAuth';

export default async function AccountPage() {
  const user = await requirePageUser('/app/account');
  return <div className="space-y-6"><div><h1 className="text-3xl font-black tracking-tight">Account</h1><p className="mt-2 text-sm text-slate-600">Clerk owns identity. SPA mirrors profile, role and manual access state.</p></div><Card title="Profile"><div className="grid gap-3 text-sm md:grid-cols-2"><div><div className="text-xs font-bold text-slate-500">Name</div><div className="font-black">{user.name}</div></div><div><div className="text-xs font-bold text-slate-500">Email</div><div className="font-black">{user.email}</div></div><div><div className="text-xs font-bold text-slate-500">Role</div><Badge tone="blue">{user.role}</Badge></div><div><div className="text-xs font-bold text-slate-500">Access</div><Badge tone={user.accessState === 'ACTIVE' ? 'emerald' : 'amber'}>{user.accessState}</Badge></div></div></Card></div>;
}
