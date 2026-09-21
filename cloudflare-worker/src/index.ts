/**
 * SALE PAINT — CLOUDFLARE WORKER API GATEWAY
 * 
 * Target Architecture:
 * Sale Paint UI -> Cloudflare Worker Gateway -> Supabase PostgreSQL & Realtime
 * 
 * Security:
 * - Firebase Authentication Verification
 * - Supabase Service Role Key hidden within Worker Environment
 * - Strict CORS, Rate Limiting, and Atomic Stock Transaction Routing
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ENVIRONMENT: string;
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS?: string;
  AUTH_BACKEND?: 'firebase' | 'supabase';
}

function getCorsOrigin(request: Request, env: Env): string {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : (allowed[0] || '');
}

function corsHeaders(request: Request, env: Env) {
  return {
  'Access-Control-Allow-Origin': getCorsOrigin(request, env),
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};
}

function jsonResponse(data: any, status = 200, request?: Request, env?: Env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request || new Request('https://localhost'), env || ({ ENVIRONMENT: 'unknown', FIREBASE_PROJECT_ID: '' } as Env)),
      'Content-Type': 'application/json',
    },
  });
}

function errorResponse(code: string, message: string, status = 400, details?: any, request?: Request, env?: Env) {
  return jsonResponse({
    success: false,
    error: {
      code,
      message,
      details: details || null,
      timestamp: new Date().toISOString(),
    },
  }, status, request, env);
}

// Firebase ID-token verification using Google's published Secure Token JWK set.
let firebaseJwks: JsonWebKey[] | null = null;
let firebaseJwksAt = 0;

function b64urlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(normalized);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function decodePart<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(value)));
}

async function getFirebaseJwks(): Promise<JsonWebKey[]> {
  if (firebaseJwks && Date.now() - firebaseJwksAt < 6 * 60 * 60 * 1000) return firebaseJwks;
  const response = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  if (!response.ok) throw new Error('Unable to load Firebase signing keys');
  const body = await response.json() as { keys: JsonWebKey[] };
  firebaseJwks = body.keys;
  firebaseJwksAt = Date.now();
  return firebaseJwks;
}

async function verifyFirebaseIdToken(token: string, projectId: string): Promise<any> {
  const parts = token.split('.');
  if (parts.length !== 3 || !projectId) throw new Error('Malformed Firebase ID token');
  const header = decodePart<any>(parts[0]);
  const payload = decodePart<any>(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported Firebase token algorithm');
  const now = Math.floor(Date.now() / 1000);
  if (!payload.sub || payload.exp <= now || payload.iat > now + 300) throw new Error('Expired or invalid Firebase token');
  if (payload.aud !== projectId || payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('Invalid Firebase token issuer/audience');
  const jwk = (await getFirebaseJwks()).find(k => k.kid === header.kid);
  if (!jwk) { firebaseJwks = null; throw new Error('Unknown Firebase signing key'); }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    b64urlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!valid) throw new Error('Invalid Firebase token signature');
  return { uid: payload.user_id || payload.sub, email: payload.email || '', name: payload.name || '' };
}

async function verifySupabaseToken(token: string, env: Env): Promise<any> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase authentication is not configured');
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Invalid Supabase access token');
  const user = await response.json() as any;
  if (!user?.id) throw new Error('Invalid Supabase user session');
  return { uid: user.id, email: user.email || '', name: user.user_metadata?.full_name || user.user_metadata?.name || '' };
}

async function authenticateRequest(request: Request, env: Env): Promise<{ authenticated: boolean; user?: any; error?: string }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { authenticated: false, error: 'Authentication required' };
  const token = authHeader.slice(7).trim();
  if (!token) return { authenticated: false, error: 'Authentication required' };
  try {
    const backend = env.AUTH_BACKEND || 'firebase';
    const user = backend === 'supabase'
      ? await verifySupabaseToken(token, env)
      : await verifyFirebaseIdToken(token, env.FIREBASE_PROJECT_ID);
    return { authenticated: true, user };
  } catch (error: any) {
    return { authenticated: false, error: error?.message || 'Invalid authentication token' };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // Health Check
    if (pathname === '/api/v1/health' || pathname === '/health') {
      return jsonResponse({
        status: 'healthy',
        service: 'Sale Paint Cloudflare Worker Gateway',
        version: '4.0.0',
        environment: env.ENVIRONMENT || 'production',
        timestamp: new Date().toISOString(),
      });
    }

    // Require Auth for API routes
    const authResult = await authenticateRequest(request, env);
    if (!authResult.authenticated) {
      return errorResponse('UNAUTHORIZED', authResult.error || 'Authentication required', 401, undefined, request, env);
    }

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return errorResponse('SERVICE_NOT_CONFIGURED', 'Supabase production configuration is missing', 503, undefined, request, env);
    }
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

    const supabaseHeaders = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };

    try {
      // 1. SALES: GET /api/v1/sales
      if (pathname === '/api/v1/sales' && request.method === 'GET') {
        const limit = url.searchParams.get('limit') || '2000';
        const res = await fetch(`${supabaseUrl}/rest/v1/sales?select=*&order=date.desc,created_at.desc&limit=${limit}`, {
          headers: supabaseHeaders,
        });
        const data = await res.json();
        return jsonResponse({ success: true, data });
      }

      // 2. SALES: POST /api/v1/sales/checkout (Atomic Checkout with Stock Protection)
      if (pathname === '/api/v1/sales/checkout' && request.method === 'POST') {
        const body: any = await request.json();
        const { bill, items, allowOversell = true } = body;
        if (!bill || !items || !Array.isArray(items)) {
          return errorResponse('VALIDATION_ERROR', 'Missing bill or items payload', 400);
        }

        // Call PostgreSQL stored procedure for atomic checkout
        const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/execute_atomic_checkout`, {
          method: 'POST',
          headers: supabaseHeaders,
          body: JSON.stringify({
            p_bill: bill,
            p_items: items,
            p_allow_oversell: allowOversell,
          }),
        });

        const rpcData: any = await rpcRes.json();
        if (!rpcRes.ok || rpcData?.success === false) {
          if (rpcData?.error_code === 'INSUFFICIENT_STOCK') {
            return errorResponse('INSUFFICIENT_STOCK', rpcData.message, 422, rpcData.insufficient_items);
          }
          return errorResponse('TRANSACTION_FAILED', rpcData?.message || 'Failed to complete checkout', 500);
        }

        return jsonResponse({ success: true, ...rpcData });
      }

      // 3. SALES: PUT /api/v1/sales/:id
      if (pathname.startsWith('/api/v1/sales/') && request.method === 'PUT') {
        const id = pathname.split('/').pop();
        const updatePayload = await request.json();
        const res = await fetch(`${supabaseUrl}/rest/v1/sales?id=eq.${id}`, {
          method: 'PATCH',
          headers: supabaseHeaders,
          body: JSON.stringify(updatePayload),
        });
        const data = await res.json();
        return jsonResponse({ success: true, data });
      }

      // 4. SALES: DELETE /api/v1/sales/:id
      if (pathname.startsWith('/api/v1/sales/') && request.method === 'DELETE') {
        const id = pathname.split('/').pop();
        const res = await fetch(`${supabaseUrl}/rest/v1/sales?id=eq.${id}`, {
          method: 'DELETE',
          headers: supabaseHeaders,
        });
        return jsonResponse({ success: true, deletedId: id });
      }

      // 5. PRODUCTS: GET /api/v1/products
      if (pathname === '/api/v1/products' && request.method === 'GET') {
        const res = await fetch(`${supabaseUrl}/rest/v1/products?select=*&order=name.asc`, {
          headers: supabaseHeaders,
        });
        const data = await res.json();
        return jsonResponse({ success: true, data });
      }

      // 6. PRODUCTS: POST /api/v1/products/upsert
      if (pathname === '/api/v1/products/upsert' && request.method === 'POST') {
        const { products } = (await request.json()) as any;
        const res = await fetch(`${supabaseUrl}/rest/v1/products`, {
          method: 'POST',
          headers: { ...supabaseHeaders, 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(products),
        });
        const data = await res.json();
        return jsonResponse({ success: true, data });
      }

      // 7. CATALOG: GET /api/v1/catalog
      if (pathname === '/api/v1/catalog' && request.method === 'GET') {
        const res = await fetch(`${supabaseUrl}/rest/v1/catalog_items?select=*&order=name.asc`, {
          headers: supabaseHeaders,
        });
        const data = await res.json();
        return jsonResponse({ success: true, data });
      }

      // 8. STOCK: GET /api/v1/stock/stock-ins
      if (pathname === '/api/v1/stock/stock-ins' && request.method === 'GET') {
        const res = await fetch(`${supabaseUrl}/rest/v1/stock_ins?select=*&order=date.desc,created_at.desc`, {
          headers: supabaseHeaders,
        });
        const data = await res.json();
        return jsonResponse({ success: true, data });
      }

      // 9. CONFIG: GET /api/v1/config/:key
      if (pathname.startsWith('/api/v1/config/') && request.method === 'GET') {
        const key = pathname.split('/').pop();
        const res = await fetch(`${supabaseUrl}/rest/v1/system_configs?key=eq.${key}`, {
          headers: supabaseHeaders,
        });
        const data: any = await res.json();
        return jsonResponse({ success: true, config: data?.[0] || null });
      }

      // Default fallback
      return errorResponse('NOT_FOUND', `Route ${request.method} ${pathname} not found`, 404);
    } catch (err: any) {
      return errorResponse('SERVER_ERROR', err.message || 'Internal gateway error', 500);
    }
  },
};
