/**
 * SALE PAINT — SYSTEM CONFIG API
 * Manages central cloud configurations (Google Sheets, AutoSync, etc.) directly via Supabase.
 */

import { getSupabase } from '../../lib/supabase';

export class ConfigApi {
  static async getConfig<T = any>(key: string): Promise<T | null> {
    const client = getSupabase();
    if (!client) return null;
    const { data, error } = await client.from('system_configs').select('value').eq('key', key).maybeSingle();
    if (error || !data) return null;
    return (data.value as T) ?? null;
  }

  static async setConfig(key: string, value: any): Promise<{ success: boolean }> {
    const client = getSupabase();
    if (!client) return { success: false };
    const { error } = await client
      .from('system_configs')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    return { success: !error };
  }
}
