import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

import {
  COFOUNDER_DOC_COOKIE,
  COFOUNDER_DOC_PATH,
  createCofounderSessionToken,
  getExpectedPassword,
  isSafeCofounderNext,
} from '@/lib/cofounder-gate';

export const runtime = 'nodejs';

function safeStringEq(a: string, b: string): boolean {
  const ea = Buffer.from(a, 'utf8');
  const eb = Buffer.from(b, 'utf8');
  if (ea.length !== eb.length) {
    return false;
  }
  return timingSafeEqual(ea, eb);
}

export async function POST(request: Request) {
  let body: { password?: string; next?: string };
  try {
    body = (await request.json()) as { password?: string; next?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const pass = getExpectedPassword();
  if (!body.password || !safeStringEq(body.password, pass)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const nextPath =
    isSafeCofounderNext(body.next) && body.next ? body.next! : COFOUNDER_DOC_PATH;
  const token = await createCofounderSessionToken();
  const res = NextResponse.json({ ok: true, next: nextPath });
  res.cookies.set(COFOUNDER_DOC_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
