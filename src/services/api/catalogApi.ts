/**
 * SALE PAINT — CATALOG API
 * Manages SKU catalog items and tinting lookup tables directly via Supabase.
 */

import { CatalogItem } from '../../types';
import { getSupabase } from '../../lib/supabase';
import { ApiResponse } from './types';

function mapDbRowToCatalogItem(row: any): CatalogItem {
  return {
    id: row.id,
    sku: row.sku || '',
    name: row.name || '',
    filmColor: row.film_color || row.filmColor || undefined,
    size: row.size || '1GL',
    base: row.base || undefined,
    colorCode: row.color_code || row.colorCode || undefined,
    price: Number(row.price || 0),
    brand: row.brand || 'NIPPON PAINT',
    category: row.category || 'ทั่วไป',
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapCatalogItemToDbRow(item: CatalogItem): Record<string, any> {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    film_color: item.filmColor || null,
    size: item.size,
    base: item.base || null,
    color_code: item.colorCode || null,
    price: item.price,
    brand: item.brand || 'NIPPON PAINT',
    category: item.category || 'ทั่วไป',
    updated_at: new Date().toISOString(),
  };
}

function errorResponse(err: any): ApiResponse {
  return {
    success: false,
    error: { code: 'SUPABASE_ERROR', message: err?.message || 'Request failed', timestamp: new Date().toISOString() },
  };
}

export class CatalogApi {
  static async fetchCatalog(): Promise<CatalogItem[]> {
    const client = getSupabase();
    if (!client) return [];
    const { data, error } = await client.from('catalog_items').select('*');
    if (error || !Array.isArray(data)) return [];
    return data.map(mapDbRowToCatalogItem);
  }

  static async upsertCatalog(items: CatalogItem[]): Promise<ApiResponse> {
    const client = getSupabase();
    if (!client) return errorResponse({ message: 'Supabase ยังไม่ได้ตั้งค่า' });
    const dbPayload = items.map(mapCatalogItemToDbRow);
    const { error } = await client.from('catalog_items').upsert(dbPayload, { onConflict: 'id' });
    if (error) return errorResponse(error);
    return { success: true };
  }

  static async deleteCatalogItem(id: string): Promise<ApiResponse> {
    const client = getSupabase();
    if (!client) return errorResponse({ message: 'Supabase ยังไม่ได้ตั้งค่า' });
    const { error } = await client.from('catalog_items').delete().eq('id', id);
    if (error) return errorResponse(error);
    return { success: true };
  }
}
