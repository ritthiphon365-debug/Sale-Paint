/**
 * SALE PAINT — STOCK API
 * Manages stock inventory receipts and balance inquiries directly via Supabase.
 */

import { StockInRecord } from '../../types';
import { getSupabase } from '../../lib/supabase';
import { ApiResponse } from './types';

function mapDbRowToStockIn(row: any): StockInRecord {
  return {
    id: row.id,
    date: row.date || new Date().toISOString().split('T')[0],
    productId: row.product_id || row.productId || '',
    productName: row.product_name || row.productName || 'สินค้า',
    sku: row.sku || '',
    size: row.size || '1GL',
    base: row.base || undefined,
    quantity: Number(row.quantity || 0),
    note: row.note || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

function mapStockInToDbRow(rec: StockInRecord): Record<string, any> {
  return {
    id: rec.id,
    date: rec.date,
    product_id: rec.productId,
    product_name: rec.productName,
    sku: rec.sku,
    size: rec.size,
    base: rec.base || null,
    quantity: rec.quantity,
    note: rec.note || null,
    created_at: rec.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function errorResponse(err: any): ApiResponse {
  return {
    success: false,
    error: { code: 'SUPABASE_ERROR', message: err?.message || 'Request failed', timestamp: new Date().toISOString() },
  };
}

export class StockApi {
  static async fetchStockIns(): Promise<StockInRecord[]> {
    const client = getSupabase();
    if (!client) return [];
    const { data, error } = await client.from('stock_ins').select('*').order('created_at', { ascending: false });
    if (error || !Array.isArray(data)) return [];
    return data.map(mapDbRowToStockIn);
  }

  static async addStockIn(record: StockInRecord): Promise<ApiResponse> {
    const client = getSupabase();
    if (!client) return errorResponse({ message: 'Supabase ยังไม่ได้ตั้งค่า' });
    const { error } = await client.from('stock_ins').insert(mapStockInToDbRow(record));
    if (error) return errorResponse(error);
    return { success: true };
  }

  static async bulkAddStockIn(records: StockInRecord[]): Promise<ApiResponse> {
    const client = getSupabase();
    if (!client) return errorResponse({ message: 'Supabase ยังไม่ได้ตั้งค่า' });
    const { error } = await client.from('stock_ins').insert(records.map(mapStockInToDbRow));
    if (error) return errorResponse(error);
    return { success: true };
  }

  static async getVariantBalance(productId: string, size: string, base?: string): Promise<number> {
    const client = getSupabase();
    if (!client) return 0;
    const { data, error } = await client.rpc('get_variant_stock', {
      p_product_id: productId,
      p_size: size,
      p_base: base && base !== 'NONE' ? base : null,
    });
    if (error) return 0;
    return Number(data || 0);
  }
}
