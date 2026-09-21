/**
 * SALE PAINT — STOCK API
 * Manages atomic stock inventory receipts and balance inquiries.
 */

import { StockInRecord } from '../../types';
import { ApiClient } from './apiClient';

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

export class StockApi {
  static async fetchStockIns(): Promise<StockInRecord[]> {
    const res = await ApiClient.get<any[]>('/stock/stock-ins');
    if (!res.success || !Array.isArray(res.data)) {
      return [];
    }
    return res.data.map(mapDbRowToStockIn);
  }

  static async addStockIn(record: StockInRecord) {
    const dbPayload = mapStockInToDbRow(record);
    return ApiClient.post('/stock/stock-in', { record: dbPayload });
  }

  static async bulkAddStockIn(records: StockInRecord[]) {
    const dbPayload = records.map(mapStockInToDbRow);
    return ApiClient.post('/stock/bulk-stock-in', { records: dbPayload });
  }

  static async getVariantBalance(productId: string, size: string, base?: string): Promise<number> {
    const res = await ApiClient.get<any>('/stock/variant-balance', {
      productId,
      size,
      base: base || 'NONE',
    });
    return Number(res.data?.balance || 0);
  }
}
