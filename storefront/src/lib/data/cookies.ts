import 'server-only';
import { cookies as nextCookies, headers } from 'next/headers';

/**
 * Cookie `Secure` solo se il client raggiunge il sito in HTTPS (o il proxy dice https).
 * Con `NODE_ENV=production` e URL `http://127.0.0.1:3000`, `secure: true` fa scartare il cookie
 * dal browser → login/registrazione sembrano fallire (JWT mai salvato).
 */
async function cookieSecureFlag(): Promise<boolean> {
  if (
    process.env.COOKIE_INSECURE === '1' ||
    process.env.COOKIE_INSECURE === 'true'
  ) {
    return false
  }
  try {
    const h = await headers()
    const proto = h.get('x-forwarded-proto')
    if (proto) {
      return proto.split(",")[0]?.trim() === "https"
    }
  } catch {
    /* headers() non disponibile in alcuni contesti */
  }
  return false
}

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  const cookies = await nextCookies();
  const token = cookies.get('_medusa_jwt')?.value;

  if (!token) {
    return {};
  }

  return { authorization: `Bearer ${token}` };
};

export const getCacheTag = async (
  tag: string
): Promise<string> => {
  try {
    const cookies = await nextCookies();
    const cacheId = cookies.get('_medusa_cache_id')?.value;

    if (!cacheId) {
      return '';
    }

    return `${tag}-${cacheId}`;
  } catch (error) {
    return '';
  }
};

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== 'undefined') {
    return {};
  }

  const cacheTag = await getCacheTag(tag);

  if (!cacheTag) {
    return {};
  }

  return { tags: [`${cacheTag}`] };
};

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies();
  cookies.set('_medusa_jwt', token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: 'lax',
    secure: await cookieSecureFlag(),
  });
};

export const removeAuthToken = async () => {
  const cookies = await nextCookies();
  cookies.set('_medusa_jwt', '', {
    maxAge: -1,
  });
};

export const getCartId = async () => {
  const cookies = await nextCookies();
  return cookies.get('_medusa_cart_id')?.value;
};

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies();
  cookies.set('_medusa_cart_id', cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: 'strict',
    secure: await cookieSecureFlag(),
  });
};

export const removeCartId = async () => {
  const cookies = await nextCookies();
  cookies.set('_medusa_cart_id', '', {
    maxAge: -1,
  });
};
