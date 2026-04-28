'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/atoms';
import { useCartContext } from '@/components/providers';
import { toast } from '@/lib/helpers/toast';

const COMMIT_MS = 200;

export const UpdateCartItemButton = ({
  quantity,
  lineItemId,
  wholesaleBuyer = false,
  piecesPerCarton = 0,
}: {
  quantity: number;
  lineItemId: string;
  wholesaleBuyer?: boolean;
  piecesPerCarton?: number;
}) => {
  const { previewLineItemQuantity, commitLineItemQuantity, isUpdatingItem } =
    useCartContext();
  const [pendingQuantity, setPendingQuantity] = useState(quantity);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitQuantityRef = useRef(quantity);

  useEffect(() => {
    setPendingQuantity(quantity);
    commitQuantityRef.current = quantity;
  }, [quantity]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;

    const batch =
      Number.isFinite(piecesPerCarton) && piecesPerCarton > 0
        ? piecesPerCarton
        : 0;
    if (wholesaleBuyer && batch > 0 && newQuantity % batch !== 0) {
      toast.error({
        title: 'Quantità non valida',
        description: `Per questo articolo servono multipli di ${batch} pezzi (cartone).`,
      });
      return;
    }

    setPendingQuantity(newQuantity);
    commitQuantityRef.current = newQuantity;
    previewLineItemQuantity(lineItemId, newQuantity);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const q = commitQuantityRef.current;
      void (async () => {
        try {
          await commitLineItemQuantity(lineItemId, q);
        } catch (error: unknown) {
          setPendingQuantity(quantity);
          const errorMessage =
            error instanceof Error
              ? error.message.replace('Error setting up the request: ', '')
              : 'Failed to update quantity';
          toast.error({
            title: 'Error updating cart',
            description: errorMessage,
          });
        }
      })();
    }, COMMIT_MS);
  };

  const isDecreaseDisabled = pendingQuantity === 1 || isUpdatingItem || !lineItemId;
  const isIncreaseDisabled = isUpdatingItem || !lineItemId;

  return (
    <div className="mt-2 flex items-center gap-4">
      <Button
        variant="tonal"
        className="flex h-8 w-8 items-center justify-center"
        disabled={isDecreaseDisabled}
        onClick={() => handleQuantityChange(pendingQuantity - 1)}
      >
        -
      </Button>
      <span
        className={`font-medium transition-all duration-200 ${
          isDecreaseDisabled || isIncreaseDisabled
            ? 'scale-95 text-secondary opacity-70'
            : 'scale-100 text-primary opacity-100'
        }`}
      >
        {pendingQuantity}
      </span>
      <Button
        variant="tonal"
        className="flex h-8 w-8 items-center justify-center"
        disabled={isIncreaseDisabled}
        onClick={() => handleQuantityChange(pendingQuantity + 1)}
      >
        +
      </Button>
    </div>
  );
};
