import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
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
import { db } from '../lib/firebase';
import { SupabaseAuthFoundation } from '../lib/supabase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  collection,
  getDocs,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import {
  computeStockInventory,
  computeCustomerCRM,
  computeCommission,
} from '../services/calculationService';
import { DualWriteClient } from '../services/dualWriteClient';
import { DataService, RealtimeService } from '../services/api';

interface AppContextType {
  // Phase 4 Backend Cutover & Realtime
  dataBackend: 'supabase' | 'firebase';
  setDataBackend: (backend: 'supabase' | 'firebase') => void;

  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openDrawer: boolean;
  setOpenDrawer: (open: boolean) => void;

  // Active User / Session
  userSession: UserSession;
  updateUserSession: (updated: Partial<UserSession>) => void;
  isAuthReady: boolean;
  isAuthenticated: boolean;
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
  // catalogMode: 'keep' = คงฐานข้อมูลเดิมไว้, 'sample' = ใส่สินค้าตัวอย่างกลับ (ค่าเดิม), 'empty' = เริ่มต้นแบบไม่มีสินค้าเลย
  resetToFactorySettings: (catalogMode?: 'keep' | 'sample' | 'empty') => Promise<void>;

  // Quick action modals
  modalOpen: string | null;
  setModalOpen: (name: string | null) => void;

  // Active Sales Month (Multi-month Support)
  activeMonth: string;
  setActiveMonth: (monthStr: string) => void;
  availableMonths: string[];
  allTimeSalesTotal: number;
  allTimeSalesCount: number;
}

