'use client';

import { PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';

import {
  deleteLineItem as apiDeleteLineItem,
  updateLineItem as apiUpdateLineItem,
  retrieveCart
} from '@/lib/data/cart';
import { getCartMinimumOrderViolations } from '@/lib/data/seller-minimum-order';
import { Cart, StoreCartLineItemOptimisticUpdate } from '@/types/cart';

import { CartContext } from './context';

interface CartProviderProps extends PropsWithChildren {
  cart: Cart | null;
  wholesaleBuyer?: boolean;
}

export function CartProvider({
  cart,
  children,
  wholesaleBuyer = false,
}: CartProviderProps) {
  const [cartState, setCartState] = useState(cart);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingItem, setIsUpdatingItem] = useState(false);
  const [isRemovingItem, setIsRemovingItem] = useState(false);

  const minimumOrderViolations = useMemo(
    () =>
      cartState && (cartState.currency_code || '').toLowerCase() === 'eur'
        ? getCartMinimumOrderViolations(cartState)
        : [],
    [cartState]
  );

  useEffect(() => {
    setCartState(cart);
  }, [cart]);

  const refreshCart = useCallback(async () => {
    try {
      const cartData = await retrieveCart();
      setCartState(cartData);
      return cartData;
    } catch (error) {
      console.error('Error fetching cart:', error);
      return null;
    }
  }, []);

  function handleAddToCart(newItem: StoreCartLineItemOptimisticUpdate, currency_code: string) {
    setCartState(prev => {
      const currentItems = prev?.items || [];
      const isNewItemInCart = currentItems.find(
        ({ variant_id }) => variant_id === newItem.variant_id
      );

      if (isNewItemInCart) {
        const updatedItems = currentItems.map(currentItem => {
          if (currentItem.variant_id !== newItem.variant_id) {
            return currentItem;
          }

          const newQuantity = currentItem.quantity + (newItem?.quantity || 0);
          return {
            ...currentItem,
            quantity: newQuantity,
            subtotal: newQuantity * (newItem?.subtotal || 0),
            total: newQuantity * (newItem?.total || 0),
            tax_total: newQuantity * (newItem?.tax_total || 0)
          };
        }) as StoreCartLineItemOptimisticUpdate[];

        const { item_subtotal, total, tax_total } = getItemsSummaryValues(updatedItems);

        return {
          ...prev,
          items: updatedItems,
          item_subtotal,
          total,
          tax_total,
          currency_code
        } as Cart;
      }

      const q = Math.max(1, newItem.quantity || 1);
      const perSub = newItem.subtotal || 0;
      const perTot = newItem.total || 0;
      const perTax = newItem.tax_total || 0;
      const expandedNewItem = {
        ...newItem,
        quantity: q,
        subtotal: q * perSub,
        total: q * perTot,
        tax_total: q * perTax,
      } as StoreCartLineItemOptimisticUpdate;

      const updatedItems = [...currentItems, expandedNewItem];

      const { item_subtotal, total, tax_total } = getItemsSummaryValues(updatedItems);

      return {
        ...prev,
        items: updatedItems,
        item_subtotal,
        total,
        tax_total,
        currency_code
      } as Cart;
    });
  }

  const previewLineItemQuantity = (lineId: string, quantity: number) => {
    if (quantity < 1) return;
    setCartState(prev => {
      if (!prev?.items) return prev;
      const oldItem = prev.items.find(i => i.id === lineId);
      if (!oldItem) return prev;
      const q0 = oldItem.quantity || 1;
      const ratio = quantity / q0;
      const newLineSub = (oldItem.subtotal ?? 0) * ratio;
      const newLineTot = (oldItem.total ?? 0) * ratio;
      const newLineTax = (oldItem.tax_total ?? 0) * ratio;
      const newItems = prev.items.map(item => {
        if (item.id !== lineId) return item;
        return {
          ...item,
          quantity,
          subtotal: (item.subtotal ?? 0) * ratio,
          total: (item.total ?? 0) * ratio,
          tax_total: (item.tax_total ?? 0) * ratio
        };
      });
      return {
        ...prev,
        items: newItems,
        item_subtotal: (prev.item_subtotal ?? 0) - (oldItem.subtotal ?? 0) + newLineSub,
        tax_total: (prev.tax_total ?? 0) - (oldItem.tax_total ?? 0) + newLineTax,
        total: (prev.total ?? 0) - (oldItem.total ?? 0) + newLineTot
      } as Cart;
    });
  };

  const commitLineItemQuantity = async (lineId: string, quantity: number) => {
    if (!cartState?.items || quantity < 1) return;
    if (!cartState.items.find(i => i.id === lineId)) return;

    setIsUpdatingItem(true);
    setIsUpdating(true);
    try {
      await apiUpdateLineItem({ lineId, quantity });
      await refreshCart();
    } catch (error) {
      console.error('Error updating item quantity:', error);
      await refreshCart();
      throw error;
    } finally {
      setIsUpdatingItem(false);
      setIsUpdating(false);
    }
  };

  const addToCart = async ({
    variantId,
    quantity,
    countryCode,
    lineMetadata
  }: {
    variantId: string;
    quantity: number;
    countryCode: string;
    lineMetadata?: Record<string, string | number | boolean | null>;
  }) => {
    try {
      const res = await fetch("/api/cart/add-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          quantity,
          countryCode,
          lineMetadata
        }),
        credentials: "same-origin"
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Add to cart failed");
      }
      void refreshCart().catch(err => {
        console.error("Error refreshing cart after add:", err);
      });
    } catch (error) {
      console.error("Error adding product to cart:", error);
      await refreshCart();
      throw error;
    }
  };

  const removeCartItem = async (lineId: string) => {
    if (!cartState?.items) return;

    setIsRemovingItem(true);
    setIsUpdating(true);

    const optimisticCart = {
      ...cartState,
      items: cartState.items.filter(item => item.id !== lineId)
    };

    setCartState(optimisticCart);

    try {
      await apiDeleteLineItem(lineId);
      await refreshCart();
    } catch (error) {
      console.error('Error removing item from cart:', error);
      await refreshCart();
    } finally {
      setIsRemovingItem(false);
      setIsUpdating(false);
    }
  };

  function getItemsSummaryValues(items: StoreCartLineItemOptimisticUpdate[]) {
    return items.reduce(
      (acc, item) => ({
        item_subtotal: (acc.item_subtotal || 0) + (item.subtotal || 0),
        total: (acc.total || 0) + (item.total || 0),
        tax_total: (acc.tax_total || 0) + (item.tax_total || 0)
      }),
      { item_subtotal: 0, total: 0, tax_total: 0 }
    );
  }

  return (
    <CartContext.Provider
      value={{
        wholesaleBuyer,
        proMode: wholesaleBuyer,
        cart: cartState,
        minimumOrderViolations,
        onAddToCart: handleAddToCart,
        addToCart,
        removeCartItem,
        previewLineItemQuantity,
        commitLineItemQuantity,
        refreshCart,
        isUpdating,
        isUpdatingItem,
        isRemovingItem
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
