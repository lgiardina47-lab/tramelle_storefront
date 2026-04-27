'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { COFOUNDER_DOC_PATH } from '@/lib/cofounder-gate';

export function CofounderEnterForm() {
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get('next');
  const next =
    nextRaw && nextRaw.startsWith('/cofounder/') && !nextRaw.startsWith('//')
      ? nextRaw
      : COFOUNDER_DOC_PATH;
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const r = await fetch('/api/cofounder/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, next }),
      });
      if (!r.ok) {
        setError('Password non valida.');
        return;
      }
      const j = (await r.json()) as { next?: string };
      window.location.href = j.next || COFOUNDER_DOC_PATH;
    } catch {
      setError('Errore di rete, riprova.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="sr-only">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-600/50"
          placeholder="Password"
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition enabled:hover:bg-zinc-200 disabled:opacity-50"
      >
        {pending ? 'Accesso…' : 'Accedi'}
      </button>
    </form>
  );
}
