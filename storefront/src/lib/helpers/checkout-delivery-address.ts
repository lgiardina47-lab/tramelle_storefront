import type { HttpTypes } from '@medusajs/types';

type Addr = HttpTypes.StoreCartAddress | null | undefined;

/**
 * Indirizzo “completo” per checkout: niente città obbligatoria in UI; in Italia serve la provincia.
 * Allineare CartAddressSection, CartShippingMethodsSection e setAddresses (city derivata in API).
 */
export function isCheckoutDeliveryAddressComplete(addr: Addr): boolean {
  if (!addr) return false;
  const { first_name, last_name, address_1, postal_code, country_code, province } = addr;
  if (
    !String(first_name ?? '').trim() ||
    !String(last_name ?? '').trim() ||
    !String(address_1 ?? '').trim() ||
    !String(postal_code ?? '').trim() ||
    !String(country_code ?? '').trim()
  ) {
    return false;
  }
  if (String(country_code).toLowerCase() === 'it') {
    return Boolean(String(province ?? '').trim());
  }
  return true;
}

/** `city` obbligatoria lato Medusa: deriviamo da provincia / CAP. */
export function derivedCityForMedusa(
  province: string,
  postalCode: string
): string {
  const p = province.trim();
  if (p) return p;
  const z = postalCode.trim();
  if (z) return z;
  return '—';
}
