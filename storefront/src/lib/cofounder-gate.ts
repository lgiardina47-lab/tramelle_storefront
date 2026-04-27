/**
 * Cookie firmato (HMAC) condiviso tra middleware Edge e route API Node.
 * Il segreto di sessione non dipende dalla password d’accesso: usa COFOUNDER_HMAC_KEY o fallback.
 */

const HMAC_SALT = 'tramelle_cofounder_doc_v1';
export const COFOUNDER_DOC_COOKIE = 'tramelle_cofounder_doc';
export const COFOUNDER_DOC_PATH = '/cofounder/tramelle_cofounder.html';
export const COFOUNDER_ENTER_PATH = '/cofounder/enter';

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacKey(): Promise<CryptoKey> {
  const raw =
    (typeof process !== 'undefined' && process.env?.COFOUNDER_HMAC_KEY) ||
    'tramelle-cofounder-fallback-hmac';
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest('SHA-256', enc.encode(`${raw}::${HMAC_SALT}`));
  return crypto.subtle.importKey('raw', keyMaterial, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function createCofounderSessionToken(): Promise<string> {
  const key = await hmacKey();
  const data = new TextEncoder().encode(`${HMAC_SALT}:grant`);
  const sig = await crypto.subtle.sign('HMAC', key, data);
  return bytesToHex(sig);
}

export async function verifyCofounderSessionToken(token: string | undefined): Promise<boolean> {
  if (!token || !/^[0-9a-f]+$/i.test(token)) {
    return false;
  }
  const expected = await createCofounderSessionToken();
  if (expected.length !== token.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export function isSafeCofounderNext(path: string | null | undefined): path is string {
  if (!path || !path.startsWith('/cofounder/') || path.startsWith('//')) {
    return false;
  }
  return true;
}

export function getExpectedPassword(): string {
  if (typeof process === 'undefined') return 'yondist';
  return process.env.COFOUNDER_PAGE_PASSWORD?.trim() || 'yondist';
}
