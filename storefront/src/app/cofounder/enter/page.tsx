import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CofounderEnterForm } from './cofounder-enter-form';

export const metadata: Metadata = {
  title: 'Accesso — Cofounder',
  description: 'Accesso al documento riservato.',
  robots: { index: false, follow: false },
};

function EnterFallback() {
  return <div className="mt-6 h-32 animate-pulse rounded-lg bg-zinc-800/50" />;
}

export default function CofounderEnterPage() {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl">
        <h1 className="font-serif text-xl tracking-tight text-white">Documento cofounder</h1>
        <p className="mt-2 text-sm text-zinc-400">Inserisci la password per continuare.</p>
        <Suspense fallback={<EnterFallback />}>
          <CofounderEnterForm />
        </Suspense>
      </div>
    </div>
  );
}
