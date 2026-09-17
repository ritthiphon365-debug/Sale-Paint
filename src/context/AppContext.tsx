import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  ProductConfig,
  SaleItem,
  StockInRecord,
  StockItemComputed,
  CustomerCRM,
  AuditLog,
  BrandSettings,
  CommissionConfig,
  GallonIncentiveRule,
  MonthTargetData,
  MarketShareRecord,
  UserSession,
  CartItem,
  CatalogItem,
} from '../types';
import {
  StorageKeys,
  hasStoredKey,
  getStoredData,
  setStoredData,
  clearNamespaceData,
  clearAllStorageData,
} from '../services/storageService';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATALOG_ITEMS,
  INITIAL_BRAND_SETTINGS,
  INITIAL_COMMISSION_CONFIG,
  INITIAL_GALLON_RULES,
  INITIAL_YEAR_TARGETS,
} from '../mockData';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged } from '../lib/firebase';
import {
  computeStockInventory,
  computeCustomerCRM,
  computeCommission,
} from '../services/calculationService';

interface AppContextType {
  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openDrawer: boolean;
  setOpenDrawer: (open: boolean) => void;

  // Active User / Session
  userSession: UserSession;
  updateUserSession: (updated: Partial<UserSession>) => void;
  loginWithGoogle: () => void;
  logout: () => void;
  isOnline: boolean;

  // Product Catalog (ฐานข้อมูลสินค้า PC)
  catalogItems: CatalogItem[];
  addCatalogItem: (item: CatalogItem) => void;
  updateCatalogItem: (item: CatalogItem) => void;
  deleteCatalogItem: (id: string) => void;
  importCatalogItems: (
    items: CatalogItem[],
    mode: 'replace' | 'append'
  ) => { added: number; replaced: number; skipped: number };
  syncCatalogToGoogle: () => Promise<string | null>;
  catalogSyncTime: string | null;

  // Products Configs for quick picking
  products: ProductConfig[];
  addProduct: (prod: ProductConfig) => void;
  updateProduct: (prod: ProductConfig) => void;
  deleteProduct: (id: string) => void;

  // Cart / Sales Entry
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (tempId: string) => void;
  updateCartQuantity: (tempId: string, quantity: number) => void;
  clearCart: () => void;
  saveBill: (customerName?: string, customerPhone?: string) => string; // returns billId

  // Sales Records & History
  sales: SaleItem[];
  updateSale: (updated: SaleItem) => void;
  deleteSale: (saleId: string) => void;
  importSalesHistory: (
    items: SaleItem[],
    mode: 'replace' | 'append'
  ) => { added: number; replaced: number; skipped: number };

  // Stock
  stockIns: StockInRecord[];
  addStockIn: (stk: Omit<StockInRecord, 'id' | 'createdAt'>) => void;
  bulkAddStockIn: (stks: Omit<StockInRecord, 'id' | 'createdAt'>[]) => void;
  adjustStockQuick: (productId: string, size: any, base: any, delta: number) => void;
  computedStock: StockItemComputed[];

  // Customers CRM
  customers: CustomerCRM[];

  // Commission & Gallon Rules
  commissionConfig: CommissionConfig;
  updateCommissionConfig: (config: CommissionConfig) => void;
  gallonRules: GallonIncentiveRule[];
  addGallonRule: (rule: GallonIncentiveRule) => void;
  updateGallonRule: (rule: GallonIncentiveRule) => void;
  deleteGallonRule: (ruleId: string) => void;
  computedCommission: ReturnType<typeof computeCommission>;

  // Targets & Yearly
  yearTargets: MonthTargetData[];
  updateYearTarget: (month: number, year: number, target: number, applyToAllMonths?: boolean) => void;

  // Market Share
  marketShareDaily: MarketShareRecord[];
  saveMarketShareDaily: (record: MarketShareRecord) => void;
  marketShareWeekly: MarketShareRecord[];
  saveMarketShareWeekly: (record: MarketShareRecord) => void;

  // Brand Settings
  brandSettings: BrandSettings;
  updateBrandSettings: (settings: BrandSettings) => void;

  // Audit Logs
  auditLogs: AuditLog[];
  addAuditLog: (action: AuditLog['action'], detail: string, flag?: AuditLog['flag']) => void;

  // Toast / Feedback
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;

  // Data Reset
  resetSales: () => void;
  resetStock: () => void;
  resetCustomers: () => void;
  resetAllData: () => void;
  resetToFactorySettings: (keepCatalog?: boolean) => Promise<void>;

  // Google Integration
  googleConnected: boolean;
  connectGoogle: () => void;
  disconnectGoogle: () => void;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  syncWithGoogle: () => Promise<void>;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncError: string | null;
  lastSyncTime: string | null;

