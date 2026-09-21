/**
 * SALE PAINT — SUPABASE REALTIME SERVICE
 * 
 * Replaces Firestore onSnapshot listeners with Supabase Realtime Channels.
 * Subscribes to:
 * - sales (INSERT, UPDATE, DELETE)
 * - products (INSERT, UPDATE, DELETE)
 * - catalog_items (INSERT, UPDATE, DELETE)
 * - stock_ins (INSERT)
 * - system_configs (UPDATE)
 * 
 * Includes multi-tab broadcast fallback for zero-latency local sync.
 */

import { getSupabase } from '../../lib/supabase';

type RealtimeCallback<T = any> = (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE' | 'SYNC'; new?: T; old?: T }) => void;

export class RealtimeService {
  private static subscribers: Map<string, Set<RealtimeCallback>> = new Map();
  private static broadcastChannel: BroadcastChannel | null = null;
  private static supabaseChannelsInitialized = false;

  static init() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window && !this.broadcastChannel) {
      try {
        this.broadcastChannel = new BroadcastChannel('salepaint_realtime_bus');
        this.broadcastChannel.onmessage = (event) => {
          const { table, eventType, data } = event.data || {};
          if (table && this.subscribers.has(table)) {
            this.subscribers.get(table)?.forEach((cb) => cb({ eventType: eventType || 'SYNC', new: data }));
          }
        };
      } catch (err) {
        console.warn('[RealtimeService] BroadcastChannel unavailable:', err);
      }
    }

    // Connect to Supabase Realtime (Postgres Changes) so other devices see live updates
    this.connectSupabaseRealtime();
  }

  private static connectSupabaseRealtime() {
    if (typeof window === 'undefined' || this.supabaseChannelsInitialized) return;
    const client = getSupabase();
    if (!client) return;
    this.supabaseChannelsInitialized = true;

    const tables = ['sales', 'products', 'catalog_items', 'stock_ins', 'system_configs'];
    tables.forEach((table) => {
      client
        .channel(`public:${table}:live`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload: any) => {
          if (this.subscribers.has(table)) {
            this.subscribers
              .get(table)
              ?.forEach((cb) => cb({ eventType: payload.eventType, new: payload.new, old: payload.old }));
          }
        })
        .subscribe();
    });
  }

  static subscribe(table: 'sales' | 'products' | 'catalog_items' | 'stock_ins' | 'system_configs', callback: RealtimeCallback) {
    if (!this.subscribers.has(table)) {
      this.subscribers.set(table, new Set());
    }
    this.subscribers.get(table)?.add(callback);

    return () => {
      this.subscribers.get(table)?.delete(callback);
    };
  }

  static broadcastLocalMutation(table: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE', data: any) {
    // Notify local subscribers
    if (this.subscribers.has(table)) {
      this.subscribers.get(table)?.forEach((cb) => cb({ eventType, new: data }));
    }

    // Broadcast to other tabs/windows
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ table, eventType, data });
      } catch {}
    }
  }
}

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  RealtimeService.init();
}
