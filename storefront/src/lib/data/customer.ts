'use server';

import { HttpTypes } from '@medusajs/types';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { sdk } from '../config';
import { MEDUSA_BACKEND_URL } from '../medusa-backend-url';
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
  setCartId
} from './cookies';

/**
 * Salva metadata B2C/B2B e assegna il gruppo professionisti lato API Medusa
 * (`POST /store/tramelle/registration`), perché lo store spesso non persiste `metadata` su create.
 */
async function syncTramelleRegistrationViaApi(
  formData: FormData,
  bearerToken: string
): Promise<void> {
  const base = MEDUSA_BACKEND_URL.replace(/\/$/, '');
  const pk = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?.trim();
  if (!base || !pk || !bearerToken?.trim()) return;

  const auth = { authorization: `Bearer ${bearerToken.trim()}` };

  const registrationType =
    (formData.get('registration_type') as string) || 'b2c';
  const body: Record<string, string> = { registration_type: registrationType };

  if (registrationType === 'b2b_pro') {
    body.company_name = (formData.get('company_name') as string)?.trim() || '';
    body.vat_id = (formData.get('vat_id') as string)?.trim() || '';
    body.sdi_or_pec = (formData.get('sdi_or_pec') as string)?.trim() || '';
  } else {
    body.first_name = (formData.get('first_name') as string)?.trim() || '';
    body.last_name = (formData.get('last_name') as string)?.trim() || '';
    const phone = (formData.get('phone') as string)?.trim();
    if (phone) body.phone = phone;
    const country = (formData.get('country') as string)?.trim();
    if (country) body.country = country;
  }

  try {
    const res = await fetch(`${base}/store/tramelle/registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': pk,
        ...auth,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(
        '[signup] tramelle/registration',
        res.status,
        await res.text()
      );
    }
  } catch (e) {
    console.warn('[signup] tramelle/registration error', e);
  }
}

/** Opzionale: se `MEDUSA_ADMIN_API_KEY` + `TRAMELLE_B2B_PRO_GROUP_ID` sono impostati. */
async function assignCustomerToB2bProGroupImmediate(customerId: string): Promise<void> {
  const groupId = process.env.TRAMELLE_B2B_PRO_GROUP_ID?.trim();
  const adminKey = process.env.MEDUSA_ADMIN_API_KEY?.trim();
  const base = MEDUSA_BACKEND_URL.replace(/\/$/, '');
  if (!groupId || !adminKey || !base) {
    return;
  }
  try {
    const res = await fetch(`${base}/admin/customers/${customerId}/customer-groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminKey}`
      },
      body: JSON.stringify({ add: [groupId] })
    });
    if (!res.ok) {
      console.warn('[signup b2b] assign group failed', res.status, await res.text());
    }
  } catch (e) {
    console.warn('[signup b2b] assign group error', e);
  }
}

const retrieveCustomerUncached =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders) return null;

    const headers = {
      ...authHeaders
    };

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: 'GET',
        query: {
          // `*groups` non è ammesso su /store/customers/me in Mercur/Medusa → 400 e la sessione sembra assente.
          // `*addresses` serve al checkout (indirizzi salvati); senza `*orders` (ordini da `listOrders`).
          fields: '*addresses,*metadata',
        },
        headers,
        cache: 'no-store'
      })
      .then(({ customer }) => customer ?? null)
      .catch(() => null);
  };

/** Una sola chiamata /customers/me per richiesta RSC (layout + Header + pagine). */
export const retrieveCustomer = cache(retrieveCustomerUncached);

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders())
  };

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(err => {
      throw new Error(err.message);
    });

  const cacheTag = await getCacheTag('customers');
  revalidateTag(cacheTag);

  return updateRes;
};

export async function signup(formData: FormData) {
  const password = formData.get('password') as string;
  const registrationType = (formData.get('registration_type') as string) || 'b2c';

  const email = formData.get('email') as string;

  const customerForm: HttpTypes.StoreCreateCustomer = { email };

  if (registrationType === 'b2b_pro') {
    const company = (formData.get('company_name') as string)?.trim() || '';
    const vat = (formData.get('vat_id') as string)?.trim() || '';
    const sdiOrPec = (formData.get('sdi_or_pec') as string)?.trim() || '';
    customerForm.company_name = company;
    customerForm.first_name = company.slice(0, 100) || email.split('@')[0]?.slice(0, 100) || '—';
    customerForm.last_name = '—';
    customerForm.metadata = {
      tramelle_registration_type: 'b2b_pro',
      tramelle_vat_id: vat,
      tramelle_sdi_or_pec: sdiOrPec
    };
  } else {
    customerForm.first_name = formData.get('first_name') as string;
    customerForm.last_name = formData.get('last_name') as string;
    const phone = (formData.get('phone') as string)?.trim();
    if (phone) {
      customerForm.phone = phone;
    }
    const country = (formData.get('country') as string)?.trim();
    if (country) {
      customerForm.metadata = {
        ...(typeof customerForm.metadata === 'object' && customerForm.metadata
          ? customerForm.metadata
          : {}),
        tramelle_signup_country: country,
      };
    }
  }

  try {
    const registerToken = (await sdk.auth.register('customer', 'emailpass', {
      email,
      password: password
    })) as string;

    await setAuthToken(registerToken);

    /** Stesso round-trip Server Action: i cookie appena impostati non sono sempre leggibili con `getAuthHeaders()` — Medusa richiede Bearer esplicito. */
    const authAfterRegister = { authorization: `Bearer ${registerToken}` };

    const { customer: createdCustomer } = await sdk.store.customer.create(
      customerForm,
      {},
      authAfterRegister
    );

    const loginToken = (await sdk.auth.login('customer', 'emailpass', {
      email,
      password
    })) as string;

    await setAuthToken(loginToken);

    await syncTramelleRegistrationViaApi(formData, loginToken);

    if (registrationType === 'b2b_pro' && createdCustomer?.id) {
      await assignCustomerToB2bProGroupImmediate(createdCustomer.id);
    }

    const customerCacheTag = await getCacheTag('customers');
    revalidateTag(customerCacheTag);

    await transferCart({ authorization: `Bearer ${loginToken}` });

    return createdCustomer;
  } catch (error: any) {
    return error.toString();
  }
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const token = (await sdk.auth.login('customer', 'emailpass', {
      email,
      password
    })) as string;
    await setAuthToken(token);
    await transferCart({ authorization: `Bearer ${token}` });
    const customerCacheTag = await getCacheTag('customers');
    revalidateTag(customerCacheTag);
    revalidatePath('/[locale]/checkout', 'page');
    revalidatePath('/[locale]/cart', 'page');

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      message: (error as Error)?.message || 'Unable to log in. Please try again.'
    };
  }
}

export async function signout() {
  await sdk.auth.logout();

  await removeAuthToken();

  const customerCacheTag = await getCacheTag('customers');
  revalidateTag(customerCacheTag);

  await removeCartId();

  const cartCacheTag = await getCacheTag('carts');
  revalidateTag(cartCacheTag);
  redirect(`/`);
}

export async function transferCart(authOverride?: {
  authorization: string;
}) {
  const cartId = await getCartId();

  if (!cartId) {
    return;
  }

  const headers =
    authOverride ??
    ((await getAuthHeaders()) as { authorization: string } | Record<string, never>);

  const { cart: transferred } = await sdk.store.cart.transferCart(
    cartId,
    {},
    headers
  );

  if (transferred?.id) {
    await setCartId(transferred.id);
  }

  const cartCacheTag = await getCacheTag('carts');
  revalidateTag(cartCacheTag);
}

export const addCustomerAddress = async (formData: FormData): Promise<any> => {
  const address = {
    address_name: formData.get('address_name') as string,
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    company: formData.get('company') as string,
    address_1: formData.get('address_1') as string,
    city: formData.get('city') as string,
    postal_code: formData.get('postal_code') as string,
    country_code: formData.get('country_code') as string,
    phone: formData.get('phone') as string,
    province: formData.get('province') as string,
    is_default_billing: Boolean(formData.get('isDefaultBilling')),
    is_default_shipping: Boolean(formData.get('isDefaultShipping'))
  };

  const headers = {
    ...(await getAuthHeaders())
  };

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async ({ customer }) => {
      const customerCacheTag = await getCacheTag('customers');
      revalidateTag(customerCacheTag);
      return { success: true, error: null };
    })
    .catch(err => {
      return { success: false, error: err.toString() };
    });
};

export const deleteCustomerAddress = async (addressId: string): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders())
  };

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag('customers');
      revalidateTag(customerCacheTag);
      return { success: true, error: null };
    })
    .catch(err => {
      return { success: false, error: err.toString() };
    });
};

export const updateCustomerAddress = async (formData: FormData): Promise<any> => {
  const addressId = formData.get('addressId') as string;

  if (!addressId) {
    return { success: false, error: 'Address ID is required' };
  }

  const address = {
    address_name: formData.get('address_name') as string,
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    company: formData.get('company') as string,
    address_1: formData.get('address_1') as string,
    address_2: formData.get('address_2') as string,
    city: formData.get('city') as string,
    postal_code: formData.get('postal_code') as string,
    province: formData.get('province') as string,
    country_code: formData.get('country_code') as string
  } as HttpTypes.StoreUpdateCustomerAddress;

  const phone = formData.get('phone') as string;

  if (phone) {
    address.phone = phone;
  }

  const headers = {
    ...(await getAuthHeaders())
  };

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag('customers');
      revalidateTag(customerCacheTag);
      return { success: true, error: null };
    })
    .catch(err => {
      return { success: false, error: err.toString() };
    });
};

export const updateCustomerPassword = async (password: string, token: string): Promise<any> => {
  const res = await fetch(`${MEDUSA_BACKEND_URL}/auth/customer/emailpass/update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ password })
  })
    .then(async () => {
      await removeAuthToken();
      const customerCacheTag = await getCacheTag('customers');
      revalidateTag(customerCacheTag);
      return { success: true, error: null };
    })
    .catch((err: any) => {
      return { success: false, error: err.toString() };
    });

  return res;
};

export const sendResetPasswordEmail = async (email: string) => {
  const res = await sdk.auth
    .resetPassword('customer', 'emailpass', {
      identifier: email
    })
    .then(() => {
      return { success: true, error: null };
    })
    .catch((err: any) => {
      return { success: false, error: err.toString() };
    });

  return res;
};
