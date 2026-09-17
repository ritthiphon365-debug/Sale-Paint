// Comprehensive data models for the Sales Management System

export type SizeOption = '5GL' | '2.5GL' | '1GL' | '1/4GL' | string;
export type BaseOption = 'A' | 'B' | 'C' | 'D' | string;

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  filmColor?: string; // ฟิล์มสี เช่น กึ่งเงา, ด้าน, เนียน, เงา หรือ '-'
  size: string; // ขนาด เช่น 5GL, 2.5GL, 1GL, 1/4GL
  base?: string; // เบส เช่น A, B, C, D หรือ '-'
  colorCode?: string; // เบอร์สี เช่น ขาว, OW-1002 หรือ '-'
  price: number; // ราคาต่อหน่วย
  brand?: string;
  category?: string;
  updatedAt?: string;
}

export interface ProductConfig {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  availableSizes: SizeOption[];
  hasBases: boolean;
  availableBases?: BaseOption[];
  hasFilmColor: boolean;
  filmColors?: string[];
  hasColorCode: boolean;
  basePrices: Record<SizeOption, number>; // Size -> Base Price in THB
  initialStock: Record<string, number>; // variantKey (e.g., "5GL_A") -> qty
  isQuickPick?: boolean;
}

export interface SaleItem {
  id: string;
  billId: string;
  date: string; // YYYY-MM-DD
  productId: string;
  productName: string;
  brand: string;
  sku: string;
  size: SizeOption;
  base?: BaseOption;
  filmColor?: string;
  colorCode?: string;
  price: number;
  tintPrice: number;
  quantity: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  salesperson?: string;
  salespersonEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  tempId: string;
  product: ProductConfig;
  size: SizeOption;
  base?: BaseOption;
  filmColor?: string;
  colorCode?: string;
  price: number;
  tintPrice: number;
  quantity: number;
  total: number;
}

export interface StockInRecord {
  id: string;
  date: string;
  productId: string;
  productName: string;
  sku: string;
  size: SizeOption;
  base?: BaseOption;
  quantity: number;
  note?: string;
  createdAt: string;
}

export interface StockItemComputed {
  productId: string;
  sku: string;
  productName: string;
  brand: string;
  size: SizeOption;
  base?: BaseOption;
  initialStock: number;
  stockIn: number;
  soldQuantity: number;
  remainingStock: number;
  avgDailySales14d: number;
  daysLeft: number;
  isLowStock: boolean;
  isOversold: boolean;
  unitPrice: number;
  totalValue: number;
}

export type FollowUpStatus = 'NEW' | 'OK' | 'DUE' | 'OVERDUE';

export interface CustomerCRM {
  id: string; // Name + Phone
  name: string;
  phone: string;
  totalSpending: number;
  totalOrders: number;
  billCount: number;
  firstOrderDate: string;
  lastOrderDate: string;
  favoriteProducts: { productName: string; quantity: number }[];
  avgPurchaseCycleDays: number;
  daysSinceLastOrder: number;
  followUpStatus: FollowUpStatus;
  notes?: string;
}

export interface MarketShareRecord {
  id: string;
  mode: 'daily' | 'weekly';
  date?: string; // for daily
  fromDate?: string; // for weekly
  toDate?: string; // for weekly
  brandEntries: {
    brandName: string;
    pcCount?: number;
    pcRegular?: number;
    pcPro?: number;
    targetSales: number;
    actualSales: number;
    note?: string;
  }[];
  updatedAt: string;
}

export interface CommissionTier {
  achievementPercent: number; // e.g. 80, 85, 90, 100, 110...
  rewardAmount: number; // reward in THB
}

export interface SpecialCommissionBand {
  id: string;
  minSales: number;
  maxSales: number;
  rewardAmount: number;
}

export interface CommissionConfig {
  monthlyTarget: number;
  headcount: number;
  tiers: CommissionTier[];
  specialBands: SpecialCommissionBand[];
  rewardPerHead: number; // For headcount calculation
}

export type GallonRuleType =
  | 'per_unit'
  | 'lump_sum_qty'
  | 'threshold_revenue_per_bucket'
  | 'min_qty_per_unit'
  | 'size_standard';

export interface GallonIncentiveRule {
  id: string;
  name: string;
  ruleType: GallonRuleType;
  productName?: string; // ชื่อสินค้าจาก Catalog (เช่น 'WEATHERBOND', 'HYBRID SHIELD สีทาฝ้า')
  targetProductName?: string;
  productId?: string;
  sku?: string;
  size?: SizeOption;
  base?: BaseOption;
  selectedSizes?: string[]; // ขนาดที่ร่วมรายการ
  selectedBases?: string[]; // เบสที่ร่วมรายการ
  selectedFilmColors?: string[]; // ชนิดฟิล์มสีที่ร่วมรายการ
  selectedColorCodes?: string[]; // เบอร์สีที่ร่วมรายการ
  minQuantity?: number; // จำนวนถังขั้นต่ำ
  minRevenue?: number; // ยอดขายบาทขั้นต่ำ
  thresholdPricePerUnit?: number;
  reward: number; // จำนวนเงินรางวัล (บาท/ถัง หรือ บาทเหมา)
  bundleSize?: number;
  enabled: boolean;
  notes?: string;
}

export interface BrandSettings {
  brandName: string;
  subtitle: string;
  branch: string;
  badge: string;
  logoUrl?: string;
  theme: 'red' | 'blue' | 'emerald' | 'violet' | 'amber' | 'teal' | 'slate';
  lineNotifyToken?: string;
  lineOaUrl?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'Add Sale' | 'Edit Sale' | 'Delete Sale' | 'Stock In' | 'Stock Adjustment' | 'Product Edit' | 'Import Excel' | 'Export' | 'Settings Change' | 'Google Sync' | 'Reset Data';
  user: string;
  detail: string;
  flag?: 'info' | 'warning' | 'danger' | 'success';
}

export interface UserSession {
  uid?: string;
  email: string;
  name: string;
  avatar: string;
  accessToken?: string;
  isOnline: boolean;
}

export interface MonthTargetData {
  month: number; // 1-12
  year: number;
  target: number;
  brandTargets?: Record<string, number>;
}
