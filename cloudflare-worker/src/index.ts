/**
 * SALE PAINT — CLOUDFLARE WORKER API GATEWAY
 * Phase 4.1 hardening: Firebase ID tokens are cryptographically verified.
 * Production data access fails closed when Supabase is unavailable.
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS?: string;
  ENVIRONMENT: string;
}

interface VerifiedUser {
  uid: string;
  email?: string;
  name?: string;
  isAnonymous: boolean;
  claims: Record<string, any>;
}

let cachedCerts: Record<string, string> | null = null;
let cachedCertsExpiresAt = 0;

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'https://sale-paint.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
]);

function getCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const configured = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const allowed = configured.length ? new Set(configured) : DEFAULT_ALLOWED_ORIGINS;
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
  if (origin && allowed.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function jsonResponse(data: any, request: Request, env: Env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...getCorsHeaders(request, env),
      'Content-Type': 'application/json',
    },
  });
}

function errorResponse(code: string, message: string, request: Request, env: Env, status = 400, details?: any) {
  return jsonResponse({
    success: false,
    error: { code, message, details: details || null, timestamp: new Date().toISOString() },
  }, request, env, status);
}

function base64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function decodeJsonPart(part: string): Record<string, any> {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, '');
  return base64UrlToBytes(body.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')).buffer;
}

async function getFirebaseCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedCerts && now < cachedCertsExpiresAt) return cachedCerts;

  const response = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  if (!response.ok) throw new Error(`Firebase public key fetch failed: HTTP ${response.status}`);
  const certs = await response.json() as Record<string, string>;
  const cacheControl = response.headers.get('cache-control') || '';
  const match = cacheControl.match(/max-age=(\d+)/i);
  const maxAge = match ? Number(match[1]) * 1000 : 60 * 60 * 1000;
  cachedCerts = certs;
  cachedCertsExpiresAt = now + Math.max(60_000, maxAge);
  return certs;
}

async function verifyFirebaseIdToken(token: string, env: Env): Promise<VerifiedUser> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed Firebase ID token');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJsonPart(encodedHeader);
  const payload = decodeJsonPart(encodedPayload);

  if (header.alg !== 'RS256') throw new Error('Unsupported Firebase token algorithm');
  if (!header.kid) throw new Error('Firebase token key id missing');
  if (payload.aud !== env.FIREBASE_PROJECT_ID) throw new Error('Firebase token audience mismatch');
  if (payload.iss !== `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`) throw new Error('Firebase token issuer mismatch');
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Firebase token subject missing');

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('Firebase token expired');
  if (typeof payload.iat !== 'number' || payload.iat > now + 300) throw new Error('Firebase token issued-at is invalid');

  let certs = await getFirebaseCerts();
  let cert = certs[header.kid];
  if (!cert) {
    cachedCerts = null;
    cachedCertsExpiresAt = 0;
    certs = await getFirebaseCerts();
    cert = certs[header.kid];
  }
  if (!cert) throw new Error('Unknown Firebase token key id');

  const key = await crypto.subtle.importKey(
    'spki',
    pemToArrayBuffer(cert),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!valid) throw new Error('Firebase token signature verification failed');

  const provider = payload.firebase?.sign_in_provider;
  const isAnonymous = provider === 'anonymous' || payload.firebase?.is_anonymous === true;
  return {
    uid: payload.user_id || payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    isAnonymous,
    claims: payload,
  };
}

async function authenticateRequest(request: Request, env: Env): Promise<VerifiedUser> {
  const header = request.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) throw new Error('Missing or malformed Authorization header');
  const token = header.slice('Bearer '.length).trim();
  if (!token) throw new Error('Empty bearer token');
  const user = await verifyFirebaseIdToken(token, env);
  if (user.isAnonymous) throw new Error('Anonymous Firebase sessions are not allowed on the production data API');
  return user;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === 'OPTIONS') {
      const origin = request.headers.get('Origin') || '';
      const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((v) => v.trim()).filter(Boolean);
      const defaultAllowed = DEFAULT_ALLOWED_ORIGINS.has(origin);
      if ((allowed.length && allowed.includes(origin)) || (!allowed.length && defaultAllowed)) {
        return new Response(null, { headers: getCorsHeaders(request, env) });
      }
      return new Response(null, { status: 403 });
    }

    if (pathname === '/api/v1/health' || pathname === '/health') {
      return jsonResponse({
        status: 'healthy',
        service: 'Sale Paint Cloudflare Worker Gateway',
        version: '4.1.0',
        environment: env.ENVIRONMENT || 'production',
        timestamp: new Date().toISOString(),
      }, request, env);
    }

    let user: VerifiedUser;
    try {
      user = await authenticateRequest(request, env);
    } catch (error: any) {
      return errorResponse('UNAUTHORIZED', error?.message || 'Authentication required', request, env, 401);
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return errorResponse('SUPABASE_NOT_CONFIGURED', 'Live Supabase is not configured. Production API fails closed.', request, env, 503);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      'X-SalePaint-User-Id': user.uid,
    };

    try {
      if (pathname === '/api/v1/sales' && request.method === 'GET') {
        const limit = url.searchParams.get('limit') || '2000';
        const res = await fetch(`${supabaseUrl}/rest/v1/sales?select=*&order=date.desc,created_at.desc&limit=${encodeURIComponent(limit)}`, { headers: supabaseHeaders });
        const data = await res.json();
        if (!res.ok) return errorResponse('SUPABASE_ERROR', 'Supabase sales query failed.', request, env, 502, data);
        return jsonResponse({ success: true, data }, request, env);
      }

      if (pathname === '/api/v1/sales/checkout' && request.method === 'POST') {
        const body: any = await request.json();
        const { bill, items, allowOversell = true } = body;
        if (!bill || !items || !Array.isArray(items)) return errorResponse('VALIDATION_ERROR', 'Missing bill or items payload', request, env, 400);
        const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_atomic_checkout`, {
          method: 'POST', headers: supabaseHeaders,
          body: JSON.stringify({ p_bill: bill, p_items: items, p_allow_oversell: allowOversell }),
        });
        const rpcData: any = await rpcRes.json();
        if (!rpcRes.ok || rpcData?.success === false) {
          if (rpcData?.error_code === 'INSUFFICIENT_STOCK') return errorResponse('INSUFFICIENT_STOCK', rpcData.message, request, env, 422, rpcData.insufficient_items);
          return errorResponse('TRANSACTION_FAILED', rpcData?.message || 'Failed to complete checkout', request, env, 500);
        }
        return jsonResponse({ success: true, ...rpcData }, request, env);
      }

      if (pathname.startsWith('/api/v1/sales/') && request.method === 'PUT') {
        const id = pathname.split('/').pop();
        const updatePayload = await request.json();
        const res = await fetch(`${supabaseUrl}/rest/v1/sales?id=eq.${encodeURIComponent(id || '')}`, { method: 'PATCH', headers: supabaseHeaders, body: JSON.stringify(updatePayload) });
        const data = await res.json();
        if (!res.ok) return errorResponse('SUPABASE_ERROR', 'Supabase sale update failed.', request, env, 502, data);
        return jsonResponse({ success: true, data }, request, env);
      }

      if (pathname.startsWith('/api/v1/sales/') && request.method === 'DELETE') {
        const id = pathname.split('/').pop();
        const res = await fetch(`${supabaseUrl}/rest/v1/sales?id=eq.${encodeURIComponent(id || '')}`, { method: 'DELETE', headers: supabaseHeaders });
        if (!res.ok) return errorResponse('SUPABASE_ERROR', 'Supabase sale deletion failed.', request, env, 502, await res.text());
        return jsonResponse({ success: true, deletedId: id }, request, env);
      }

      if (pathname === '/api/v1/products' && request.method === 'GET') {
        const res = await fetch(`${supabaseUrl}/rest/v1/products?select=*&order=name.asc`, { headers: supabaseHeaders });
        const data = await res.json();
        if (!res.ok) return errorResponse('SUPABASE_ERROR', 'Supabase products query failed.', request, env, 502, data);
        return jsonResponse({ success: true, data }, request, env);
      }

      if (pathname === '/api/v1/products/upsert' && request.method === 'POST') {
        const { products } = await request.json() as any;
        const res = await fetch(`${supabaseUrl}/rest/v1/products`, { method: 'POST', headers: { ...supabaseHeaders, Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify(products) });
        const data = await res.json();
        if (!res.ok) return errorResponse('SUPABASE_ERROR', 'Supabase product upsert failed.', request, env, 502, data);
        return jsonResponse({ success: true, data }, request, env);
      }

      if (pathname === '/api/v1/catalog' && request.method === 'GET') {
        const res = await fetch(`${supabaseUrl}/rest/v1/catalog_items?select=*&order=name.asc`, { headers: supabaseHeaders });
        const data = await res.json();
        if (!res.ok) return errorResponse('SUPABASE_ERROR', 'Supabase catalog query failed.', request, env, 502, data);
        return jsonResponse({ success: true, data }, request, env);
      }

      if (pathname === '/api/v1/stock/stock-ins' && request.method === 'GET') {
        const res = await fetch(`${supabaseUrl}/rest/v1/stock_ins?select=*&order=date.desc,created_at.desc`, { headers: supabaseHeaders });
        const data = await res.json();
        if (!res.ok) return errorResponse('SUPABASE_ERROR', 'Supabase stock query failed.', request, env, 502, data);
        return jsonResponse({ success: true, data }, request, env);
      }

      if (pathname.startsWith('/api/v1/config/') && request.method === 'GET') {
        const key = pathname.split('/').pop();
        const res = await fetch(`${supabaseUrl}/rest/v1/system_configs?key=eq.${encodeURIComponent(key || '')}`, { headers: supabaseHeaders });
        const data: any = await res.json();
        if (!res.ok) return errorResponse('SUPABASE_ERROR', 'Supabase config query failed.', request, env, 502, data);
        return jsonResponse({ success: true, config: data?.[0] || null }, request, env);
      }

      return errorResponse('NOT_FOUND', `Route ${request.method} ${pathname} not found`, request, env, 404);
    } catch (err: any) {
      return errorResponse('SERVER_ERROR', err?.message || 'Internal gateway error', request, env, 500);
    }
  },
};