const AppContext = createContext<AppContextType | null>(null);

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

  // Phase 4 Backend Selection (Default: 'supabase' Primary with Firebase fallback)
  const [dataBackend, setDataBackendState] = useState<'supabase' | 'firebase'>(() => {
    return DataService.backend;
  });

  const setDataBackend = (target: 'supabase' | 'firebase') => {
    DataService.setBackend(target);
    setDataBackendState(target);
    showToast(`สลับช่องทางข้อมูลหลักเป็น: ${target === 'supabase' ? 'Supabase (API Gateway)' : 'Firebase Firestore'}`, 'info');
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

  // Supabase Auth session state (gates access to the app — see isAuthReady/isAuthenticated below)
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Listen to Supabase Auth state (primary auth backend)
  useEffect(() => {
    let unsubscribed = false;

    SupabaseAuthFoundation.getSession().then((session) => {
      if (unsubscribed) return;
      if (session?.user) {
        const user = session.user;
        const restoredSession: UserSession = {
          uid: user.id,
          name: user.email?.split('@')[0] || 'พนักงานขาย',
          email: user.email || '',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isOnline: true,
        };
        setUserSession(restoredSession);
        setStoredData(StorageKeys.USER_SESSION, restoredSession);
        setIsAuthenticated(true);
      }
      setIsAuthReady(true);
    });

    const { unsubscribe } = SupabaseAuthFoundation.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        const nextSession: UserSession = {
          uid: user.id,
          name: user.email?.split('@')[0] || 'พนักงานขาย',
          email: user.email || '',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          isOnline: true,
        };
        setUserSession(nextSession);
        setStoredData(StorageKeys.USER_SESSION, nextSession);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => {
      unsubscribed = true;
      unsubscribe();
    };
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

  const logout = async () => {
    try {
      await SupabaseAuthFoundation.signOut();
    } catch (e) {
      // ignore
    }
    setIsAuthenticated(false);
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

  // แปลงรายการ "แคตตาล็อกสินค้า" (CatalogItem = ตัวแปรแต่ละ SKU) ให้กลายเป็น
  // "การตั้งค่าสินค้า" (ProductConfig = ใช้คำนวณสต็อก) โดยรวมตามชื่อสินค้า+แบรนด์
  // เพื่อให้หน้าฐานข้อมูลสินค้า (Catalog) กับหน้าสต็อก (Stock) เห็นข้อมูลชุดเดียวกันเสมอ
  // ไม่ทับยอดสต็อกเดิม (initialStock) ของสินค้าที่มีอยู่แล้ว
  const deriveProductsFromCatalog = (
    items: CatalogItem[],
    existingProducts: ProductConfig[]
  ): ProductConfig[] => {
    const existingByKey = new Map<string, ProductConfig>();
    existingProducts.forEach((p) => {
      existingByKey.set(`${(p.brand || '').trim().toLowerCase()}_${p.name.trim().toLowerCase()}`, p);
    });

    const groups = new Map<string, CatalogItem[]>();
    items.forEach((item) => {
      const key = `${(item.brand || '').trim().toLowerCase()}_${item.name.trim().toLowerCase()}`;
      const arr = groups.get(key) || [];
      arr.push(item);
      groups.set(key, arr);
    });

    const derived: ProductConfig[] = [];
    groups.forEach((rows, key) => {
      const existing = existingByKey.get(key);
      const sizes = Array.from(new Set(rows.map((r) => r.size).filter(Boolean))) as any[];
      const bases = Array.from(new Set(rows.map((r) => r.base).filter((b) => b && b !== '-'))) as any[];
      const filmColors = Array.from(new Set(rows.map((r) => r.filmColor).filter(Boolean))) as string[];
      const hasColorCode = rows.some((r) => r.colorCode && r.colorCode !== '-');

      const basePrices: Record<string, number> = { ...(existing?.basePrices || {}) };
      sizes.forEach((size) => {
        const match = rows.find((r) => r.size === size);
        if (match) basePrices[size] = match.price;
      });

      derived.push({
        id: existing?.id || `prod-${key.replace(/[^a-z0-9]/gi, '-')}`,
        sku: existing?.sku || rows[0].sku,
        name: rows[0].name,
        brand: rows[0].brand || existing?.brand || '',
        category: rows[0].category || existing?.category || '',
        availableSizes: sizes.length ? sizes : existing?.availableSizes || [],
        hasBases: bases.length > 0,
        availableBases: bases.length ? bases : existing?.availableBases,
        hasFilmColor: filmColors.length > 0,
        filmColors: filmColors.length ? filmColors : existing?.filmColors,
        hasColorCode,
        basePrices: basePrices as Record<any, number>,
        // สำคัญ: คงยอดสต็อกตั้งต้นเดิมไว้เสมอ ไม่ให้ import แคตตาล็อกไปล้างสต็อกที่มีอยู่
        initialStock: existing?.initialStock || {},
        isQuickPick: existing?.isQuickPick,
      });
    });

    // เก็บสินค้าที่ไม่มีในแคตตาล็อก (เช่น เพิ่มด้วยมือในหน้าสต็อกโดยตรง) ไว้ตามเดิม ไม่ลบทิ้ง
    const derivedKeys = new Set(groups.keys());
    existingProducts.forEach((p) => {
      const key = `${(p.brand || '').trim().toLowerCase()}_${p.name.trim().toLowerCase()}`;
      if (!derivedKeys.has(key)) derived.push(p);
    });

    return derived;
  };

  // Product Catalog (ฐานข้อมูลสินค้า PC แต่ละคน)
  // หมายเหตุ: ค่าเริ่มต้นเป็น "แอปเปล่า" ([]) ไม่ใช่สินค้าตัวอย่างอีกต่อไป
  // สินค้าตัวอย่าง (INITIAL_CATALOG_ITEMS) จะถูกใช้เฉพาะตอนเลือกโหมด "ใส่สินค้าตัวอย่าง" ตอนคืนค่าโรงงานเท่านั้น
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(() => {
    return getStoredData<CatalogItem[]>(StorageKeys.CATALOG_ITEMS, []);
  });

  // ทุกครั้งที่แคตตาล็อกเปลี่ยน ให้ derive สินค้าใน "products" (ใช้คำนวณสต็อก) ให้ตรงกันเสมอ
  // แล้วส่งขึ้น Firestore ทั้งคู่ เพื่อให้เครื่องอื่นเห็นข้อมูลตรงกันแบบเรียลไทม์
  const syncCatalogAndProducts = (updatedCatalog: CatalogItem[], catalogDelta: CatalogItem[]) => {
    const updatedProducts = deriveProductsFromCatalog(updatedCatalog, products);
    setProducts(updatedProducts);
    setStoredData(StorageKeys.PRODUCTS, updatedProducts);

    if (catalogDelta.length) {
      persistItemsToFirestore(catalogCollectionRef, catalogDelta)
        .then(() => {
          DualWriteClient.syncUpsertCatalogItems(catalogDelta).catch((dwErr) => {
            console.warn('[DualWrite] Supabase sync warning for catalog delta:', dwErr);
          });
        })
        .catch((err) => {
          console.error('[Firestore] Failed to sync catalog item(s):', err);
          showToast('บันทึกในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ', 'error');
        });
    }
    persistItemsToFirestore(productsCollectionRef, updatedProducts)
      .then(() => {
        DualWriteClient.syncUpsertProducts(updatedProducts).catch((dwErr) => {
          console.warn('[DualWrite] Supabase sync warning for derived products:', dwErr);
        });
      })
      .catch((err) => {
        console.error('[Firestore] Failed to sync products:', err);
      });
  };

  const addCatalogItem = (item: CatalogItem) => {
    const updated = [item, ...catalogItems];
    setCatalogItems(updated);
    setStoredData(StorageKeys.CATALOG_ITEMS, updated);
    syncCatalogAndProducts(updated, [item]);
    addAuditLog('Product Edit', `เพิ่มสินค้าในแคตตาล็อก: ${item.name} (${item.sku})`, 'success');
    showToast(`เพิ่มสินค้า ${item.name} ในแคตตาล็อกสำเร็จ`, 'success');
  };

  const updateCatalogItem = (item: CatalogItem) => {
    const updated = catalogItems.map((c) => (c.id === item.id ? item : c));
    setCatalogItems(updated);
    setStoredData(StorageKeys.CATALOG_ITEMS, updated);
    syncCatalogAndProducts(updated, [item]);
    addAuditLog('Product Edit', `แก้ไขสินค้าในแคตตาล็อก: ${item.name}`, 'info');
    showToast(`แก้ไขข้อมูล ${item.name} สำเร็จ`, 'success');
  };

  const deleteCatalogItem = (id: string) => {
    const target = catalogItems.find((c) => c.id === id);
    const updated = catalogItems.filter((c) => c.id !== id);
    setCatalogItems(updated);
    setStoredData(StorageKeys.CATALOG_ITEMS, updated);
    syncCatalogAndProducts(updated, []);
    deleteItemsFromFirestore(catalogCollectionRef, [id])
      .then(() => {
        DualWriteClient.syncDeleteCatalogItems([id]).catch((dwErr) => {
          console.warn('[DualWrite] Supabase sync warning for deleteCatalogItem:', dwErr);
        });
      })
      .catch((err) => {
        console.error('[Firestore] Failed to delete catalog item:', err);
      });
    addAuditLog('Product Edit', `ลบสินค้าจากแคตตาล็อก: ${target?.name || id}`, 'warning');
    showToast('ลบรายการสินค้าเรียบร้อย', 'info');
  };

  const importCatalogItems = (
    newItems: CatalogItem[],
    mode: 'replace' | 'append'
  ): { added: number; replaced: number; skipped: number } => {
    if (mode === 'replace') {
      const previousIds = catalogItems.map((c) => c.id);
      setCatalogItems(newItems);
      setStoredData(StorageKeys.CATALOG_ITEMS, newItems);
      // เคลียร์ของเก่าบน Firestore ก่อน แล้วค่อยเขียนชุดใหม่ทับ (ผ่าน syncCatalogAndProducts)
      deleteItemsFromFirestore(catalogCollectionRef, previousIds).catch((err) => {
        console.error('[Firestore] Failed to clear old catalog items:', err);
      });
      syncCatalogAndProducts(newItems, newItems);
      addAuditLog('Product Edit', `นำเข้าไฟล์ Excel แทนที่แคตตาล็อกเดิมทั้งหมด ${newItems.length} รายการ`, 'info');
      showToast(`แทนที่ข้อมูลแคตตาล็อกสำเร็จ ${newItems.length} รายการ (ซิงก์ไปหน้าสต็อกอัตโนมัติ)`, 'success');

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
      syncCatalogAndProducts(merged, toAdd);
      addAuditLog('Product Edit', `เพิ่มสินค้าใหม่จากไฟล์ Excel ${toAdd.length} รายการ (พบรายการเดิมที่มีอยู่แล้ว ${skipped} รายการ)`, 'success');
      showToast(`เพิ่มสินค้าใหม่ ${toAdd.length} รายการ (ข้ามรายการเดิม ${skipped} รายการ, ซิงก์ไปหน้าสต็อกอัตโนมัติ)`, 'success');

      return { added: toAdd.length, replaced: 0, skipped };
    }
  };

  // Products (ค่าเริ่มต้นเป็น "แอปเปล่า" ([]) เช่นเดียวกับแคตตาล็อก — ดูหมายเหตุด้านบน)
  const [products, setProducts] = useState<ProductConfig[]>(() => {
    return getStoredData<ProductConfig[]>(StorageKeys.PRODUCTS, []);
  });

  const addProduct = (prod: ProductConfig) => {
    const updated = [prod, ...products];
    setProducts(updated);
    setStoredData(StorageKeys.PRODUCTS, updated);

    if (dataBackend === 'supabase') {
      DataService.upsertProducts([prod]).catch((err) => {
        console.warn('[Supabase] Failed to sync product:', err);
        showToast(`บันทึกในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ: ${err.message || ''}`, 'error');
      });
      persistItemsToFirestore(productsCollectionRef, [prod]).catch(console.warn);
    } else {
      persistItemsToFirestore(productsCollectionRef, [prod])
        .then(() => {
          DualWriteClient.syncUpsertProducts([prod]).catch((dwErr) => {
            console.warn('[DualWrite] Supabase sync warning for addProduct:', dwErr);
          });
        })
        .catch((err) => {
          console.error('[Firestore] Failed to sync product:', err);
          showToast('บันทึกในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ', 'error');
        });
    }
    addAuditLog('Product Edit', `เพิ่มสินค้าใหม่: ${prod.name} (${prod.sku})`, 'info');
    showToast(`เพิ่มสินค้า ${prod.name} เรียบร้อย`, 'success');
  };

  const updateProduct = (prod: ProductConfig) => {
    const updated = products.map((p) => (p.id === prod.id ? prod : p));
    setProducts(updated);
    setStoredData(StorageKeys.PRODUCTS, updated);

    if (dataBackend === 'supabase') {
      DataService.upsertProducts([prod]).catch((err) => {
        console.warn('[Supabase] Failed to sync product:', err);
        showToast(`บันทึกในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ: ${err.message || ''}`, 'error');
      });
      persistItemsToFirestore(productsCollectionRef, [prod]).catch(console.warn);
    } else {
      persistItemsToFirestore(productsCollectionRef, [prod])
        .then(() => {
          DualWriteClient.syncUpsertProducts([prod]).catch((dwErr) => {
            console.warn('[DualWrite] Supabase sync warning for updateProduct:', dwErr);
          });
        })
        .catch((err) => {
          console.error('[Firestore] Failed to sync product:', err);
          showToast('บันทึกในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ', 'error');
        });
    }
    addAuditLog('Product Edit', `แก้ไขข้อมูลสินค้า: ${prod.name}`, 'info');
    showToast(`อัปเดตข้อมูล ${prod.name} สำเร็จ`, 'success');
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);
    setStoredData(StorageKeys.PRODUCTS, updated);

    if (dataBackend === 'supabase') {
      DataService.deleteProduct(id).catch((err) => {
        console.warn('[Supabase] Failed to delete product:', err);
        showToast(`ลบในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ: ${err.message || ''}`, 'error');
      });
      deleteItemsFromFirestore(productsCollectionRef, [id]).catch(console.warn);
    } else {
      deleteItemsFromFirestore(productsCollectionRef, [id])
        .then(() => {
          DualWriteClient.syncDeleteProducts([id]).catch((dwErr) => {
            console.warn('[DualWrite] Supabase sync warning for deleteProduct:', dwErr);
          });
        })
        .catch((err) => {
          console.error('[Firestore] Failed to delete product:', err);
        });
    }
    addAuditLog('Product Edit', `ลบสินค้า: ${target?.name || id}`, 'warning');
    showToast('ลบรายการสินค้าเรียบร้อย', 'info');
  };

  // Firestore is the shared source of truth for sales. LocalStorage is only a cache.
  const salesCollectionRef = collection(db, 'sales');
  // เพิ่มคอลเลกชันกลางสำหรับ catalog / products / stock-in เช่นเดียวกับ sales
  // เพื่อให้ทุกเครื่องเห็นฐานข้อมูลสินค้าและสต็อกตรงกันแบบเรียลไทม์ (แก้ปัญหาซิงค์หลายเครื่อง)
  const catalogCollectionRef = collection(db, 'catalog_items');
  const productsCollectionRef = collection(db, 'products');
  const stockInCollectionRef = collection(db, 'stock_ins');

  const persistItemsToFirestore = async (colRef: ReturnType<typeof collection>, items: { id: string }[]) => {
    for (let i = 0; i < items.length; i += 450) {
      const batch = writeBatch(db);
      items.slice(i, i + 450).forEach((item) => {
        batch.set(doc(db, colRef.path, item.id), item);
      });
      await batch.commit();
    }
  };

  const deleteItemsFromFirestore = async (colRef: ReturnType<typeof collection>, ids: string[]) => {
    for (let i = 0; i < ids.length; i += 450) {
      const batch = writeBatch(db);
      ids.slice(i, i + 450).forEach((id) => batch.delete(doc(db, colRef.path, id)));
      await batch.commit();
    }
  };

  const clearFirestoreCollection = async (colRef: ReturnType<typeof collection>) => {
    const snap = await getDocs(colRef);
    if (snap.empty) return;
    const ids = snap.docs.map((d) => d.id);
    await deleteItemsFromFirestore(colRef, ids);
  };

  // ตั้งค่า realtime sync ให้คอลเลกชันหนึ่ง ๆ: ย้ายข้อมูลในเครื่องขึ้น Firestore ครั้งแรก
  // (เฉพาะตอนที่ยังไม่มีข้อมูลบนคลาวด์เลย) จากนั้นฟังการเปลี่ยนแปลงแบบเรียลไทม์ตลอดไป
  const setupRealtimeCollection = <T extends { id: string }>(
    colRef: ReturnType<typeof collection>,
    migrationDocName: string,
    localData: T[],
    onCloudUpdate: (items: T[]) => void,
    sortFn?: (a: T, b: T) => number
  ) => {
    let active = true;
    let unsubscribe: (() => void) | null = null;

    const start = async () => {
      try {
        const migrationRef = doc(db, 'system_config', migrationDocName);
        const cloudBefore = await getDocs(colRef);

        if (cloudBefore.empty && localData.length > 0) {
          const claimed = await runTransaction(db, async (tx) => {
            const snap = await tx.get(migrationRef);
            if (snap.exists()) return false;
            tx.set(migrationRef, { initialized: true, migratedAt: new Date().toISOString(), count: localData.length });
            return true;
          });
          if (claimed) await persistItemsToFirestore(colRef, localData);
        } else if (!cloudBefore.empty) {
          await setDoc(migrationRef, { initialized: true, migratedAt: new Date().toISOString() }, { merge: true });
        }

        if (!active) return;
        unsubscribe = onSnapshot(
          colRef,
          (snapshot) => {
            if (!active) return;
            let cloudItems = snapshot.docs.map((d) => d.data() as T).filter((i) => (i as any)?.id);
            if (sortFn) cloudItems = cloudItems.sort(sortFn);
            onCloudUpdate(cloudItems);
          },
          (err) => console.warn(`[Firestore] Realtime listener error (${migrationDocName}):`, err)
        );
      } catch (err) {
        console.warn(`[Firestore] Realtime setup skipped (${migrationDocName}):`, err);
      }
    };

    start();
    return () => {
      active = false;
      unsubscribe?.();
    };
  };

  const persistSalesToFirestore = async (items: SaleItem[]) => {
    // Firestore batches are limited to 500 writes. Chunk safely for imports.
    for (let i = 0; i < items.length; i += 450) {
      const batch = writeBatch(db);
      items.slice(i, i + 450).forEach((item) => {
        batch.set(doc(db, 'sales', item.id), item);
      });
      await batch.commit();
    }
  };

  const deleteSalesFromFirestore = async (ids: string[]) => {
    for (let i = 0; i < ids.length; i += 450) {
      const batch = writeBatch(db);
      ids.slice(i, i + 450).forEach((id) => batch.delete(doc(db, 'sales', id)));
      await batch.commit();
    }
  };

  // Sales Records
  // หมายเหตุ: ไม่ใช้ INITIAL_SALES_SEED (ข้อมูลตัวอย่าง) เป็นค่าเริ่มต้นอีกต่อไป
  // แอปใหม่จะเริ่มต้นด้วยรายการขายว่างเปล่าเสมอ ข้อมูลจริงจะมาจาก Firestore realtime sync ด้านล่าง
  const [sales, setSales] = useState<SaleItem[]>(() => {
    return getStoredData<SaleItem[]>(StorageKeys.SALES, []);
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

    if (dataBackend === 'supabase') {
      DataService.addStockIn(newRecord).catch((err) => {
        console.warn('[Supabase] Failed to sync stock-in:', err);
        showToast(`บันทึกในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ: ${err.message || ''}`, 'error');
      });
      persistItemsToFirestore(stockInCollectionRef, [newRecord]).catch(console.warn);
    } else {
      persistItemsToFirestore(stockInCollectionRef, [newRecord])
        .then(() => {
          DualWriteClient.syncUpsertStockIns([newRecord]).catch((dwErr) => {
            console.warn('[DualWrite] Supabase sync warning for addStockIn:', dwErr);
          });
        })
        .catch((err) => {
          console.error('[Firestore] Failed to sync stock-in:', err);
          showToast('บันทึกในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ', 'error');
        });
    }
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

    if (dataBackend === 'supabase') {
      DataService.bulkAddStockIn(newRecords).catch((err) => {
        console.warn('[Supabase] Failed to sync stock-in batch:', err);
        showToast(`บันทึกในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ: ${err.message || ''}`, 'error');
      });
      persistItemsToFirestore(stockInCollectionRef, newRecords).catch(console.warn);
    } else {
      persistItemsToFirestore(stockInCollectionRef, newRecords)
        .then(() => {
          DualWriteClient.syncUpsertStockIns(newRecords).catch((dwErr) => {
            console.warn('[DualWrite] Supabase sync warning for bulkAddStockIn:', dwErr);
          });
        })
        .catch((err) => {
          console.error('[Firestore] Failed to sync bulk stock-in:', err);
          showToast('บันทึกในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ', 'error');
        });
    }
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

    // Phase 4: Primary Checkout via API Gateway (with Atomic Stock safety)
    if (dataBackend === 'supabase') {
      DataService.checkout({
        bill: {
          id: billId,
          billNo: billId,
          date: today,
          customerName: customerName || undefined,
          customerPhone: customerPhone || undefined,
          salesperson: userSession.name || 'พนักงานขาย',
          salespersonEmail: userSession.email || undefined,
          branch: 'สาขาหลัก',
          createdAt: nowIso,
        },
        items: newSaleItems,
        allowOversell: true,
      })
        .then(() => {
          // Keep Firestore fallback synchronized
          persistSalesToFirestore(newSaleItems).catch(console.warn);
        })
        .catch((apiErr) => {
          console.warn('[DataService] Checkout warning, falling back to direct persistence:', apiErr);
          persistSalesToFirestore(newSaleItems).catch((err) => {
            console.error('[Firestore] Failed to save sale:', err);
            showToast('บันทึกในเครื่องแล้ว แต่ส่งข้อมูลไปฐานข้อมูลกลางไม่สำเร็จ', 'error');
          });
        });
    } else {
      // Legacy Firestore primary path with dual-write to Supabase
      persistSalesToFirestore(newSaleItems)
        .then(() => {
          DualWriteClient.syncBillAndSales(
            {
              id: billId,
              billNo: billId,
              date: today,
              customerName: customerName || undefined,
              customerPhone: customerPhone || undefined,
              salesperson: userSession.name || 'พนักงานขาย',
              salespersonEmail: userSession.email || undefined,
              branch: 'สาขาหลัก',
              createdAt: nowIso,
            },
            newSaleItems
          ).catch((dwErr) => {
            console.warn('[DualWrite] Supabase sync error on saveBill:', dwErr);
          });
        })
        .catch((err) => {
          console.error('[Firestore] Failed to save sale:', err);
          showToast('บันทึกในเครื่องแล้ว แต่ส่งข้อมูลไปฐานข้อมูลกลางไม่สำเร็จ', 'error');
        });
    }

    const billTotal = newSaleItems.reduce((acc, i) => acc + i.total, 0);
    addAuditLog('Add Sale', `เปิดบิล ${billId} (${customerName || 'ลูกค้าทั่วไป'}) ยอดรวม ฿${billTotal.toLocaleString()}`, 'success');

    showToast(`บันทึกการขายบิล ${billId} สำเร็จ ยอด ฿${billTotal.toLocaleString()}`, 'success');

    return billId;
  };

  const updateSale = (updated: SaleItem) => {
    const newSales = sales.map((s) => (s.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : s));
    setSales(newSales);
    setStoredData(StorageKeys.SALES, newSales);
    const firestoreSale = { ...updated, updatedAt: new Date().toISOString() };

    if (dataBackend === 'supabase') {
      DataService.updateSale(updated.id, firestoreSale).catch((err) => {
        console.warn('[Supabase] Failed to update sale:', err);
        showToast(`แก้ไขในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ: ${err.message || ''}`, 'error');
      });
      setDoc(doc(db, 'sales', updated.id), firestoreSale, { merge: true }).catch(console.warn);
    } else {
      setDoc(doc(db, 'sales', updated.id), firestoreSale, { merge: true })
        .then(() => {
          DualWriteClient.syncUpdateSale(firestoreSale).catch((dwErr) => {
            console.warn('[DualWrite] Supabase sync warning for updateSale:', dwErr);
          });
        })
        .catch((err) => {
          console.error('[Firestore] Failed to update sale:', err);
          showToast('แก้ไขในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ', 'error');
        });
    }
    addAuditLog('Edit Sale', `แก้ไขรายการขาย #${updated.id} (${updated.productName})`, 'info');
    showToast('แก้ไขข้อมูลการขายสำเร็จ', 'success');
  };

  const deleteSale = (saleId: string) => {
    const target = sales.find((s) => s.id === saleId);
    const newSales = sales.filter((s) => s.id !== saleId);
    setSales(newSales);
    setStoredData(StorageKeys.SALES, newSales);

    if (dataBackend === 'supabase') {
      DataService.deleteSale(saleId).catch((err) => {
        console.warn('[Supabase] Failed to delete sale:', err);
        showToast(`ลบในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ: ${err.message || ''}`, 'error');
      });
      deleteSalesFromFirestore([saleId]).catch(console.warn);
    } else {
      deleteSalesFromFirestore([saleId])
        .then(() => {
          DualWriteClient.syncDeleteSale(saleId).catch((dwErr) => {
            console.warn('[DualWrite] Supabase sync warning for deleteSale:', dwErr);
          });
        })
        .catch((err) => {
          console.error('[Firestore] Failed to delete sale:', err);
          showToast('ลบในเครื่องแล้ว แต่ลบจากฐานข้อมูลกลางไม่สำเร็จ', 'error');
        });
    }
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
      const previousIds = sales.map((s) => s.id);
      setSales(sorted);
      setStoredData(StorageKeys.SALES, sorted);
      Promise.all([deleteSalesFromFirestore(previousIds), persistSalesToFirestore(sorted)]).catch((err) => {
        console.error('[Firestore] Failed to replace sales:', err);
        showToast('นำเข้าในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ', 'error');
      });
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
      persistSalesToFirestore(toAdd).catch((err) => {
        console.error('[Firestore] Failed to append imported sales:', err);
        showToast('นำเข้าในเครื่องแล้ว แต่ซิงก์ฐานข้อมูลกลางไม่สำเร็จ', 'error');
      });

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

  // Realtime shared sales: every device receives sales changes immediately.
  useEffect(() => {
    if (dataBackend === 'supabase') {
      DataService.getSales()
        .then((s) => {
          if (s && s.length > 0) {
            setSales(s);
            setStoredData(StorageKeys.SALES, s);
          }
        })
        .catch(console.warn);

      const unsub = RealtimeService.subscribe('sales', async () => {
        try {
          const s = await DataService.getSales();
          // Guard: an empty/stale result from a lagging read should never wipe out
          // sales we already have locally (avoids using a stale closure value).
          setSales((prev) => {
            if (!s || (s.length === 0 && prev.length > 0)) return prev;
            setStoredData(StorageKeys.SALES, s);
            return s;
          });
        } catch (e) {
          console.warn('[Realtime] Sales refresh error:', e);
        }
      });
      return unsub;
    }

    let active = true;
    let unsubscribe: (() => void) | null = null;

    const startRealtimeSales = async () => {
      try {
        const migrationRef = doc(db, 'system_config', 'sales_migration');
        const localSales = getStoredData<SaleItem[]>(StorageKeys.SALES, []);
        const cloudBeforeMigration = await getDocs(salesCollectionRef);

        // One-time migration: preserve the first device's existing local sales
        // when the shared Firestore collection is still empty.
        if (cloudBeforeMigration.empty && localSales.length > 0) {
          const claimed = await runTransaction(db, async (tx) => {
            const snap = await tx.get(migrationRef);
            if (snap.exists()) return false;
            tx.set(migrationRef, {
              initialized: true,
              migratedAt: new Date().toISOString(),
              count: localSales.length,
            });
            return true;
          });
          if (claimed) await persistSalesToFirestore(localSales);
        } else if (!cloudBeforeMigration.empty) {
          // Mark migration complete if the cloud database already contains sales.
          await setDoc(migrationRef, { initialized: true, migratedAt: new Date().toISOString() }, { merge: true });
        }

        if (!active) return;
        unsubscribe = onSnapshot(
          salesCollectionRef,
          (snapshot) => {
            if (!active) return;
            const cloudSales = snapshot.docs
              .map((item) => item.data() as SaleItem)
              .filter((item) => item?.id)
              .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

            // Firestore is now authoritative, including an empty collection
            // after the last sale is deleted on another device.
            setSales(cloudSales);
            setStoredData(StorageKeys.SALES, cloudSales);
          },
          (err) => console.warn('[Firestore] Sales realtime listener error:', err)
        );
      } catch (err) {
        console.warn('[Firestore] Sales realtime setup skipped:', err);
      }
    };

    startRealtimeSales();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [dataBackend]);

  // Realtime shared catalog: ทุกเครื่องเห็นฐานข้อมูลสินค้าตรงกันทันที
  useEffect(() => {
    if (dataBackend === 'supabase') {
      DataService.getCatalog()
        .then((items) => {
          if (items && items.length > 0) {
            setCatalogItems(items);
            setStoredData(StorageKeys.CATALOG_ITEMS, items);
          }
        })
        .catch(console.warn);

      const unsub = RealtimeService.subscribe('catalog_items', async () => {
        try {
          const items = await DataService.getCatalog();
          setCatalogItems((prev) => {
            if (!items || (items.length === 0 && prev.length > 0)) return prev;
            setStoredData(StorageKeys.CATALOG_ITEMS, items);
            return items;
          });
        } catch (e) {
          console.warn('[Realtime] Catalog refresh error:', e);
        }
      });
      return unsub;
    }

    return setupRealtimeCollection<CatalogItem>(
      catalogCollectionRef,
      'catalog_migration',
      getStoredData<CatalogItem[]>(StorageKeys.CATALOG_ITEMS, []),
      (cloudItems) => {
        setCatalogItems(cloudItems);
        setStoredData(StorageKeys.CATALOG_ITEMS, cloudItems);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataBackend]);

  // Realtime shared products (ใช้คำนวณสต็อก): ทุกเครื่องเห็นตรงกันทันที
  useEffect(() => {
    if (dataBackend === 'supabase') {
      DataService.getProducts()
        .then((items) => {
          if (items && items.length > 0) {
            setProducts(items);
            setStoredData(StorageKeys.PRODUCTS, items);
          }
        })
        .catch(console.warn);

      const unsub = RealtimeService.subscribe('products', async () => {
        try {
          const items = await DataService.getProducts();
          setProducts((prev) => {
            if (!items || (items.length === 0 && prev.length > 0)) return prev;
            setStoredData(StorageKeys.PRODUCTS, items);
            return items;
          });
        } catch (e) {
          console.warn('[Realtime] Products refresh error:', e);
        }
      });
      return unsub;
    }

    return setupRealtimeCollection<ProductConfig>(
      productsCollectionRef,
      'products_migration',
      getStoredData<ProductConfig[]>(StorageKeys.PRODUCTS, []),
      (cloudItems) => {
        setProducts(cloudItems);
        setStoredData(StorageKeys.PRODUCTS, cloudItems);
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataBackend]);

  // Realtime shared stock-in records: ทุกเครื่องเห็นประวัติรับสต็อกตรงกันทันที
  useEffect(() => {
    if (dataBackend === 'supabase') {
      DataService.getStockIns()
        .then((items) => {
          if (items && items.length > 0) {
            setStockIns(items);
            setStoredData(StorageKeys.STOCK_IN, items);
          }
        })
        .catch(console.warn);

      const unsub = RealtimeService.subscribe('stock_ins', async () => {
        try {
          const items = await DataService.getStockIns();
          setStockIns((prev) => {
            if (!items || (items.length === 0 && prev.length > 0)) return prev;
            setStoredData(StorageKeys.STOCK_IN, items);
            return items;
          });
        } catch (e) {
          console.warn('[Realtime] Stock-ins refresh error:', e);
        }
      });
      return unsub;
    }

    return setupRealtimeCollection<StockInRecord>(
      stockInCollectionRef,
      'stock_in_migration',
      getStoredData<StockInRecord[]>(StorageKeys.STOCK_IN, []),
      (cloudItems) => {
        setStockIns(cloudItems);
        setStoredData(StorageKeys.STOCK_IN, cloudItems);
      },
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataBackend]);

  // Multi-device polling: ไม่ต้องเปิด Supabase Realtime replication ก็ได้ — ตราบใดที่สอง
  // หน้าจอเปิดแอปพร้อมกัน แอปจะ "ดึงข้อมูลล่าสุดจาก Supabase มาเช็คซ้ำ" เป็นรอบๆ ให้อัตโนมัติ
  // ถ้ามีการเปลี่ยนแปลงจากเครื่องอื่น หน้าจอนี้จะได้เห็นข้อมูลล่าสุดภายในไม่กี่วินาที โดยไม่ต้องกดรีเฟรชเอง
  // ปรับความถี่ได้ที่ POLL_INTERVAL_MS ด้านล่าง (ค่าเริ่มต้น: ทุก 15 วินาที)
  const POLL_INTERVAL_MS = 15 * 1000;
  useEffect(() => {
    if (dataBackend !== 'supabase') return;

    const pollLatestData = async () => {
      try {
        const [prods, salesData, catalog, stock] = await Promise.all([
          DataService.getProducts(),
          DataService.getSales(),
          DataService.getCatalog(),
          DataService.getStockIns(),
        ]);

        // Guard เดียวกับ realtime subscriber ด้านบน: ผลลัพธ์ว่างเปล่าจาก network
        // ที่ล่าช้าหรือมีปัญหาชั่วคราว จะไม่ไปทับข้อมูลที่มีอยู่แล้วในเครื่อง
        setProducts((prev) => {
          if (!prods || (prods.length === 0 && prev.length > 0)) return prev;
          setStoredData(StorageKeys.PRODUCTS, prods);
          return prods;
        });
        setSales((prev) => {
          if (!salesData || (salesData.length === 0 && prev.length > 0)) return prev;
          setStoredData(StorageKeys.SALES, salesData);
          return salesData;
        });
        setCatalogItems((prev) => {
          if (!catalog || (catalog.length === 0 && prev.length > 0)) return prev;
          setStoredData(StorageKeys.CATALOG_ITEMS, catalog);
          return catalog;
        });
        setStockIns((prev) => {
          if (!stock || (stock.length === 0 && prev.length > 0)) return prev;
          setStoredData(StorageKeys.STOCK_IN, stock);
          return stock;
        });
      } catch (e) {
        console.warn('[Poll] Multi-device refresh failed:', e);
      }
    };

    const timer = setInterval(pollLatestData, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataBackend]);

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

  // Available sales months discovered from actual sales data + calendar current
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    sales.forEach((s) => {
      const d = s.date || s.createdAt;
      if (d && d.length >= 7) {
        monthSet.add(d.slice(0, 7));
      }
    });
    const now = new Date();
    const currentPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(currentPrefix);
    return Array.from(monthSet).sort().reverse();
  }, [sales]);

  // Default active month:
  // If current calendar month has sales, use current.
  // Otherwise, default to the latest month that HAS recorded sales (e.g. 2026-03).
  const defaultActiveMonth = useMemo(() => {
    const now = new Date();
    const currentPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const hasCurrentSales = sales.some((s) => (s.date ? s.date.startsWith(currentPrefix) : s.createdAt?.startsWith(currentPrefix)));
    if (hasCurrentSales) return currentPrefix;

    const monthsWithSales = availableMonths.filter((m) =>
      sales.some((s) => (s.date ? s.date.startsWith(m) : s.createdAt?.startsWith(m)))
    );
    return monthsWithSales[0] || currentPrefix;
  }, [availableMonths, sales]);

  const [activeMonthState, setActiveMonthState] = useState<string>(() => {
    return getStoredData<string>('ACTIVE_SALES_MONTH', '') || '';
  });

  const activeMonth = activeMonthState && availableMonths.includes(activeMonthState)
    ? activeMonthState
    : defaultActiveMonth;

  const setActiveMonth = (monthStr: string) => {
    setActiveMonthState(monthStr);
    setStoredData('ACTIVE_SALES_MONTH', monthStr);
  };

  // Computed Commission for active month (e.g. March 2026 or selected month)
  const computedCommission = useMemo(() => {
    const [yearStr, monthStr] = activeMonth.split('-');
    const now = new Date();
    const y = Number(yearStr) || now.getFullYear();
    const m = Number(monthStr) || (now.getMonth() + 1);

    const targetObj = yearTargets.find((t) => t.month === m && t.year === y);
    const target = targetObj ? targetObj.target : (commissionConfig.monthlyTarget || 500000);
    const configWithTarget = { ...commissionConfig, monthlyTarget: target };
    return computeCommission(sales, m, y, configWithTarget, gallonRules);
  }, [sales, activeMonth, commissionConfig, yearTargets, gallonRules]);

  // All-time sales aggregates across the entire database
  const allTimeSalesTotal = useMemo(() => {
    return sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  }, [sales]);

  const allTimeSalesCount = useMemo(() => {
    return new Set(sales.map((s) => s.billId || s.id)).size;
  }, [sales]);

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

  // Auto-sync live store snapshot to server so LINE Bot can answer queries when PC is at home
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // Precompute monthly summary for all recorded months
        const monthlySummary: Record<string, { total: number; billCount: number; quantity: number }> = {};
        sales.forEach((s) => {
          const m = (s.date || s.createdAt || '').slice(0, 7);
          if (m) {
            if (!monthlySummary[m]) {
              monthlySummary[m] = { total: 0, billCount: 0, quantity: 0 };
            }
            monthlySummary[m].total += Number(s.total) || 0;
            monthlySummary[m].quantity += Number(s.quantity) || 0;
          }
        });
        Object.keys(monthlySummary).forEach((m) => {
          const bills = new Set(sales.filter((s) => (s.date || s.createdAt || '').startsWith(m)).map((s) => s.billId || s.id));
          monthlySummary[m].billCount = bills.size;
        });

        // Sort sales descending by date to guarantee recent records are preserved
        const sortedSales = [...sales].sort((a, b) => {
          const dateA = a.date || a.createdAt || '';
          const dateB = b.date || b.createdAt || '';
          return dateB.localeCompare(dateA);
        });
        const latestSale = sortedSales[0] || null;

        const now = new Date();
        const bkkDate = new Date(now.getTime() + 7 * 3600000);
        const todayStr = bkkDate.toISOString().slice(0, 10);
        const todaySales = sales.filter((s) => (s.date ? s.date === todayStr : s.createdAt?.startsWith(todayStr)));
        const todayTotal = todaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const todayBillCount = new Set(todaySales.map((s) => s.billId || s.id)).size;

        const commissionDetails = {
          grandTotalCommission: computedCommission.grandTotalCommission || 0,
          mainCommission: computedCommission.mainCommission || 0,
          activeTierPercent: computedCommission.activeTierPercent || 0,
          nextTier: computedCommission.nextTier || null,
          specialCommission: computedCommission.specialCommission || 0,
          perHeadCommission: computedCommission.perHeadCommission || 0,
          gallonIncentiveTotal: computedCommission.gallonIncentiveTotal || 0,
          gallonIncentivePotentialTotal: computedCommission.gallonIncentivePotentialTotal || 0,
          isGallonTargetUnlocked: computedCommission.isGallonTargetUnlocked,
          globalTargetPercent: computedCommission.globalTargetPercent,
          gapToGallonUnlock: computedCommission.gapToGallonUnlock,
          ruleBreakdowns: (computedCommission.ruleBreakdowns || []).slice(0, 8).map((r) => ({
            ruleName: r.ruleName,
            productName: r.productName,
            rewardRate: r.rewardRate,
            matchedQuantity: r.matchedQuantity,
            earnedAmount: r.earnedAmount,
            potentialAmount: r.potentialAmount,
            isQualified: r.isQualified,
            targetGateMessage: r.targetGateMessage,
          })),
        };

        const payload = {
          pcName: userSession.name,
          brand: brandSettings.brandName,
          branch: brandSettings.branch,
          sales: sortedSales.slice(0, 1500).map((s) => ({
            id: s.id,
            billId: s.billId,
            date: s.date,
            createdAt: s.createdAt,
            total: s.total,
            productName: s.productName,
            sku: s.sku,
            size: s.size,
            quantity: s.quantity,
          })),
          allTimeTotal: allTimeSalesTotal,
          allTimeBillCount: allTimeSalesCount,
          monthlySummary,
          activeMonth,
          activeMonthTotal: computedCommission.totalSalesAmount,
          target: computedCommission.target,
          progressPercent: Number(computedCommission.achievementPercent.toFixed(1)),
          remainingToTarget: Math.max(0, computedCommission.target - computedCommission.totalSalesAmount),
          latestSale: latestSale
            ? {
                date: latestSale.date,
                productName: latestSale.productName,
                total: latestSale.total,
                billId: latestSale.billId,
                quantity: latestSale.quantity,
              }
            : null,
          todayTotal,
          todayBillCount,
          todaySales: todaySales.map((s) => ({
            productName: s.productName,
            quantity: s.quantity,
            total: s.total,
          })),
          netCommission: computedCommission.grandTotalCommission || 0,
          commissionDetails,
        };

        fetch('/api/store/snapshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {
          // offline or background sync silent fallback
        });
      } catch (err) {
        // ignore
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [sales, activeMonth, computedCommission, userSession.name, brandSettings, allTimeSalesTotal, allTimeSalesCount]);


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
    // ไม่ใส่สินค้าตัวอย่างกลับมาอีกต่อไป ให้สอดคล้องกับ resetToFactorySettings โหมด 'empty'
    setProducts([]);
    setStoredData(StorageKeys.PRODUCTS, []);
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
  const resetToFactorySettings = async (catalogMode: 'keep' | 'sample' | 'empty' = 'empty') => {
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

      // 3.1 ล้างฐานข้อมูลกลางบน Firestore ด้วย ไม่งั้น realtime listener จะดึงของเก่ากลับมาทันที
      Promise.all([
        clearFirestoreCollection(salesCollectionRef),
        clearFirestoreCollection(stockInCollectionRef),
      ])
        .then(() => {
          DualWriteClient.syncClearCollection('sales').catch(console.warn);
          DualWriteClient.syncClearCollection('bills').catch(console.warn);
          DualWriteClient.syncClearCollection('stock_ins').catch(console.warn);
        })
        .catch((err) => console.error('[Firestore] Failed to clear sales/stock-in on reset:', err));

      if (catalogMode === 'sample') {
        // ใส่สินค้าตัวอย่างกลับ (ไว้สำหรับทดลองใช้งาน/สาธิต)
        const zeroStockProducts = INITIAL_PRODUCTS.map((p) => ({ ...p, initialStock: {} }));
        setCatalogItems(INITIAL_CATALOG_ITEMS);
        setProducts(zeroStockProducts);
        setStoredData(StorageKeys.CATALOG_ITEMS, INITIAL_CATALOG_ITEMS);
        setStoredData(StorageKeys.PRODUCTS, zeroStockProducts);
        clearFirestoreCollection(catalogCollectionRef)
          .then(() => Promise.all([
            persistItemsToFirestore(catalogCollectionRef, INITIAL_CATALOG_ITEMS),
            clearFirestoreCollection(productsCollectionRef).then(() => persistItemsToFirestore(productsCollectionRef, zeroStockProducts)),
          ]))
          .catch((err) => console.error('[Firestore] Failed to reset catalog to sample:', err));
      } else if (catalogMode === 'keep') {
        // คงฐานข้อมูลแคตตาล็อกสินค้าจริงไว้ ล้างแค่สต็อกคงเหลือ
        const preservedCatalog = getStoredData<CatalogItem[]>(StorageKeys.CATALOG_ITEMS, catalogItems);
        setCatalogItems(preservedCatalog);
        setStoredData(StorageKeys.CATALOG_ITEMS, preservedCatalog);
        const zeroCatalogProducts = products.map((p) => ({ ...p, initialStock: {} }));
        setProducts(zeroCatalogProducts);
        setStoredData(StorageKeys.PRODUCTS, zeroCatalogProducts);
        persistItemsToFirestore(productsCollectionRef, zeroCatalogProducts).catch((err) =>
          console.error('[Firestore] Failed to sync preserved catalog on reset:', err)
        );
      } else {
        // 'empty' (ค่าเริ่มต้น): เริ่มต้นแอปแบบเปล่าจริง ๆ ไม่มีสินค้าตัวอย่างเลย
        setCatalogItems([]);
        setProducts([]);
        setStoredData(StorageKeys.CATALOG_ITEMS, []);
        setStoredData(StorageKeys.PRODUCTS, []);
        Promise.all([
          clearFirestoreCollection(catalogCollectionRef),
          clearFirestoreCollection(productsCollectionRef),
        ]).catch((err) => console.error('[Firestore] Failed to clear catalog/products on reset:', err));
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

      // 4. Reset audit log with initial clean marker
      const initialLogs = [
        {
          id: 'aud-factory-reset',
          timestamp: new Date().toISOString(),
          action: 'Reset Data' as const,
          user: userSession.name || 'Admin',
          detail: `ล้างข้อมูลและคืนค่าโรงงานสมบูรณ์ (Factory Reset) [${
            catalogMode === 'keep'
              ? 'เก็บฐานข้อมูลแคตตาล็อกสินค้าไว้'
              : catalogMode === 'sample'
              ? 'ใส่สินค้าตัวอย่างกลับ'
              : 'ล้างทุกอย่างหมดจด 100% (แอปเปล่า ไม่มีสินค้าตัวอย่าง)'
          }]`,
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

  return (
    <AppContext.Provider
      value={{
        dataBackend,
        setDataBackend,
        activeTab,
        setActiveTab,
        openDrawer,
        setOpenDrawer,
        userSession,
        updateUserSession,
        isAuthReady,
        isAuthenticated,
        logout,
        isOnline,
        catalogItems,
        addCatalogItem,
        updateCatalogItem,
        deleteCatalogItem,
        importCatalogItems,
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
        activeMonth,
        setActiveMonth,
        availableMonths,
        allTimeSalesTotal,
        allTimeSalesCount,
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
