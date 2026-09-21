/**
 * SALE PAINT — PRODUCTS API
 * Manages product definitions and configurations via Supabase API Gateway.
 */

import { ProductConfig } from '../../types';
import { ApiClient } from './apiClient';

function mapDbRowToProduct(row: any): ProductConfig {
  return {
    id: row.id,
    sku: row.sku || '',
    name: row.name || '',
    brand: row.brand || 'NIPPON PAINT',
    category: row.category || 'ทั่วไป',
    availableSizes: row.available_sizes || row.availableSizes || ['1GL'],
    hasBases: !!(row.has_bases ?? row.hasBases),
    availableBases: row.available_bases || row.availableBases || undefined,
    hasFilmColor: !!(row.has_film_color ?? row.hasFilmColor),
    filmColors: row.film_colors || row.filmColors || undefined,
    hasColorCode: !!(row.has_color_code ?? row.hasColorCode),
    basePrices: row.base_prices || row.basePrices || {},
    initialStock: row.initial_stock || row.initialStock || {},
    isQuickPick: !!(row.is_quick_pick ?? row.isQuickPick),
  };
}

function mapProductToDbRow(prod: ProductConfig): Record<string, any> {
  return {
    id: prod.id,
    sku: prod.sku,
    name: prod.name,
    brand: prod.brand,
    category: prod.category,
    available_sizes: prod.availableSizes,
    has_bases: prod.hasBases,
    available_bases: prod.availableBases || null,
    has_film_color: prod.hasFilmColor,
    film_colors: prod.filmColors || null,
    has_color_code: prod.hasColorCode,
    base_prices: prod.basePrices,
    initial_stock: prod.initialStock,
    is_quick_pick: prod.isQuickPick || false,
    updated_at: new Date().toISOString(),
  };
}

export class ProductsApi {
  static async fetchProducts(): Promise<ProductConfig[]> {
    const res = await ApiClient.get<any[]>('/products');
    if (!res.success || !Array.isArray(res.data)) {
      return [];
    }
    return res.data.map(mapDbRowToProduct);
  }

  static async upsertProducts(products: ProductConfig[]) {
    const dbPayload = products.map(mapProductToDbRow);
    return ApiClient.post('/products/upsert', { products: dbPayload });
  }

  static async deleteProduct(id: string) {
    return ApiClient.delete(`/products/${id}`);
  }
}
