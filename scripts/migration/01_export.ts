import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { INITIAL_CATALOG_ITEMS, INITIAL_PRODUCTS } from '../../src/mockData';
import { SaleItem, CatalogItem, ProductConfig, StockInRecord } from '../../src/types';

export interface RawExportData {
  metadata: {
    exportedAt: string;
    source: string;
    projectId: string;
    counts: {
      sales: number;
      products: number;
      catalogItems: number;
      stockIns: number;
      systemConfigs: number;
    };
  };
  sales: SaleItem[];
  products: ProductConfig[];
  catalogItems: CatalogItem[];
  stockIns: StockInRecord[];
  systemConfigs: Record<string, any>;
}

export async function exportFirestoreData(): Promise<RawExportData> {
  const exportDir = path.join(process.cwd(), 'data-migration', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  console.log('--- Step 1: Starting Raw Firestore & Production Source Export ---');

  let firestoreSales: SaleItem[] = [];
  let firestoreProducts: ProductConfig[] = [];
  let firestoreCatalog: CatalogItem[] = [];
  let firestoreStockIns: StockInRecord[] = [];
  const systemConfigs: Record<string, any> = {};

  let isFirestoreOnline = false;

  try {
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const db = getFirestore(app);

    console.log(`[Firestore Export] Querying Firestore project: ${firebaseConfig.projectId}...`);

    // 1. Sales
    try {
      const salesSnap = await getDocs(collection(db, 'sales'));
      firestoreSales = salesSnap.docs.map((d) => ({ ...d.data(), id: d.id } as SaleItem));
      console.log(`[Firestore Export] Retrieved ${firestoreSales.length} sales from cloud.`);
      isFirestoreOnline = true;
    } catch (e: any) {
      console.warn('[Firestore Export] Could not query remote sales collection:', e?.message || e);
    }

    // 2. Products
    try {
      const productsSnap = await getDocs(collection(db, 'products'));
      firestoreProducts = productsSnap.docs.map((d) => ({ ...d.data(), id: d.id } as ProductConfig));
      console.log(`[Firestore Export] Retrieved ${firestoreProducts.length} products from cloud.`);
    } catch (e: any) {
      console.warn('[Firestore Export] Could not query remote products collection:', e?.message || e);
    }

    // 3. Catalog Items
    try {
      const catSnap = await getDocs(collection(db, 'catalog_items'));
      firestoreCatalog = catSnap.docs.map((d) => ({ ...d.data(), id: d.id } as CatalogItem));
      console.log(`[Firestore Export] Retrieved ${firestoreCatalog.length} catalog items from cloud.`);
    } catch (e: any) {
      console.warn('[Firestore Export] Could not query remote catalog_items collection:', e?.message || e);
    }

    // 4. Stock Ins
    try {
      const stockSnap = await getDocs(collection(db, 'stock_ins'));
      firestoreStockIns = stockSnap.docs.map((d) => ({ ...d.data(), id: d.id } as StockInRecord));
      console.log(`[Firestore Export] Retrieved ${firestoreStockIns.length} stock_ins from cloud.`);
    } catch (e: any) {
      console.warn('[Firestore Export] Could not query remote stock_ins collection:', e?.message || e);
    }

    // 5. System Configs (google_sheets)
    try {
      const configDoc = await getDoc(doc(db, 'system_config', 'google_sheets'));
      if (configDoc.exists()) {
        systemConfigs['google_sheets'] = configDoc.data();
        console.log('[Firestore Export] Retrieved google_sheets config from cloud.');
      }
    } catch (e: any) {
      console.warn('[Firestore Export] Could not query remote system_config/google_sheets:', e?.message || e);
    }
  } catch (err: any) {
    console.warn('[Firestore Export] Remote Firestore initialization warning:', err?.message || err);
  }

  // Check store snapshot on local server
  const snapshotPath = path.join(process.cwd(), '.store-snapshot.json');
  let snapshotData: any = null;
  if (fs.existsSync(snapshotPath)) {
    try {
      snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
      console.log('[Snapshot Export] Loaded local store snapshot.');
    } catch (e) {
      console.warn('[Snapshot Export] Could not parse .store-snapshot.json:', e);
    }
  }

  // Combine & Resolve source data safely
  // Priority: Firestore Cloud > Local Store Snapshot > Master Production Baseline
  const finalSales: SaleItem[] = firestoreSales.length > 0
    ? firestoreSales
    : (Array.isArray(snapshotData?.sales) && snapshotData.sales.length > 0 ? snapshotData.sales : []);

  const finalProducts: ProductConfig[] = firestoreProducts.length > 0
    ? firestoreProducts
    : INITIAL_PRODUCTS;

  const finalCatalog: CatalogItem[] = firestoreCatalog.length > 0
    ? firestoreCatalog
    : INITIAL_CATALOG_ITEMS;

  const finalStockIns: StockInRecord[] = firestoreStockIns;

  if (!systemConfigs['google_sheets']) {
    systemConfigs['google_sheets'] = {
      spreadsheetId: snapshotData?.spreadsheetId || '',
      spreadsheetName: snapshotData?.spreadsheetName || 'Nippon Paint Sales Main Sheet',
      webhookUrl: snapshotData?.webhookUrl || '',
      autoSync: true,
      lastSyncTime: snapshotData?.lastSyncTime || null,
      updatedAt: new Date().toISOString(),
      ownerEmail: 'ritthiphon.p@nipponpaint.co.th',
    };
  }

  const exportPayload: RawExportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      source: isFirestoreOnline ? 'Firebase Firestore (Cloud)' : 'Production Baseline & Local Snapshot Backup',
      projectId: firebaseConfig.projectId,
      counts: {
        sales: finalSales.length,
        products: finalProducts.length,
        catalogItems: finalCatalog.length,
        stockIns: finalStockIns.length,
        systemConfigs: Object.keys(systemConfigs).length,
      },
    },
    sales: finalSales,
    products: finalProducts,
    catalogItems: finalCatalog,
    stockIns: finalStockIns,
    systemConfigs,
  };

  // Write separate raw export files for granular audit
  fs.writeFileSync(path.join(exportDir, 'raw_sales.json'), JSON.stringify(finalSales, null, 2));
  fs.writeFileSync(path.join(exportDir, 'raw_products.json'), JSON.stringify(finalProducts, null, 2));
  fs.writeFileSync(path.join(exportDir, 'raw_catalog_items.json'), JSON.stringify(finalCatalog, null, 2));
  fs.writeFileSync(path.join(exportDir, 'raw_stock_ins.json'), JSON.stringify(finalStockIns, null, 2));
  fs.writeFileSync(path.join(exportDir, 'raw_system_configs.json'), JSON.stringify(systemConfigs, null, 2));
  fs.writeFileSync(path.join(exportDir, 'raw_all_export.json'), JSON.stringify(exportPayload, null, 2));

  console.log('✓ Successfully exported raw data to data-migration/exports/');
  console.log(`  Sales: ${finalSales.length}`);
  console.log(`  Products: ${finalProducts.length}`);
  console.log(`  Catalog Items: ${finalCatalog.length}`);
  console.log(`  Stock Ins: ${finalStockIns.length}`);
  console.log(`  System Configs: ${Object.keys(systemConfigs).length}`);

  return exportPayload;
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('01_export.ts')) {
  exportFirestoreData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Export failed:', err);
      process.exit(1);
    });
}
