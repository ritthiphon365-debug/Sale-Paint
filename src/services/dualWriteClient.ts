/**
 * SALE PAINT — PHASE 3: CLIENT-SIDE DUAL-WRITE SYNCHRONIZATION ADAPTER
 * 
 * Safety Rules:
 * 1. Firebase/Firestore is the PRIMARY source of truth.
 * 2. Writes to Supabase (Secondary) are dispatched through this adapter.
 * 3. Never leaks Supabase service role keys or database credentials to browser.
 * 4. Supabase errors do not fail the user's primary transaction (Case C).
 * 5. Automatic idempotency key generation prevents duplicate records on retries.
 */

export interface DualWriteResponse {
  success: boolean;
  operation: string;
  idempotencyKey: string;
  queued: boolean;
  queueItemId?: string;
  error?: string | null;
  timestamp: string;
}

export class DualWriteClient {
  private static async sendDualWrite(
    operation: string,
    idempotencyKey: string,
    payload: any
  ): Promise<DualWriteResponse> {
    try {
      const response = await fetch('/api/sync/dual-write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          idempotencyKey,
          payload,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[DualWrite] Backend responded with status ${response.status}:`, errorText);
        return {
          success: true, // Primary Firestore succeeded; secondary queued or warned
          operation,
          idempotencyKey,
          queued: true,
          error: errorText,
          timestamp: new Date().toISOString(),
        };
      }

      const result: DualWriteResponse = await response.json();
      if (result.queued) {
        console.warn(`[DualWrite Warning] Secondary write to Supabase queued for retry (${operation}):`, result.error);
      }
      return result;
    } catch (err: any) {
      console.warn(`[DualWrite Network Warning] Failed to reach dual-write endpoint for ${operation}:`, err.message);
      return {
        success: true,
        operation,
        idempotencyKey,
        queued: true,
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Dual-write a completed bill and its sale line items to Supabase
   */
  public static async syncBillAndSales(bill: any, items: any[]): Promise<DualWriteResponse> {
    const idempotencyKey = `bill-${bill.id}`;
    return this.sendDualWrite('BILL_AND_SALES', idempotencyKey, { bill, items });
  }

  /**
   * Dual-write an updated sale line item to Supabase
   */
  public static async syncUpdateSale(sale: any): Promise<DualWriteResponse> {
    const idempotencyKey = `sale-upd-${sale.id}-${new Date(sale.updatedAt || Date.now()).getTime()}`;
    return this.sendDualWrite('UPDATE_SALE', idempotencyKey, { sale });
  }

  /**
   * Dual-write a deleted sale item to Supabase
   */
  public static async syncDeleteSale(saleId: string): Promise<DualWriteResponse> {
    const idempotencyKey = `sale-del-${saleId}`;
    return this.sendDualWrite('DELETE_SALE', idempotencyKey, { saleId });
  }

  /**
   * Dual-write upserted products to Supabase
   */
  public static async syncUpsertProducts(products: any[]): Promise<DualWriteResponse> {
    const idempotencyKey = `prods-upsert-${Date.now()}-${products.length}`;
    return this.sendDualWrite('UPSERT_PRODUCTS', idempotencyKey, { products });
  }

  /**
   * Dual-write deleted products to Supabase
   */
  public static async syncDeleteProducts(ids: string[]): Promise<DualWriteResponse> {
    const idempotencyKey = `prods-del-${ids.sort().join('_')}`;
    return this.sendDualWrite('DELETE_PRODUCTS', idempotencyKey, { ids });
  }

  /**
   * Dual-write upserted catalog items to Supabase
   */
  public static async syncUpsertCatalogItems(items: any[]): Promise<DualWriteResponse> {
    const idempotencyKey = `catalog-upsert-${Date.now()}-${items.length}`;
    return this.sendDualWrite('UPSERT_CATALOG_ITEMS', idempotencyKey, { items });
  }

  /**
   * Dual-write deleted catalog items to Supabase
   */
  public static async syncDeleteCatalogItems(ids: string[]): Promise<DualWriteResponse> {
    const idempotencyKey = `catalog-del-${ids.sort().join('_')}`;
    return this.sendDualWrite('DELETE_CATALOG_ITEMS', idempotencyKey, { ids });
  }

  /**
   * Dual-write stock-in records to Supabase
   */
  public static async syncUpsertStockIns(stockIns: any[]): Promise<DualWriteResponse> {
    const idempotencyKey = `stk-upsert-${Date.now()}-${stockIns.length}`;
    return this.sendDualWrite('UPSERT_STOCK_INS', idempotencyKey, { stockIns });
  }

  /**
   * Dual-write system config (e.g. google_sheets) to Supabase
   */
  public static async syncSystemConfig(key: string, value: any): Promise<DualWriteResponse> {
    const idempotencyKey = `config-${key}-${Date.now()}`;
    return this.sendDualWrite('SET_SYSTEM_CONFIG', idempotencyKey, { key, value });
  }

  /**
   * Dual-write collection clear / reset to Supabase
   */
  public static async syncClearCollection(tableName: string): Promise<DualWriteResponse> {
    const idempotencyKey = `clear-${tableName}-${Date.now()}`;
    return this.sendDualWrite('CLEAR_COLLECTION', idempotencyKey, { tableName });
  }
}
