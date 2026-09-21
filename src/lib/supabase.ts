import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SaleItem, ProductConfig, StockInRecord, CloudSpreadsheetInfo } from '../types';

// Environment variable retrieval
const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : {};
const supabaseUrl: string = metaEnv?.VITE_SUPABASE_URL || '';
const supabaseAnonKey: string = metaEnv?.VITE_SUPABASE_ANON_KEY || '';

let supabaseClientInstance: SupabaseClient | null = null;

/**
 * Lazy initialization of Supabase client.
 * Returns null gracefully if environment variables are not yet configured,
 * preventing any application crash during migration Phase 1.
 */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseClientInstance) {
    if (supabaseUrl && supabaseAnonKey) {
      try {
        supabaseClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
          realtime: {
            params: {
              eventsPerSecond: 10,
            },
          },
        });
      } catch (err) {
        console.warn('[Supabase] Initialization deferred:', err);
        return null;
      }
    }
  }
  return supabaseClientInstance;
}

/**
 * Phase 1 Auth Foundation:
 * Provides standard authentication helper signatures compatible with Google Sign-In.
 * Note: Firebase Auth remains active and unchanged in Phase 1.
 */
export const SupabaseAuthFoundation = {
  isConfigured: (): boolean => {
    return Boolean(supabaseUrl && supabaseAnonKey);
  },

  signInWithGoogle: async (): Promise<{ url?: string; error?: any }> => {
    const client = getSupabase();
    if (!client) {
      return { error: new Error('Supabase is not configured yet. Using Firebase Auth.') };
    }
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        scopes: 'email profile https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets',
      },
    });
    return { url: data?.url ?? undefined, error };
  },

  signOut: async (): Promise<{ error?: any }> => {
    const client = getSupabase();
    if (!client) return {};
    const { error } = await client.auth.signOut();
    return { error };
  },

  getSession: async () => {
    const client = getSupabase();
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session ?? null;
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const client = getSupabase();
    if (!client) return { unsubscribe: () => {} };
    const { data: { subscription } } = client.auth.onAuthStateChange(callback);
    return { unsubscribe: () => subscription.unsubscribe() };
  },
};

/**
 * Phase 1 Realtime Foundation:
 * Prepares Postgres CDC event subscribers for multi-device sync.
 * Note: Firestore onSnapshot remains active and unchanged in Phase 1.
 */
export const SupabaseRealtimeFoundation = {
  subscribeToSales: (
    onInsert?: (sale: SaleItem) => void,
    onUpdate?: (sale: SaleItem) => void,
    onDelete?: (id: string) => void
  ): RealtimeChannel | null => {
    const client = getSupabase();
    if (!client) return null;

    return client
      .channel('public:sales')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        (payload) => onInsert?.(payload.new as SaleItem)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sales' },
        (payload) => onUpdate?.(payload.new as SaleItem)
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'sales' },
        (payload) => onDelete?.(payload.old?.id)
      )
      .subscribe();
  },

  subscribeToProducts: (
    onProductChange?: (product: ProductConfig) => void
  ): RealtimeChannel | null => {
    const client = getSupabase();
    if (!client) return null;

    return client
      .channel('public:products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => onProductChange?.((payload.new || payload.old) as ProductConfig)
      )
      .subscribe();
  },

  subscribeToStockIns: (
    onStockInInsert?: (record: StockInRecord) => void
  ): RealtimeChannel | null => {
    const client = getSupabase();
    if (!client) return null;

    return client
      .channel('public:stock_ins')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stock_ins' },
        (payload) => onStockInInsert?.(payload.new as StockInRecord)
      )
      .subscribe();
  },

  subscribeToSystemConfig: (
    onConfigChange?: (config: CloudSpreadsheetInfo) => void
  ): RealtimeChannel | null => {
    const client = getSupabase();
    if (!client) return null;

    return client
      .channel('public:system_configs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_configs', filter: 'key=eq.google_sheets' },
        (payload) => onConfigChange?.((payload.new as any)?.value as CloudSpreadsheetInfo)
      )
      .subscribe();
  },
};
