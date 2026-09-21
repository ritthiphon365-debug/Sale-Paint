/**
 * SALE PAINT — UNIFIED DATA SERVICE (PHASE 4 CUTOVER FACADE)
 * 
 * Provides controlled data-layer switching between Supabase API and Firebase Firestore.
 * 
 * Controlled Feature Flag:
 * - VITE_DATA_BACKEND: 'supabase' (Primary in Phase 4) | 'firebase' (Fallback)
 */

import { CatalogItem, ProductConfig, SaleItem, StockInRecord } from '../../types';
import { SalesApi } from './salesApi';
import { ProductsApi } from './productsApi';
import { StockApi } from './stockApi';
import { CatalogApi } from './catalogApi';
import { ConfigApi } from './configApi';
import { RealtimeService } from './realtimeService';
import { CheckoutRequest, DataBackendType } from './types';

// Read controlled feature flag with dynamic runtime override support
function getActiveBackend(): DataBackendType {
  const envBackend = (import.meta as any).env?.VITE_DATA_BACKEND;
  return envBackend === 'firebase' ? 'firebase' : 'supabase';
}

export class DataService {
  static get backend(): DataBackendType {
    return getActiveBackend();
  }

  static isSupabasePrimary(): boolean {
    return this.backend === 'supabase';
  }

  static setBackend(target: DataBackendType) {
    // Backend selection is build/deployment configuration, never client-controlled.
    if (target !== this.backend) {
      console.warn('[DataService] Ignoring client-side backend switch. Set VITE_DATA_BACKEND at deployment time.');
    }
  }

  // --- SALES ---
  static async getSales(): Promise<SaleItem[]> {
    if (this.isSupabasePrimary()) {
      return SalesApi.fetchSales();
    }
    return []; // Handled by AppContext firestore listener if in fallback mode
  }

  static async checkout(req: CheckoutRequest, idempotencyKey?: string) {
    if (this.isSupabasePrimary()) {
      const res = await SalesApi.checkoutSaleBill(req, idempotencyKey);
      RealtimeService.broadcastLocalMutation('sales', 'INSERT', req.items);
      return res;
    }
    throw new Error('Fallback mode relies on AppContext direct firestore persist');
  }

  static async updateSale(id: string, partialSale: Partial<SaleItem>) {
    if (this.isSupabasePrimary()) {
      const res = await SalesApi.updateSale(id, partialSale);
      RealtimeService.broadcastLocalMutation('sales', 'UPDATE', { id, ...partialSale });
      return res;
    }
    throw new Error('Fallback mode relies on AppContext direct firestore persist');
  }

  static async deleteSale(id: string) {
    if (this.isSupabasePrimary()) {
      const res = await SalesApi.deleteSale(id);
      RealtimeService.broadcastLocalMutation('sales', 'DELETE', { id });
      return res;
    }
    throw new Error('Fallback mode relies on AppContext direct firestore persist');
  }

  // --- PRODUCTS ---
  static async getProducts(): Promise<ProductConfig[]> {
    if (this.isSupabasePrimary()) {
      return ProductsApi.fetchProducts();
    }
    return [];
  }

  static async upsertProducts(products: ProductConfig[]) {
    if (this.isSupabasePrimary()) {
      const res = await ProductsApi.upsertProducts(products);
      RealtimeService.broadcastLocalMutation('products', 'UPDATE', products);
      return res;
    }
    throw new Error('Fallback mode relies on AppContext direct firestore persist');
  }

  static async deleteProduct(id: string) {
    if (this.isSupabasePrimary()) {
      const res = await ProductsApi.deleteProduct(id);
      RealtimeService.broadcastLocalMutation('products', 'DELETE', { id });
      return res;
    }
    throw new Error('Fallback mode relies on AppContext direct firestore persist');
  }

  // --- CATALOG ---
  static async getCatalog(): Promise<CatalogItem[]> {
    if (this.isSupabasePrimary()) {
      return CatalogApi.fetchCatalog();
    }
    return [];
  }

  static async upsertCatalog(items: CatalogItem[]) {
    if (this.isSupabasePrimary()) {
      const res = await CatalogApi.upsertCatalog(items);
      RealtimeService.broadcastLocalMutation('catalog_items', 'UPDATE', items);
      return res;
    }
    throw new Error('Fallback mode relies on AppContext direct firestore persist');
  }

  static async deleteCatalogItem(id: string) {
    if (this.isSupabasePrimary()) {
      const res = await CatalogApi.deleteCatalogItem(id);
      RealtimeService.broadcastLocalMutation('catalog_items', 'DELETE', { id });
      return res;
    }
    throw new Error('Fallback mode relies on AppContext direct firestore persist');
  }

  // --- STOCK ---
  static async getStockIns(): Promise<StockInRecord[]> {
    if (this.isSupabasePrimary()) {
      return StockApi.fetchStockIns();
    }
    return [];
  }

  static async addStockIn(record: StockInRecord) {
    if (this.isSupabasePrimary()) {
      const res = await StockApi.addStockIn(record);
      RealtimeService.broadcastLocalMutation('stock_ins', 'INSERT', record);
      return res;
    }
    throw new Error('Fallback mode relies on AppContext direct firestore persist');
  }

  static async bulkAddStockIn(records: StockInRecord[]) {
    if (this.isSupabasePrimary()) {
      const res = await StockApi.bulkAddStockIn(records);
      RealtimeService.broadcastLocalMutation('stock_ins', 'INSERT', records);
      return res;
    }
    throw new Error('Fallback mode relies on AppContext direct firestore persist');
  }

  // --- SYSTEM CONFIG ---
  static async getSystemConfig<T = any>(key: string): Promise<T | null> {
    if (this.isSupabasePrimary()) {
      return ConfigApi.getConfig<T>(key);
    }
    return null;
  }

  static async setSystemConfig(key: string, value: any) {
    if (this.isSupabasePrimary()) {
      const res = await ConfigApi.setConfig(key, value);
      RealtimeService.broadcastLocalMutation('system_configs', 'UPDATE', { key, value });
      return res;
    }
    throw new Error('Fallback mode relies on AppContext direct firestore persist');
  }
}
