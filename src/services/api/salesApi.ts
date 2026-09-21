/**
 * SALE PAINT — SALES API
 * Manages sales and bill records with snake_case <-> camelCase mapping.
 * Connects to Cloudflare Worker / Supabase API Gateway.
 */

import { SaleItem } from '../../types';
import { ApiClient } from './apiClient';
import { CheckoutRequest } from './types';

function mapDbRowToSaleItem(row: any): SaleItem {
  return {
    id: row.id,
    billId: row.bill_id || row.billId || '',
    date: row.date || new Date().toISOString().split('T')[0],
    productId: row.product_id || row.productId || '',
    productName: row.product_name || row.productName || 'สินค้า',
    brand: row.brand || 'NIPPON PAINT',
    sku: row.sku || '',
    size: row.size || '1GL',
    base: row.base || undefined,
    filmColor: row.film_color || row.filmColor || undefined,
    colorCode: row.color_code || row.colorCode || undefined,
    price: Number(row.price || 0),
    tintPrice: Number(row.tint_price || row.tintPrice || 0),
    quantity: Number(row.quantity || 1),
    total: Number(row.total || 0),
    customerName: row.customer_name || row.customerName || undefined,
    customerPhone: row.customer_phone || row.customerPhone || undefined,
    salesperson: row.salesperson || undefined,
    salespersonEmail: row.salesperson_email || row.salespersonEmail || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

function mapSaleItemToDbRow(item: Partial<SaleItem>): Record<string, any> {
  const row: Record<string, any> = {};
  if (item.id !== undefined) row.id = item.id;
  if (item.billId !== undefined) row.bill_id = item.billId;
  if (item.date !== undefined) row.date = item.date;
  if (item.productId !== undefined) row.product_id = item.productId;
  if (item.productName !== undefined) row.product_name = item.productName;
  if (item.brand !== undefined) row.brand = item.brand;
  if (item.sku !== undefined) row.sku = item.sku;
  if (item.size !== undefined) row.size = item.size;
  if (item.base !== undefined) row.base = item.base;
  if (item.filmColor !== undefined) row.film_color = item.filmColor;
  if (item.colorCode !== undefined) row.color_code = item.colorCode;
  if (item.price !== undefined) row.price = item.price;
  if (item.tintPrice !== undefined) row.tint_price = item.tintPrice;
  if (item.quantity !== undefined) row.quantity = item.quantity;
  if (item.total !== undefined) row.total = item.total;
  if (item.customerName !== undefined) row.customer_name = item.customerName;
  if (item.customerPhone !== undefined) row.customer_phone = item.customerPhone;
  if (item.salesperson !== undefined) row.salesperson = item.salesperson;
  if (item.salespersonEmail !== undefined) row.salesperson_email = item.salespersonEmail;
  if (item.updatedAt !== undefined) row.updated_at = item.updatedAt;
  return row;
}

export class SalesApi {
  static async fetchSales(limit = 2000): Promise<SaleItem[]> {
    const res = await ApiClient.get<any[]>('/sales', { limit: String(limit) });
    if (!res.success || !Array.isArray(res.data)) {
      return [];
    }
    return res.data.map(mapDbRowToSaleItem);
  }

  static async checkoutSaleBill(req: CheckoutRequest, idempotencyKey?: string) {
    return ApiClient.post('/sales/checkout', req, idempotencyKey);
  }

  static async updateSale(id: string, partialSale: Partial<SaleItem>) {
    const dbPayload = mapSaleItemToDbRow(partialSale);
    return ApiClient.put(`/sales/${id}`, dbPayload);
  }

  static async deleteSale(id: string) {
    return ApiClient.delete(`/sales/${id}`);
  }
}
