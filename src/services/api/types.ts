/**
 * SALE PAINT — API DATA LAYER TYPES
 */

export type DataBackendType = 'supabase' | 'firebase';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp?: string;
  };
  bill_id?: string;
  item_count?: number;
  total_amount?: number;
  [key: string]: any;
}

export interface CheckoutRequest {
  bill: {
    id?: string;
    billNo: string;
    date: string;
    customerName?: string;
    customerPhone?: string;
    salesperson?: string;
    salespersonEmail?: string;
    branch?: string;
    createdAt?: string;
  };
  items: Array<{
    id?: string;
    productId: string;
    productName: string;
    brand?: string;
    sku?: string;
    size: string;
    base?: string;
    filmColor?: string;
    colorCode?: string;
    price: number;
    tintPrice?: number;
    quantity: number;
    total: number;
    customerName?: string;
    customerPhone?: string;
    salesperson?: string;
    salespersonEmail?: string;
    branch?: string;
  }>;
  allowOversell?: boolean;
}

export interface StockCheckResult {
  sufficient: boolean;
  insufficientItems?: Array<{
    productId: string;
    productName: string;
    size: string;
    base?: string;
    available: number;
    requested: number;
  }>;
}
