// Storage keys and robust namespaced local persistence
export const STORAGE_PREFIX = 'salepaint_v1_';

export const StorageKeys = {
  CATALOG_ITEMS: `${STORAGE_PREFIX}catalogItems`,
  PRODUCTS: `${STORAGE_PREFIX}products`,
  SALES: `${STORAGE_PREFIX}sales`,
  STOCK_IN: `${STORAGE_PREFIX}stockIn`,
  CUSTOMERS: `${STORAGE_PREFIX}customers`,
  MKS_DAY: `${STORAGE_PREFIX}mksDay`,
  MKS_WEEK: `${STORAGE_PREFIX}mksWeek`,
  AUDIT_LOGS: `${STORAGE_PREFIX}auditLogs`,
  TARGETS: `${STORAGE_PREFIX}targets`,
  COMMISSION_RULES: `${STORAGE_PREFIX}commissionRules`,
  GALLON_RULES: `${STORAGE_PREFIX}gallonRules`,
  BRAND_SETTINGS: `${STORAGE_PREFIX}brandSettings`,
  USER_SESSION: `${STORAGE_PREFIX}userSession`,
  GOOGLE_SHEET_CONFIG: `${STORAGE_PREFIX}googleSheetConfig`,
};

export function getStoredData<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[LocalStorage] Failed to parse key ${key}`, err);
    return defaultValue;
  }
}

export function setStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[LocalStorage] Failed to store key ${key}`, err);
  }
}

export function clearNamespaceData(): void {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (err) {
    console.error('[LocalStorage] Failed to clear namespaced data', err);
  }
}