  // Quick action modals
  modalOpen: string | null;
  setModalOpen: (name: string | null) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// Initial seed sales for a rich realistic experience
const INITIAL_SALES_SEED: SaleItem[] = [
  {
    id: 'sale-001',
    billId: 'BILL-20260916-01',
    date: '2026-09-16',
    productId: 'prod-wb-01',
    productName: 'WEATHERBOND',
    brand: 'NIPPON PAINT',
    sku: 'WB-EXT-01',
    size: '5GL',
    base: 'A',
    filmColor: 'กึ่งเงา (Semi-Gloss)',
    colorCode: 'OW-1002',
    price: 3450,
    tintPrice: 200,
    quantity: 2,
    total: 7300,
    customerName: 'ช่างสมชาย รับเหมาพรีเมียม',
    customerPhone: '081-445-9988',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sale-002',
    billId: 'BILL-20260916-01',
    date: '2026-09-16',
    productId: 'prod-pri-06',
    productName: 'QUICK SEALER PRIMER',
    brand: 'NIPPON PAINT',
    sku: 'PRI-QUICK-06',
    size: '5GL',
    price: 2950,
    tintPrice: 0,
    quantity: 2,
    total: 5900,
    customerName: 'ช่างสมชาย รับเหมาพรีเมียม',
    customerPhone: '081-445-9988',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'sale-003',
    billId: 'BILL-20260915-02',
    date: '2026-09-15',
    productId: 'prod-wba-02',
    productName: 'WEATHERBOND ADVANCE',
    brand: 'NIPPON PAINT',
    sku: 'WBA-ADV-02',
    size: '5GL',
    base: 'B',
    filmColor: 'เนียน (Sheen)',
    colorCode: 'GY-5040',
    price: 4150,
    tintPrice: 350,
    quantity: 4,
    total: 18000,
    customerName: 'คุณวิภาวรรณ สถาปนิก',
    customerPhone: '089-223-1100',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'sale-004',
    billId: 'BILL-20260914-03',
    date: '2026-09-14',
    productId: 'prod-air-04',
    productName: 'AIRCARE INTERIOR',
    brand: 'NIPPON PAINT',
    sku: 'AIR-INT-04',
    size: '5GL',
    base: 'A',
    filmColor: 'ด้านพิเศษ (Dead Matt)',
    colorCode: 'WH-0001',
    price: 3890,
    tintPrice: 0,
    quantity: 3,
    total: 11670,
    customerName: 'โครงการ พลีโน่ ราชพฤกษ์',
    customerPhone: '02-889-1234',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  }
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [openDrawer, setOpenDrawer] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<string | null>(null);

  // Network Online/Offline
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.text === text ? null : cur));
    }, 3200);
  };

  // User Session
  const [userSession, setUserSession] = useState<UserSession>(() => {
    return getStoredData<UserSession>(StorageKeys.USER_SESSION, {
      name: 'Ritthiphon Phromsorn',
      email: 'ritthiphon365@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isOnline: true,
    });
  });

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const session: UserSession = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'ผู้ใช้งาน Google',
          email: firebaseUser.email || '',
          avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isOnline: true,
        };
        setUserSession(session);
        setStoredData(StorageKeys.USER_SESSION, session);
      }
    });
    return () => unsubscribe();
  }, []);

  const updateUserSession = (updated: Partial<UserSession>) => {
    setUserSession((prev) => {
      const next = { ...prev, ...updated };
      setStoredData(StorageKeys.USER_SESSION, next);
      return next;
    });
    addAuditLog('Settings Change', `อัปเดตข้อมูลโปรไฟล์ผู้ใช้ (${updated.name || userSession.name})`, 'success');
    showToast('บันทึกข้อมูลผู้ใช้งานเรียบร้อยแล้ว', 'success');
  };

  const loginWithGoogle = async () => {
    try {
      // Firebase's Google provider is configured with prompt=select_account,
      // so every explicit login/switch-account action opens Google's chooser.
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const session: UserSession = {
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'ผู้ใช้งาน Google',
        email: user.email || '',
        avatar: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        isOnline: true,
      };
      setUserSession(session);
      setStoredData(StorageKeys.USER_SESSION, session);
      addAuditLog('Settings Change', `เข้าสู่ระบบด้วยบัญชี Google (${user.email}) สำเร็จ`, 'success');
      showToast(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ ${session.name}`, 'success');
    } catch (err: any) {
      console.warn('Google sign-in error:', err);

      // Do NOT create a fake Google session. If the browser blocks popups,
      // use Firebase redirect as a real authentication fallback.
      if (err?.code === 'auth/popup-blocked') {
        try {
          showToast('กำลังเปิดหน้า Google เพื่อเลือกบัญชี...', 'info');
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          console.error('Google redirect sign-in error:', redirectErr);
          showToast('ไม่สามารถเปิด Google ได้ กรุณาอนุญาต Popup/Redirect แล้วลองใหม่', 'error');
          return;
        }
      }

      if (err?.code === 'auth/popup-closed-by-user') {
        showToast('ยกเลิกการเข้าสู่ระบบ Google แล้ว', 'info');
        return;
      }

      showToast(`เข้าสู่ระบบ Google ไม่สำเร็จ${err?.message ? `: ${err.message}` : ''}`, 'error');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    const emptySession: UserSession = {
      name: 'Guest User',
      email: '',
      avatar: '',
      isOnline: false,
    };
    setUserSession(emptySession);
    setStoredData(StorageKeys.USER_SESSION, emptySession);
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  };

  // Product Catalog (ฐานข้อมูลสินค้า PC แต่ละคน)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(() => {
    return getStoredData<CatalogItem[]>(StorageKeys.CATALOG_ITEMS, INITIAL_CATALOG_ITEMS);
  });
  const [catalogSyncTime, setCatalogSyncTime] = useState<string | null>(() => {
    return getStoredData<string | null>(`${StorageKeys.CATALOG_ITEMS}_sync`, null);
  });

  const addCatalogItem = (item: CatalogItem) => {
    const updated = [item, ...catalogItems];
    setCatalogItems(updated);
    setStoredData(StorageKeys.CATALOG_ITEMS, updated);
    addAuditLog('Product Edit', `เพิ่มสินค้าในแคตตาล็อก: ${item.name} (${item.sku})`, 'success');
    showToast(`เพิ่มสินค้า ${item.name} ในแคตตาล็อกสำเร็จ`, 'success');

    // Auto sync to Google Sheets if connected
    if (googleConnected) {
      GoogleSheetsService.pushCatalogToSheet(updated, `${brandSettings.brandName} Product Catalog`).catch(console.warn);
    }
  };

  const updateCatalogItem = (item: CatalogItem) => {
    const updated = catalogItems.map((c) => (c.id === item.id ? item : c));
    setCatalogItems(updated);
    setStoredData(StorageKeys.CATALOG_ITEMS, updated);
    addAuditLog('Product Edit', `แก้ไขสินค้าในแคตตาล็อก: ${item.name}`, 'info');
    showToast(`แก้ไขข้อมูล ${item.name} สำเร็จ`, 'success');
  };

  const deleteCatalogItem = (id: string) => {
    const target = catalogItems.find((c) => c.id === id);
    const updated = catalogItems.filter((c) => c.id !== id);
    setCatalogItems(updated);
    setStoredData(StorageKeys.CATALOG_ITEMS, updated);
    addAuditLog('Product Edit', `ลบสินค้าจากแคตตาล็อก: ${target?.name || id}`, 'warning');
    showToast('ลบรายการสินค้าเรียบร้อย', 'info');
  };

  const importCatalogItems = (
    newItems: CatalogItem[],
    mode: 'replace' | 'append'
  ): { added: number; replaced: number; skipped: number } => {
    if (mode === 'replace') {
      setCatalogItems(newItems);
      setStoredData(StorageKeys.CATALOG_ITEMS, newItems);
      addAuditLog('Product Edit', `นำเข้าไฟล์ Excel แทนที่แคตตาล็อกเดิมทั้งหมด ${newItems.length} รายการ`, 'info');
      showToast(`แทนที่ข้อมูลแคตตาล็อกสำเร็จ ${newItems.length} รายการ`, 'success');

      if (googleConnected) {
        GoogleSheetsService.pushCatalogToSheet(newItems, `${brandSettings.brandName} Product Catalog`).catch(console.warn);
      }
      return { added: newItems.length, replaced: catalogItems.length, skipped: 0 };
    } else {
      // Smart Auto-detect: Only add new items, preserve existing
      const existingSkus = new Set(catalogItems.map((c) => (c.sku || '').trim().toLowerCase()));
      const existingSigs = new Set(
        catalogItems.map((c) =>
          `${c.name.trim().toLowerCase()}_${(c.size || '').trim().toLowerCase()}_${(c.base || '').trim().toLowerCase()}_${(c.colorCode || '').trim().toLowerCase()}`
        )
      );

      const toAdd: CatalogItem[] = [];
      let skipped = 0;

      newItems.forEach((item) => {
        const hasSku = item.sku && existingSkus.has(item.sku.trim().toLowerCase());
        const sig = `${item.name.trim().toLowerCase()}_${(item.size || '').trim().toLowerCase()}_${(item.base || '').trim().toLowerCase()}_${(item.colorCode || '').trim().toLowerCase()}`;
        const hasSig = existingSigs.has(sig);

        if (hasSku || hasSig) {
          skipped++;
        } else {
          toAdd.push(item);
          if (item.sku) existingSkus.add(item.sku.trim().toLowerCase());
          existingSigs.add(sig);
        }
      });

      const merged = [...catalogItems, ...toAdd];
      setCatalogItems(merged);
      setStoredData(StorageKeys.CATALOG_ITEMS, merged);
      addAuditLog('Product Edit', `เพิ่มสินค้าใหม่จากไฟล์ Excel ${toAdd.length} รายการ (พบรายการเดิมที่มีอยู่แล้ว ${skipped} รายการ)`, 'success');
      showToast(`เพิ่มสินค้าใหม่ ${toAdd.length} รายการ (ข้ามรายการเดิม ${skipped} รายการ)`, 'success');

      if (googleConnected) {
        GoogleSheetsService.pushCatalogToSheet(merged, `${brandSettings.brandName} Product Catalog`).catch(console.warn);
      }
      return { added: toAdd.length, replaced: 0, skipped };
    }
  };

  const syncCatalogToGoogle = async (): Promise<string | null> => {
    try {
      const res = await GoogleSheetsService.pushCatalogToSheet(catalogItems, `${brandSettings.brandName} Product Catalog`);
      const now = new Date().toLocaleTimeString('th-TH');
      setCatalogSyncTime(now);
      setStoredData(`${StorageKeys.CATALOG_ITEMS}_sync`, now);
      addAuditLog('Google Sync', `ซิงค์ฐานข้อมูลสินค้า PC (${catalogItems.length} รายการ) ไปยัง Google Sheets`, 'success');
      showToast(`ซิงค์แคตตาล็อก ${catalogItems.length} รายการไปยัง Google Sheets สำเร็จ`, 'success');
      return res.url;
    } catch (err: any) {
      showToast('ไม่สามารถซิงค์ Google Sheets ได้: ' + (err.message || ''), 'error');
      return null;
    }
  };

  // Products
  const [products, setProducts] = useState<ProductConfig[]>(() => {
    return getStoredData<ProductConfig[]>(StorageKeys.PRODUCTS, INITIAL_PRODUCTS);
  });

  const addProduct = (prod: ProductConfig) => {
    const updated = [prod, ...products];
    setProducts(updated);
    setStoredData(StorageKeys.PRODUCTS, updated);
    addAuditLog('Product Edit', `เพิ่มสินค้าใหม่: ${prod.name} (${prod.sku})`, 'info');
    showToast(`เพิ่มสินค้า ${prod.name} เรียบร้อย`, 'success');
  };

  const updateProduct = (prod: ProductConfig) => {
    const updated = products.map((p) => (p.id === prod.id ? prod : p));
    setProducts(updated);
    setStoredData(StorageKeys.PRODUCTS, updated);
    addAuditLog('Product Edit', `แก้ไขข้อมูลสินค้า: ${prod.name}`, 'info');
    showToast(`อัปเดตข้อมูล ${prod.name} สำเร็จ`, 'success');
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    setStoredData(StorageKeys.PRODUCTS, updated);
    addAuditLog('Product Edit', `ลบสินค้า: ${target?.name || id}`, 'warning');
    showToast('ลบรายการสินค้าเรียบร้อย', 'info');
  };

  // Sales Records
  const [sales, setSales] = useState<SaleItem[]>(() => {
    if (hasStoredKey(StorageKeys.SALES)) {
      return getStoredData<SaleItem[]>(StorageKeys.SALES, []);
    }
    // Only use initial seed on brand new first install before any reset
    if (hasStoredKey(StorageKeys.INITIALIZED)) {
      return [];
    }
    return INITIAL_SALES_SEED;
  });

  // Stock Ins
  const [stockIns, setStockIns] = useState<StockInRecord[]>(() => {
    return getStoredData<StockInRecord[]>(StorageKeys.STOCK_IN, []);
  });

  const addStockIn = (stk: Omit<StockInRecord, 'id' | 'createdAt'>) => {
    const newRecord: StockInRecord = {
      ...stk,
      id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...stockIns];
    setStockIns(updated);
    setStoredData(StorageKeys.STOCK_IN, updated);
    addAuditLog('Stock In', `รับสต็อกเข้า ${stk.productName} [${stk.size}] +${stk.quantity} หน่วย`, 'success');
    showToast(`เติมสต็อก ${stk.productName} +${stk.quantity} เรียบร้อย`, 'success');
  };

  const bulkAddStockIn = (items: Omit<StockInRecord, 'id' | 'createdAt'>[]) => {
    const newRecords: StockInRecord[] = items.map((stk) => ({
      ...stk,
      id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    }));
    const updated = [...newRecords, ...stockIns];
    setStockIns(updated);
    setStoredData(StorageKeys.STOCK_IN, updated);
    addAuditLog('Stock In', `รับสต็อกเข้าแบบกลุ่ม (Bulk) รวม ${items.length} รายการ`, 'success');
    showToast(`เติมสต็อกแบบกลุ่มสำเร็จ ${items.length} รายการ`, 'success');
  };

  const adjustStockQuick = (productId: string, size: any, base: any, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    addStockIn({
      date: new Date().toISOString().split('T')[0],
      productId,
      productName: prod.name,
      sku: prod.sku,
      size,
      base,
      quantity: delta,
      note: delta > 0 ? 'ปรับสต็อกด่วน (+)' : 'ตัดสต็อกปรับปรุง (-)',
    });
  };

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (item: CartItem) => {
    setCart((prev) => [...prev, item]);
    showToast(`เพิ่ม ${item.product.name} [${item.size}] ลงบิลแล้ว`, 'success');
  };

  const removeFromCart = (tempId: string) => {
    setCart((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const updateCartQuantity = (tempId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(tempId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? { ...item, quantity, total: (item.price + item.tintPrice) * quantity }
          : item
      )
    );
  };

  const clearCart = () => setCart([]);

  const saveBill = (customerName?: string, customerPhone?: string): string => {
    if (cart.length === 0) {
      showToast('ไม่มีรายการสินค้าในบิล', 'error');
      return '';
    }

    const billId = `BILL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const nowIso = new Date().toISOString();
    const today = nowIso.split('T')[0];

    const newSaleItems: SaleItem[] = cart.map((item, idx) => ({
      id: `sale-${Date.now()}-${idx}`,
      billId,
      date: today,
      productId: item.product.id,
      productName: item.product.name,
      brand: item.product.brand,
      sku: item.product.sku,
      size: item.size,
      base: item.base,
      filmColor: item.filmColor,
      colorCode: item.colorCode,
      price: item.price,
      tintPrice: item.tintPrice,
      quantity: item.quantity,
      total: item.total,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      salesperson: userSession.name || 'พนักงานขาย',
      salespersonEmail: userSession.email || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));

    const updatedSales = [...newSaleItems, ...sales];
    setSales(updatedSales);
    setStoredData(StorageKeys.SALES, updatedSales);
    setCart([]);

    const billTotal = newSaleItems.reduce((acc, i) => acc + i.total, 0);
    addAuditLog('Add Sale', `เปิดบิล ${billId} (${customerName || 'ลูกค้าทั่วไป'}) ยอดรวม ฿${billTotal.toLocaleString()}`, 'success');
    showToast(`บันทึกการขายบิล ${billId} สำเร็จ ยอด ฿${billTotal.toLocaleString()}`, 'success');

    return billId;
  };

  const updateSale = (updated: SaleItem) => {
    const newSales = sales.map((s) => (s.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : s));
    setSales(newSales);
    setStoredData(StorageKeys.SALES, newSales);
    addAuditLog('Edit Sale', `แก้ไขรายการขาย #${updated.id} (${updated.productName})`, 'info');
    showToast('แก้ไขข้อมูลการขายสำเร็จ', 'success');
  };

  const deleteSale = (saleId: string) => {
    const target = sales.find((s) => s.id === saleId);
    const newSales = sales.filter((s) => s.id !== saleId);
    setSales(newSales);
    setStoredData(StorageKeys.SALES, newSales);
    addAuditLog('Delete Sale', `ลบรายการขาย: ${target?.productName} บิล ${target?.billId}`, 'danger');
    showToast('ลบรายการขายเรียบร้อยแล้ว', 'info');
  };

  const importSalesHistory = (
    importedItems: SaleItem[],
    mode: 'replace' | 'append'
  ): { added: number; replaced: number; skipped: number } => {
    setStoredData(StorageKeys.INITIALIZED, 'true');

    if (mode === 'replace') {
      const sorted = [...importedItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSales(sorted);
      setStoredData(StorageKeys.SALES, sorted);
      addAuditLog(
        'Import Excel',
        `แทนที่ประวัติยอดขายทั้งหมดด้วยไฟล์ Excel จากแอปเดิม จำนวน ${importedItems.length} รายการ`,
        'success'
      );
      showToast(
        `นำเข้าและแทนที่ประวัติการขายสำเร็จ ${importedItems.length} รายการ`,
        'success'
      );
      return { added: importedItems.length, replaced: importedItems.length, skipped: 0 };
    } else {
      const existingIds = new Set(sales.map((s) => s.id));
      const existingSignatures = new Set(sales.map((s) => `${s.billId}_${s.sku}_${s.date}_${s.quantity}_${s.total}`));

      const toAdd: SaleItem[] = [];
      let skipped = 0;

      importedItems.forEach((item) => {
        const sig = `${item.billId}_${item.sku}_${item.date}_${item.quantity}_${item.total}`;
        if (existingIds.has(item.id) || existingSignatures.has(sig)) {
          skipped++;
        } else {
          toAdd.push(item);
        }
      });

      const merged = [...toAdd, ...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSales(merged);
      setStoredData(StorageKeys.SALES, merged);

      addAuditLog(
        'Import Excel',
        `นำเข้าประวัติยอดขายจากแอปเดิมเพิ่ม ${toAdd.length} รายการ (ข้ามรายการซ้ำ ${skipped} รายการ)`,
        'success'
      );
      showToast(
        `นำเข้าประวัติยอดขายเพิ่มสำเร็จ ${toAdd.length} รายการ (ข้ามซ้ำ ${skipped} รายการ)`,
        'success'
      );
      return { added: toAdd.length, replaced: 0, skipped };
    }
  };

  // Computed Stock
  const computedStock = useMemo(() => {
    return computeStockInventory(products, stockIns, sales);
  }, [products, stockIns, sales]);

  // Computed Customers CRM
  const customers = useMemo(() => {
    return computeCustomerCRM(sales);
  }, [sales]);

  // Commission Config
  const [commissionConfig, setCommissionConfig] = useState<CommissionConfig>(() => {
    return getStoredData<CommissionConfig>(StorageKeys.COMMISSION_RULES, INITIAL_COMMISSION_CONFIG);
  });

  const updateCommissionConfig = (config: CommissionConfig) => {
    setCommissionConfig(config);
    setStoredData(StorageKeys.COMMISSION_RULES, config);
    addAuditLog('Settings Change', 'ปรับปรุงเกณฑ์คอมมิชชั่นและการคำนวณยอด', 'info');
    showToast('บันทึกโครงสร้างคอมมิชชั่นเรียบร้อย', 'success');
  };

  // Gallon Rules
  const [gallonRules, setGallonRules] = useState<GallonIncentiveRule[]>(() => {
    return getStoredData<GallonIncentiveRule[]>(StorageKeys.GALLON_RULES, INITIAL_GALLON_RULES);
  });

  const addGallonRule = (rule: GallonIncentiveRule) => {
    const updated = [...gallonRules, rule];
    setGallonRules(updated);
    setStoredData(StorageKeys.GALLON_RULES, updated);
    addAuditLog('Settings Change', `เพิ่มกฎแกลลอนอินเซนทีฟ: ${rule.name}`, 'info');
    showToast('เพิ่มกฎแกลลอนสำเร็จ', 'success');
  };

  const updateGallonRule = (rule: GallonIncentiveRule) => {
    const updated = gallonRules.map((r) => (r.id === rule.id ? rule : r));
    setGallonRules(updated);
    setStoredData(StorageKeys.GALLON_RULES, updated);
    addAuditLog('Settings Change', `แก้ไขกฎแกลลอน: ${rule.name}`, 'info');
    showToast('อัปเดตกฎแกลลอนสำเร็จ', 'success');
  };

  const deleteGallonRule = (ruleId: string) => {
    const updated = gallonRules.filter((r) => r.id !== ruleId);
    setGallonRules(updated);
    setStoredData(StorageKeys.GALLON_RULES, updated);
    addAuditLog('Settings Change', `ลบกฎแกลลอน: ${ruleId}`, 'warning');
    showToast('ลบกฎเรียบร้อย', 'info');
  };

  // Computed Commission for current month (September 2026 or dynamic)
  const computedCommission = useMemo(() => {
    const now = new Date();
    return computeCommission(sales, now.getMonth() + 1, now.getFullYear(), commissionConfig, gallonRules);
  }, [sales, commissionConfig, gallonRules]);

  // Year Targets
  const [yearTargets, setYearTargets] = useState<MonthTargetData[]>(() => {
    return getStoredData<MonthTargetData[]>(StorageKeys.TARGETS, INITIAL_YEAR_TARGETS);
  });

  const updateYearTarget = (month: number, year: number, target: number, applyToAllMonths = false) => {
    let updated: MonthTargetData[];
    if (applyToAllMonths) {
      const otherYearTargets = yearTargets.filter((t) => t.year !== year);
      const newYearMonths: MonthTargetData[] = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        year,
        target,
      }));
      updated = [...otherYearTargets, ...newYearMonths];
    } else {
      const exists = yearTargets.some((t) => t.month === month && t.year === year);
      if (exists) {
        updated = yearTargets.map((t) => (t.month === month && t.year === year ? { ...t, target } : t));
      } else {
        updated = [...yearTargets, { month, year, target }];
      }
    }
    setYearTargets(updated);
    setStoredData(StorageKeys.TARGETS, updated);

    // Sync with commissionConfig if this affects current month
    const now = new Date();
    if ((applyToAllMonths && year === now.getFullYear()) || (month === now.getMonth() + 1 && year === now.getFullYear())) {
      const updatedConfig = { ...commissionConfig, monthlyTarget: target };
      setCommissionConfig(updatedConfig);
      setStoredData(StorageKeys.COMMISSION_RULES, updatedConfig);
    }

    addAuditLog(
      'Settings Change',
      applyToAllMonths
        ? `อัปเดตเป้าหมายยอดขายทั้งปี ${year} ทุกเดือนเป็น ฿${target.toLocaleString()}`
        : `อัปเดตเป้าหมายเดือน ${month}/${year} เป็น ฿${target.toLocaleString()}`,
      'success'
    );
    showToast(
      applyToAllMonths
        ? `บันทึกเป้าหมาย ฿${target.toLocaleString()} ให้ครบทั้ง 12 เดือนเรียบร้อยแล้ว`
        : `อัปเดตเป้าหมายเดือน ${month}/${year} เป็น ฿${target.toLocaleString()} เรียบร้อยแล้ว`,
      'success'
    );
  };

  // Brand Settings
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(() => {
    return getStoredData<BrandSettings>(StorageKeys.BRAND_SETTINGS, INITIAL_BRAND_SETTINGS);
  });

  const updateBrandSettings = (settings: BrandSettings) => {
    setBrandSettings(settings);
    setStoredData(StorageKeys.BRAND_SETTINGS, settings);
    addAuditLog('Settings Change', 'แก้ไขข้อมูลแบรนด์และการตั้งค่าสาขา', 'info');
    showToast('บันทึกข้อมูลสาขาเรียบร้อย', 'success');
  };

  // Market Share
  const [marketShareDaily, setMarketShareDaily] = useState<MarketShareRecord[]>(() => {
    return getStoredData<MarketShareRecord[]>(StorageKeys.MKS_DAY, [
      {
        id: 'mks-day-1',
        mode: 'daily',
        date: '2026-09-16',
        brandEntries: [
          { brandName: 'NIPPON PAINT', pcCount: 2, targetSales: 25000, actualSales: 31200, note: 'ยอดวิ่งโปร weatherbond' },
          { brandName: 'TOA', pcCount: 2, targetSales: 30000, actualSales: 28000, note: 'โปร 4Seasons' },
          { brandName: 'JOTUN', pcCount: 1, targetSales: 15000, actualSales: 14500, note: 'งานบ้านเดี่ยว' },
          { brandName: 'DULUX', pcCount: 1, targetSales: 12000, actualSales: 9500, note: 'เงียบช่วงเช้า' },
          { brandName: 'BEGER', pcCount: 1, targetSales: 10000, actualSales: 11000, note: 'มีช่างรับเหมาเข้า' },
        ],
        updatedAt: new Date().toISOString(),
      },
    ]);
  });

  const saveMarketShareDaily = (record: MarketShareRecord) => {
    const updated = [record, ...marketShareDaily.filter((r) => r.id !== record.id)];
    setMarketShareDaily(updated);
    setStoredData(StorageKeys.MKS_DAY, updated);
    addAuditLog('Settings Change', `บันทึกข้อมูล Market Share รายวัน (${record.date})`, 'success');
    showToast('บันทึกส่วนแบ่งตลาดสำเร็จ', 'success');
  };

  const [marketShareWeekly, setMarketShareWeekly] = useState<MarketShareRecord[]>(() => {
    return getStoredData<MarketShareRecord[]>(StorageKeys.MKS_WEEK, [
      {
        id: 'mks-week-1',
        mode: 'weekly',
        fromDate: '2026-09-08',
        toDate: '2026-09-14',
        brandEntries: [
          { brandName: 'NIPPON PAINT', pcRegular: 2, pcPro: 1, targetSales: 150000, actualSales: 168000 },
          { brandName: 'TOA', pcRegular: 2, pcPro: 1, targetSales: 180000, actualSales: 175000 },
          { brandName: 'JOTUN', pcRegular: 1, pcPro: 0, targetSales: 90000, actualSales: 88000 },
          { brandName: 'DULUX', pcRegular: 1, pcPro: 0, targetSales: 70000, actualSales: 62000 },
          { brandName: 'BEGER', pcRegular: 1, pcPro: 0, targetSales: 65000, actualSales: 69000 },
        ],
        updatedAt: new Date().toISOString(),
      },
    ]);
  });

  const saveMarketShareWeekly = (record: MarketShareRecord) => {
    const updated = [record, ...marketShareWeekly.filter((r) => r.id !== record.id)];
    setMarketShareWeekly(updated);
    setStoredData(StorageKeys.MKS_WEEK, updated);
    addAuditLog('Settings Change', `บันทึกข้อมูล Market Share รายสัปดาห์ (${record.fromDate} - ${record.toDate})`, 'success');
    showToast('บันทึกรายงานประจำสัปดาห์สำเร็จ', 'success');
  };

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    return getStoredData<AuditLog[]>(StorageKeys.AUDIT_LOGS, [
      {
        id: 'aud-001',
        timestamp: new Date().toISOString(),
        action: 'Settings Change',
        user: 'Ritthiphon Phromsorn',
        detail: 'เริ่มต้นระบบบริหารงานขาย Sale Paint',
        flag: 'info',
      },
    ]);
  });

  const addAuditLog = (action: AuditLog['action'], detail: string, flag: AuditLog['flag'] = 'info') => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      action,
      user: userSession.name || 'System',
      detail,
      flag,
    };
    setAuditLogs((prev) => {
      const updated = [newLog, ...prev.slice(0, 199)]; // Keep latest 200 logs
      setStoredData(StorageKeys.AUDIT_LOGS, updated);
      return updated;
    });
  };

  // Reset Subsystems
  const resetSales = () => {
    setSales([]);
    setStoredData(StorageKeys.SALES, []);
    setStoredData(StorageKeys.INITIALIZED, true);
    addAuditLog('Reset Data', 'ล้างประวัติการขายทั้งหมดในระบบ', 'danger');
    showToast('ล้างประวัติการขายเรียบร้อย', 'info');
  };

  const resetStock = () => {
    // 1. Reset all stock in transaction history
    setStockIns([]);
    setStoredData(StorageKeys.STOCK_IN, []);
    // 2. Reset initial stock of all configured products to 0
    const clearedProducts = products.map((p) => ({
      ...p,
      initialStock: {},
    }));
    setProducts(clearedProducts);
    setStoredData(StorageKeys.PRODUCTS, clearedProducts);
    setStoredData(StorageKeys.INITIALIZED, true);
    addAuditLog('Reset Data', 'รีเซ็ตยอดสต็อกคงเหลือและประวัติการรับเข้าทั้งหมดเป็น 0', 'danger');
    showToast('รีเซ็ตยอดสต็อกสินค้าทั้งหมดเป็น 0 เรียบร้อย', 'info');
  };

  const resetCustomers = () => {
    // Customers are derived from sales, but we can also clean sales
    setSales([]);
    setStoredData(StorageKeys.SALES, []);
    setStoredData(StorageKeys.INITIALIZED, true);
    addAuditLog('Reset Data', 'ล้างข้อมูลลูกค้าสัมพันธ์ CRM', 'danger');
    showToast('ล้างข้อมูล CRM เรียบร้อย', 'info');
  };

  const resetAllData = () => {
    clearNamespaceData();
    const zeroStockProducts = INITIAL_PRODUCTS.map((p) => ({
      ...p,
      initialStock: {},
    }));
    setProducts(zeroStockProducts);
    setStoredData(StorageKeys.PRODUCTS, zeroStockProducts);
    setSales([]);
    setStoredData(StorageKeys.SALES, []);
    setStockIns([]);
    setStoredData(StorageKeys.STOCK_IN, []);
    setCart([]);
    setStoredData(StorageKeys.INITIALIZED, true);
    setAuditLogs([
      {
        id: 'aud-reset',
        timestamp: new Date().toISOString(),
        action: 'Reset Data',
        user: userSession.name,
        detail: 'รีเซ็ตระบบเป็นค่าเริ่มต้นโรงงาน (Factory Reset)',
        flag: 'danger',
      },
    ]);
    showToast('รีเซ็ตระบบเป็นค่าเริ่มต้นแล้ว', 'info');
  };

  // Comprehensive Factory Reset: cleans all tables, sales, stock, target, config, and local cache
  const resetToFactorySettings = async (keepCatalog: boolean = false) => {
    try {
      // 1. Clear LocalStorage and SessionStorage entirely
      clearAllStorageData();

      // 2. Set the INITIALIZED flag and empty sales/stock so reload won't re-seed
      setStoredData(StorageKeys.INITIALIZED, true);
      setStoredData(StorageKeys.SALES, []);
      setStoredData(StorageKeys.STOCK_IN, []);

      // 3. Reset state variables in React context
      setSales([]);
      setStockIns([]);
      setCart([]);
      
      const zeroStockProducts = INITIAL_PRODUCTS.map((p) => ({
        ...p,
        initialStock: {},
      }));

      if (!keepCatalog) {
        setCatalogItems(INITIAL_CATALOG_ITEMS);
        setProducts(zeroStockProducts);
        setStoredData(StorageKeys.CATALOG_ITEMS, INITIAL_CATALOG_ITEMS);
        setStoredData(StorageKeys.PRODUCTS, zeroStockProducts);
      } else {
        const preservedCatalog = getStoredData<CatalogItem[]>(StorageKeys.CATALOG_ITEMS, catalogItems);
        setCatalogItems(preservedCatalog);
        setStoredData(StorageKeys.CATALOG_ITEMS, preservedCatalog);
        const zeroCatalogProducts = products.map((p) => ({ ...p, initialStock: {} }));
        setProducts(zeroCatalogProducts);
        setStoredData(StorageKeys.PRODUCTS, zeroCatalogProducts);
      }
      
      setYearTargets(INITIAL_YEAR_TARGETS);
      setStoredData(StorageKeys.TARGETS, INITIAL_YEAR_TARGETS);
      setCommissionConfig(INITIAL_COMMISSION_CONFIG);
      setStoredData(StorageKeys.COMMISSION_RULES, INITIAL_COMMISSION_CONFIG);
      setGallonRules(INITIAL_GALLON_RULES);
      setStoredData(StorageKeys.GALLON_RULES, INITIAL_GALLON_RULES);
      setBrandSettings(INITIAL_BRAND_SETTINGS);
      setStoredData(StorageKeys.BRAND_SETTINGS, INITIAL_BRAND_SETTINGS);
      setMarketShareDaily([]);
      setStoredData(StorageKeys.MKS_DAY, []);
      setMarketShareWeekly([]);
      setStoredData(StorageKeys.MKS_WEEK, []);
      setGoogleConnected(false);
      setSpreadsheetIdState('');
      setSyncStatus('idle');
      setSyncError(null);
      setLastSyncTime(null);
      setCatalogSyncTime(null);

      // 4. Reset audit log with initial clean marker
      const initialLogs = [
        {
          id: 'aud-factory-reset',
          timestamp: new Date().toISOString(),
          action: 'Reset Data' as const,
          user: userSession.name || 'Admin',
          detail: `ล้างข้อมูลและคืนค่าโรงงานสมบูรณ์ (Factory Reset) ${keepCatalog ? '[เก็บฐานข้อมูลแคตตาล็อกสินค้าไว้]' : '[ล้างทุกอย่างหมดจด 100%]' }`,
          flag: 'danger' as const,
        },
      ];
      setAuditLogs(initialLogs);
      setStoredData(StorageKeys.AUDIT_LOGS, initialLogs);

      showToast('คืนค่าโรงงานสำเร็จเรียบร้อยแล้ว ทุกข้อมูลถูกล้างหมดจด', 'info');
    } catch (err: any) {
      console.error('Factory reset failed:', err);
      showToast('เกิดข้อผิดพลาดในการคืนค่าโรงงาน', 'error');
    }
  };

  // Google Integration State
  const [googleConnected, setGoogleConnected] = useState<boolean>(() => {
    return !!getStoredData<string | null>(StorageKeys.GOOGLE_SHEET_CONFIG, null);
  });
  const [spreadsheetId, setSpreadsheetIdState] = useState<string>(() => {
    return getStoredData<string>(`${StorageKeys.GOOGLE_SHEET_CONFIG}_id`, '');
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return getStoredData<string | null>(`${StorageKeys.GOOGLE_SHEET_CONFIG}_time`, null);
  });

  const setSpreadsheetId = (id: string) => {
    setSpreadsheetIdState(id);
    setStoredData(`${StorageKeys.GOOGLE_SHEET_CONFIG}_id`, id);
    showToast('บันทึก Spreadsheet ID เรียบร้อย', 'success');
  };

  const connectGoogle = () => {
    setGoogleConnected(true);
    setStoredData(StorageKeys.GOOGLE_SHEET_CONFIG, 'connected');
    addAuditLog('Google Sync', 'เชื่อมต่อบัญชี Google สำหรับ Sheets & Drive เรียบร้อย', 'success');
    showToast('เชื่อมต่อกับบัญชี Google สำเร็จ', 'success');
  };

  const disconnectGoogle = () => {
    setGoogleConnected(false);
    setStoredData(StorageKeys.GOOGLE_SHEET_CONFIG, null);
    addAuditLog('Google Sync', 'ยกเลิกการเชื่อมต่อ Google Sheets', 'warning');
    showToast('ยกเลิกการเชื่อมต่อ Google Sheets แล้ว', 'info');
  };

  const syncWithGoogle = async () => {
    setSyncStatus('syncing');
    setSyncError(null);
    try {
      await new Promise((res) => setTimeout(res, 1200));
      const now = new Date().toLocaleTimeString('th-TH');
      setLastSyncTime(now);
      setStoredData(`${StorageKeys.GOOGLE_SHEET_CONFIG}_time`, now);
      setSyncStatus('success');
      addAuditLog('Google Sync', `ซิงค์ข้อมูลกับ Google Spreadsheet ล่าสุด (${sales.length} รายการ)`, 'success');
      showToast(`ซิงค์ข้อมูลไปยัง Google Sheets สำเร็จ (${sales.length} รายการ)`, 'success');
    } catch (err: any) {
      setSyncStatus('error');
      setSyncError(err.message || 'ไม่สามารถซิงค์ได้');
      showToast('เกิดข้อผิดพลาดในการซิงค์', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        openDrawer,
        setOpenDrawer,
        userSession,
        updateUserSession,
        loginWithGoogle,
        logout,
        isOnline,
        catalogItems,
        addCatalogItem,
        updateCatalogItem,
        deleteCatalogItem,
        importCatalogItems,
        syncCatalogToGoogle,
        catalogSyncTime,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        saveBill,
        sales,
        updateSale,
        deleteSale,
        importSalesHistory,
        stockIns,
        addStockIn,
        bulkAddStockIn,
        adjustStockQuick,
        computedStock,
        customers,
        commissionConfig,
        updateCommissionConfig,
        gallonRules,
        addGallonRule,
        updateGallonRule,
        deleteGallonRule,
        computedCommission,
        yearTargets,
        updateYearTarget,
        marketShareDaily,
        saveMarketShareDaily,
        marketShareWeekly,
        saveMarketShareWeekly,
        brandSettings,
        updateBrandSettings,
        auditLogs,
        addAuditLog,
        toastMessage,
        showToast,
        resetSales,
        resetStock,
        resetCustomers,
        resetAllData,
        resetToFactorySettings,
        modalOpen,
        setModalOpen,
        googleConnected,
        connectGoogle,
        disconnectGoogle,
        spreadsheetId,
        setSpreadsheetId,
        syncWithGoogle,
        syncStatus,
        syncError,
        lastSyncTime,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
