/**
 * SALE PAINT — CATALOG API
 * Manages SKU catalog items and tinting lookup tables via API Gateway.
 */

import { CatalogItem } from '../../types';
import { ApiClient } from './apiClient';

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

export class CatalogApi {
  static async fetchCatalog(): Promise<CatalogItem[]> {
    const res = await ApiClient.get<any[]>('/catalog');
    if (!res.success || !Array.isArray(res.data)) {
      return [];
    }
    return res.data.map(mapDbRowToCatalogItem);
  }

  static async upsertCatalog(items: CatalogItem[]) {
    const dbPayload = items.map(mapCatalogItemToDbRow);
    return ApiClient.post('/catalog/upsert', { items: dbPayload });
  }

  static async deleteCatalogItem(id: string) {
    return ApiClient.delete(`/catalog/${id}`);
  }
}
