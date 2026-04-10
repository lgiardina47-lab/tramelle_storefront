import { Cart } from '@/components/sections';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'Carrello',
  description: 'Il tuo carrello su Tramelle.',
};

export default function CartPage({}) {
  return (
    <main className='container grid grid-cols-12'>
      <Suspense fallback={<>Loading...</>}>
        <Cart />
      </Suspense>
    </main>
  );
}
