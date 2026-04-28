import type { Appearance } from '@stripe/stripe-js';

/** Stripe Appearance API: allineato al checkout Tramelle (B/N, bordi retti, tipografia DM Sans). */
export const tramelleStripeAppearance: Appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#000000',
    colorBackground: '#ffffff',
    colorText: '#000000',
    colorDanger: '#a33030',
    fontFamily:
      'DM Sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSizeBase: '15px',
    borderRadius: '0px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': {
      border: '1px solid #d9d9d9',
      boxShadow: 'none',
    },
    '.Tab': {
      border: '1px solid #d9d9d9',
      boxShadow: 'none',
    },
    '.Tab--selected': {
      border: '1px solid #0f0e0b',
      backgroundColor: '#ffffff',
    },
    '.Block': {
      borderColor: '#e8e8e8',
    },
    '.Action': {
      color: '#0f0e0b',
    },
  },
};
