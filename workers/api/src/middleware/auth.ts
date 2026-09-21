export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
  appMetadata?: Record<string, any>;
  userMetadata?: Record<string, any>;
}

/**
 * Phase 1 Worker Auth Foundation:
 * Verifies Bearer JWT tokens sent by frontend clients authenticated via Supabase Auth.
 * Frontend never sends the service-role key.
 */
export async function verifySupabaseToken(
  request: Request,
  supabaseUrl?: string,
  anonKey?: string
): Promise<{ user: AuthenticatedUser | null; error: string | null }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or malformed Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return { user: null, error: 'Empty bearer token' };
  }

  if (!supabaseUrl) {
    // If Supabase is not configured yet in Worker env, return placeholder for Phase 1
    return { user: null, error: 'Supabase URL binding is not yet configured on Worker' };
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey || '',
      },
    });

    if (!res.ok) {
      return { user: null, error: `Invalid or expired auth token (${res.status})` };
    }

    const userData: any = await res.json();
    return {
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        appMetadata: userData.app_metadata,
        userMetadata: userData.user_metadata,
      },
      error: null,
    };
  } catch (err: any) {
    return { user: null, error: `Authentication verification failed: ${err?.message || 'Network error'}` };
  }
}
