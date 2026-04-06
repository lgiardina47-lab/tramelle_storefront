'use client';

import { createContext, useContext } from 'react';

import { Cart, StoreCartLineItemOptimisticUpdate } from '@/types/cart';

interface CartContextInterface {
  cart: Cart | null;
  /** @deprecated usare anche `proMode` (stesso valore: listino B2B / professionisti) */
  wholesaleBuyer: boolean;
  /** True se il cliente è nel gruppo B2B_Pro (o wholesale configurato): prezzi tier e stock in evidenza */
  proMode: boolean;
  onAddToCart: (item: StoreCartLineItemOptimisticUpdate, currency_code: string) => void;
  addToCart: (params: {
    variantId: string;
    quantity: number;
    countryCode: string;
    lineMetadata?: Record<string, string | number | boolean | null>;
  }) => Promise<void>;
  removeCartItem: (lineId: string) => Promise<void>;
  updateCartItem: (lineId: string, quantity: number) => Promise<void>;
  refreshCart: () => Promise<Cart | null>;
  isUpdating: boolean;
  isAddingItem: boolean;
  isUpdatingItem: boolean;
  isRemovingItem: boolean;
}

export const CartContext = createContext<CartContextInterface | null>(null);

export function useCartContext() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
}
