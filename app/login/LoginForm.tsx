'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';

type Props = {
  nextPath: string;
};

export function LoginForm({ nextPath }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('owner@watchtower.demo');
  const [password, setPassword] = useState('demo-owner-123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.message ?? 'Login failed');
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Watchtower Login">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-zinc-600">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-zinc-600">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
        </div>
        {error && <div className="text-sm text-rose-700">{error}</div>}
        <button disabled={loading} className="w-full rounded-xl border border-zinc-200 bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </Card>
  );
}
