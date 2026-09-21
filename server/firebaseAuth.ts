import crypto from 'crypto';

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  provider?: string;
  isAnonymous: boolean;
  claims: Record<string, any>;
}

interface FirebaseKeyResponse {
  [kid: string]: string;
}

let cachedKeys: FirebaseKeyResponse | null = null;
let cachedKeysExpiresAt = 0;

function base64UrlToBuffer(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized + '='.repeat((4 - (normalized.length % 4)) % 4), 'base64');
}

function decodeJsonPart(part: string): Record<string, any> {
  return JSON.parse(base64UrlToBuffer(part).toString('utf8'));
}

async function getFirebasePublicKeys(): Promise<FirebaseKeyResponse> {
  const now = Date.now();
  if (cachedKeys && now < cachedKeysExpiresAt) return cachedKeys;

  const response = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Firebase public key fetch failed: HTTP ${response.status}`);

  const keys = (await response.json()) as FirebaseKeyResponse;
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
  const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;

  cachedKeys = keys;
  cachedKeysExpiresAt = now + Math.max(60_000, maxAgeMs);
  return keys;
}

function getProjectId(): string {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is not configured');
  return projectId;
}

export async function verifyFirebaseIdToken(token: string): Promise<VerifiedFirebaseUser> {
  if (!token || token.split('.').length !== 3) throw new Error('Malformed Firebase ID token');

  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  const header = decodeJsonPart(encodedHeader);
  const payload = decodeJsonPart(encodedPayload);
  const projectId = getProjectId();

  if (header.alg !== 'RS256') throw new Error('Unsupported Firebase token algorithm');
  if (!header.kid || typeof header.kid !== 'string') throw new Error('Firebase token key id missing');
  if (payload.aud !== projectId) throw new Error('Firebase token audience mismatch');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Firebase token issuer mismatch');
  if (typeof payload.sub !== 'string' || payload.sub.length < 1 || payload.sub.length > 128) {
    throw new Error('Firebase token subject missing');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSeconds) throw new Error('Firebase token expired');
  if (typeof payload.iat !== 'number' || payload.iat > nowSeconds + 300) throw new Error('Firebase token issued-at is invalid');
  if (payload.auth_time !== undefined && (typeof payload.auth_time !== 'number' || payload.auth_time > nowSeconds + 300)) {
    throw new Error('Firebase token auth_time is invalid');
  }

  const keys = await getFirebasePublicKeys();
  let certificate = keys[header.kid];
  if (!certificate) {
    cachedKeys = null;
    cachedKeysExpiresAt = 0;
    const refreshedKeys = await getFirebasePublicKeys();
    certificate = refreshedKeys[header.kid];
    if (!certificate) throw new Error('Unknown Firebase token key id');
  }

  const publicKey = crypto.createPublicKey({ key: certificate, format: 'pem' });
  const validSignature = crypto.verify(
    'RSA-SHA256',
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    publicKey,
    base64UrlToBuffer(encodedSignature),
  );

  if (!validSignature) throw new Error('Firebase token signature verification failed');

  const provider = payload.firebase?.sign_in_provider;
  const isAnonymous = provider === 'anonymous' || payload.firebase?.is_anonymous === true;

  return {
    uid: payload.user_id || payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
    provider: typeof provider === 'string' ? provider : undefined,
    isAnonymous,
    claims: payload,
  };
}
