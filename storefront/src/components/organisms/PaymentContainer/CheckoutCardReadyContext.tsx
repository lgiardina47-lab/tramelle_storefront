'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';

type Ctx = {
  cardComplete: boolean;
  setCardComplete: (v: boolean) => void;
};

const CheckoutCardReadyContext = createContext<Ctx | null>(null);

export function CheckoutCardReadyProvider({ children }: { children: ReactNode }) {
  const [cardComplete, setState] = useState(false);
  const setCardComplete = useCallback((v: boolean) => {
    setState(v);
  }, []);
  const value = useMemo(
    () => ({ cardComplete, setCardComplete }),
    [cardComplete, setCardComplete]
  );
  return (
    <CheckoutCardReadyContext.Provider value={value}>
      {children}
    </CheckoutCardReadyContext.Provider>
  );
}

export function useCheckoutCardComplete(): Ctx | null {
  return useContext(CheckoutCardReadyContext);
}
