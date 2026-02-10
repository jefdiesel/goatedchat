import { SiweMessage } from 'siwe';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

const COOKIE_NAME = 'gated-chat-session';

export interface SessionPayload {
  address: string;
  userId: string;
  iat: number;
  exp: number;
}

export async function createSession(address: string, userId: string): Promise<string> {
  const token = await new SignJWT({ address, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  return token;
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function createSiweMessage(address: string, nonce: string, chainId: number): string {
  const message = new SiweMessage({
    domain: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
    address,
    statement: 'Sign in to Gated Chat',
    uri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    version: '1',
    chainId,
    nonce,
  });

  return message.prepareMessage();
}

export async function verifySiweMessage(
  message: string,
  signature: string
): Promise<{ address: string } | null> {
  try {
    console.log('Verifying SIWE message:', message);
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });
    console.log('SIWE verify result:', result);
    if (result.success) {
      return { address: siweMessage.address };
    }
    console.log('SIWE verification failed:', result.error);
    return null;
  } catch (error) {
    console.error('SIWE verification error:', error);
    return null;
  }
}
