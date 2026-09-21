import fs from 'fs';
import path from 'path';
import { RawExportData } from './01_export';
import { SaleItem, ProductConfig, CatalogItem, StockInRecord } from '../../src/types';

export interface TransformedBill {
  id: string;
  bill_no: string;
  date: string;
  customer_name: string | null;
  customer_phone: string | null;
  salesperson: string;
  salesperson_email: string | null;
  branch: string;
  total_amount: number;
  item_count: number;
  sheet_synced: boolean;
  sheet_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransformedSale {
  id: string;
  bill_id: string;
  date: string;
  product_id: string;
  product_name: string;
  brand: string;
  sku: string;
  size: string;
  base: string | null;
  film_color: string | null;
  color_code: string | null;
  price: number;
  tint_price: number;
  quantity: number;
  total: number;
  customer_name: string | null;
  customer_phone: string | null;
  salesperson: string;
  salesperson_email: string | null;
  branch: string;
  sheet_synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransformedProduct {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  available_sizes: any[];
  has_bases: boolean;
  available_bases: any[] | null;
  has_film_color: boolean;
  film_colors: any[] | null;
  has_color_code: boolean;
  base_prices: Record<string, number>;
  initial_stock: Record<string, number>;
  is_quick_pick: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransformedCatalogItem {
  id: string;
  sku: string;
  name: string;
  film_color: string | null;
  size: string;
  base: string | null;
  color_code: string | null;
  price: number;
  brand: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransformedStockIn {
  id: string;
  date: string;
  product_id: string;
  product_name: string;
  sku: string;
  size: string;
  base: string | null;
  quantity: number;
  note: string | null;
  created_at: string;
}

export interface TransformedSystemConfig {
  key: string;
  value: Record<string, any>;
  updated_at: string;
  updated_by: string;
}

export interface TransformedDataset {
  bills: TransformedBill[];
  sales: TransformedSale[];
  products: TransformedProduct[];
  catalogItems: TransformedCatalogItem[];
  stockIns: TransformedStockIn[];
  systemConfigs: TransformedSystemConfig[];
}

export function transformData(rawData?: RawExportData): TransformedDataset {
  console.log('--- Step 3: Transforming Firestore Schema to Supabase PostgreSQL Schema ---');

  const exportDir = path.join(process.cwd(), 'data-migration', 'exports');
  const transformedDir = path.join(process.cwd(), 'data-migration', 'transformed');
  const sqlDir = path.join(process.cwd(), 'data-migration', 'sql');

  if (!fs.existsSync(transformedDir)) fs.mkdirSync(transformedDir, { recursive: true });
  if (!fs.existsSync(sqlDir)) fs.mkdirSync(sqlDir, { recursive: true });

  const data: RawExportData = rawData || JSON.parse(
    fs.readFileSync(path.join(exportDir, 'raw_all_export.json'), 'utf-8')
  );

  const nowIso = new Date().toISOString();

  // 1. Transform Catalog Items
  const catalogItems: TransformedCatalogItem[] = data.catalogItems.map((c) => ({
    id: c.id,
    sku: c.sku,
    name: c.name,
    film_color: c.filmColor && c.filmColor !== '-' ? c.filmColor : null,
    size: c.size,
    base: c.base && c.base !== '-' ? c.base : null,
    color_code: c.colorCode && c.colorCode !== '-' ? c.colorCode : null,
    price: Number(c.price) || 0,
    brand: c.brand || 'NIPPON PAINT',
    category: c.category || null,
    created_at: nowIso,
    updated_at: nowIso,
  }));

  // 2. Transform Products
  const products: TransformedProduct[] = data.products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand || 'NIPPON PAINT',
    category: p.category || 'สีทาอาคาร',
    available_sizes: Array.isArray(p.availableSizes) ? p.availableSizes : [],
    has_bases: Boolean(p.hasBases),
    available_bases: Array.isArray(p.availableBases) ? p.availableBases : [],
    has_film_color: Boolean(p.hasFilmColor),
    film_colors: Array.isArray(p.filmColors) ? p.filmColors : [],
    has_color_code: Boolean(p.hasColorCode),
    base_prices: typeof p.basePrices === 'object' && p.basePrices ? p.basePrices : {},
    initial_stock: typeof p.initialStock === 'object' && p.initialStock ? p.initialStock : {},
    is_quick_pick: Boolean(p.isQuickPick),
    created_at: nowIso,
    updated_at: nowIso,
  }));

  // 3. Transform Sales & Group into Bills
  // In Firestore, sales items each store billId. In PostgreSQL, bills is parent, sales is child.
  const billMap = new Map<string, {
    items: SaleItem[];
    earliestDate: string;
    customerName?: string;
    customerPhone?: string;
    salesperson?: string;
    salespersonEmail?: string;
    branch?: string;
  }>();

  data.sales.forEach((s) => {
    const billId = s.billId || `BILL-UNKNOWN-${s.id}`;
    const group = billMap.get(billId) || {
      items: [],
      earliestDate: s.date || nowIso.split('T')[0],
      customerName: s.customerName,
      customerPhone: s.customerPhone,
      salesperson: s.salesperson,
      salespersonEmail: s.salespersonEmail,
      branch: (s as any).branch,
    };
    group.items.push(s);
    if (s.customerName && !group.customerName) group.customerName = s.customerName;
    if (s.customerPhone && !group.customerPhone) group.customerPhone = s.customerPhone;
    if (s.salesperson && !group.salesperson) group.salesperson = s.salesperson;
    if (s.salespersonEmail && !group.salespersonEmail) group.salespersonEmail = s.salespersonEmail;
    if ((s as any).branch && !group.branch) group.branch = (s as any).branch;
    billMap.set(billId, group);
  });

  const bills: TransformedBill[] = [];
  const sales: TransformedSale[] = [];

  billMap.forEach((group, billId) => {
    const totalAmount = group.items.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
    const billCreatedAt = group.items[0]?.createdAt || nowIso;
    const billUpdatedAt = group.items[group.items.length - 1]?.updatedAt || nowIso;

    bills.push({
      id: billId,
      bill_no: billId,
      date: group.earliestDate,
      customer_name: group.customerName || 'ลูกค้าทั่วไป',
      customer_phone: group.customerPhone || null,
      salesperson: group.salesperson || 'พนักงานขาย',
      salesperson_email: group.salespersonEmail || null,
      branch: group.branch || 'สาขาหลัก',
      total_amount: totalAmount,
      item_count: group.items.length,
      sheet_synced: false,
      sheet_synced_at: null,
      created_at: billCreatedAt,
      updated_at: billUpdatedAt,
    });

    group.items.forEach((item) => {
      sales.push({
        id: item.id,
        bill_id: billId,
        date: item.date || group.earliestDate,
        product_id: item.productId,
        product_name: item.productName,
        brand: item.brand || 'NIPPON PAINT',
        sku: item.sku,
        size: item.size,
        base: item.base && item.base !== '-' ? item.base : null,
        film_color: item.filmColor && item.filmColor !== '-' ? item.filmColor : null,
        color_code: item.colorCode && item.colorCode !== '-' ? item.colorCode : null,
        price: Number(item.price) || 0,
        tint_price: Number(item.tintPrice) || 0,
        quantity: Number(item.quantity) || 1,
        total: Number(item.total) || 0,
        customer_name: item.customerName || group.customerName || 'ลูกค้าทั่วไป',
        customer_phone: item.customerPhone || group.customerPhone || null,
        salesperson: item.salesperson || group.salesperson || 'พนักงานขาย',
        salesperson_email: item.salespersonEmail || group.salespersonEmail || null,
        branch: (item as any).branch || group.branch || 'สาขาหลัก',
        sheet_synced: false,
        created_at: item.createdAt || nowIso,
        updated_at: item.updatedAt || nowIso,
      });
    });
  });

  // 4. Transform Stock Ins
  const stockIns: TransformedStockIn[] = data.stockIns.map((s) => ({
    id: s.id,
    date: s.date,
    product_id: s.productId,
    product_name: s.productName,
    sku: s.sku,
    size: s.size,
    base: s.base && s.base !== '-' ? s.base : null,
    quantity: Number(s.quantity) || 0,
    note: s.note || null,
    created_at: s.createdAt || nowIso,
  }));

  // 5. Transform System Configs
  const systemConfigs: TransformedSystemConfig[] = Object.entries(data.systemConfigs).map(([key, val]) => ({
    key,
    value: val,
    updated_at: nowIso,
    updated_by: 'system_phase2_migration',
  }));

  const dataset: TransformedDataset = {
    bills,
    sales,
    products,
    catalogItems,
    stockIns,
    systemConfigs,
  };

  // Write transformed JSON files
  fs.writeFileSync(path.join(transformedDir, 'transformed_bills.json'), JSON.stringify(bills, null, 2));
  fs.writeFileSync(path.join(transformedDir, 'transformed_sales.json'), JSON.stringify(sales, null, 2));
  fs.writeFileSync(path.join(transformedDir, 'transformed_products.json'), JSON.stringify(products, null, 2));
  fs.writeFileSync(path.join(transformedDir, 'transformed_catalog_items.json'), JSON.stringify(catalogItems, null, 2));
  fs.writeFileSync(path.join(transformedDir, 'transformed_stock_ins.json'), JSON.stringify(stockIns, null, 2));
  fs.writeFileSync(path.join(transformedDir, 'transformed_system_configs.json'), JSON.stringify(systemConfigs, null, 2));
  fs.writeFileSync(path.join(transformedDir, 'transformed_all.json'), JSON.stringify(dataset, null, 2));

  // Generate Idempotent SQL Statements
  const sqlLines: string[] = [
    '-- ==============================================================================;',
    '-- SALE PAINT — PHASE 2: IDEMPOTENT DATA MIGRATION SEED;',
    '-- Generated At: ' + nowIso + ';',
    '-- Strategy: UPSERT with ON CONFLICT (id) DO UPDATE / DO NOTHING;',
    '-- ==============================================================================;',
    '',
    'BEGIN;',
    '',
  ];

  // System Configs SQL
  systemConfigs.forEach((c) => {
    const valEscaped = JSON.stringify(c.value).replace(/'/g, "''");
    sqlLines.push(
      `INSERT INTO public.system_configs (key, value, updated_at, updated_by) ` +
      `VALUES ('${c.key}', '${valEscaped}'::jsonb, '${c.updated_at}', '${c.updated_by}') ` +
      `ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at, updated_by = EXCLUDED.updated_by;`
    );
  });
  sqlLines.push('');

  // Catalog Items SQL
  catalogItems.forEach((c) => {
    sqlLines.push(
      `INSERT INTO public.catalog_items (id, sku, name, film_color, size, base, color_code, price, brand, category, created_at, updated_at) ` +
      `VALUES ('${c.id}', '${c.sku}', '${c.name.replace(/'/g, "''")}', ${c.film_color ? `'${c.film_color.replace(/'/g, "''")}'` : 'NULL'}, ` +
      `'${c.size}', ${c.base ? `'${c.base}'` : 'NULL'}, ${c.color_code ? `'${c.color_code.replace(/'/g, "''")}'` : 'NULL'}, ` +
      `${c.price}, '${c.brand?.replace(/'/g, "''")}', ${c.category ? `'${c.category.replace(/'/g, "''")}'` : 'NULL'}, '${c.created_at}', '${c.updated_at}') ` +
      `ON CONFLICT (id) DO UPDATE SET sku = EXCLUDED.sku, name = EXCLUDED.name, price = EXCLUDED.price, updated_at = EXCLUDED.updated_at;`
    );
  });
  sqlLines.push('');

  // Products SQL
  products.forEach((p) => {
    const sizesJson = JSON.stringify(p.available_sizes).replace(/'/g, "''");
    const basesJson = JSON.stringify(p.available_bases).replace(/'/g, "''");
    const colorsJson = JSON.stringify(p.film_colors).replace(/'/g, "''");
    const pricesJson = JSON.stringify(p.base_prices).replace(/'/g, "''");
    const stockJson = JSON.stringify(p.initial_stock).replace(/'/g, "''");

    sqlLines.push(
      `INSERT INTO public.products (id, sku, name, brand, category, available_sizes, has_bases, available_bases, has_film_color, film_colors, has_color_code, base_prices, initial_stock, is_quick_pick, created_at, updated_at) ` +
      `VALUES ('${p.id}', '${p.sku}', '${p.name.replace(/'/g, "''")}', '${p.brand.replace(/'/g, "''")}', '${p.category.replace(/'/g, "''")}', ` +
      `'${sizesJson}'::jsonb, ${p.has_bases}, '${basesJson}'::jsonb, ${p.has_film_color}, '${colorsJson}'::jsonb, ${p.has_color_code}, ` +
      `'${pricesJson}'::jsonb, '${stockJson}'::jsonb, ${p.is_quick_pick}, '${p.created_at}', '${p.updated_at}') ` +
      `ON CONFLICT (id) DO UPDATE SET sku = EXCLUDED.sku, name = EXCLUDED.name, base_prices = EXCLUDED.base_prices, updated_at = EXCLUDED.updated_at;`
    );
  });
  sqlLines.push('');

  // Bills SQL
  bills.forEach((b) => {
    sqlLines.push(
      `INSERT INTO public.bills (id, bill_no, date, customer_name, customer_phone, salesperson, salesperson_email, branch, total_amount, item_count, sheet_synced, sheet_synced_at, created_at, updated_at) ` +
      `VALUES ('${b.id}', '${b.bill_no}', '${b.date}', '${b.customer_name?.replace(/'/g, "''")}', ${b.customer_phone ? `'${b.customer_phone}'` : 'NULL'}, ` +
      `'${b.salesperson.replace(/'/g, "''")}', ${b.salesperson_email ? `'${b.salesperson_email}'` : 'NULL'}, '${b.branch.replace(/'/g, "''")}', ` +
      `${b.total_amount}, ${b.item_count}, ${b.sheet_synced}, ${b.sheet_synced_at ? `'${b.sheet_synced_at}'` : 'NULL'}, '${b.created_at}', '${b.updated_at}') ` +
      `ON CONFLICT (id) DO UPDATE SET total_amount = EXCLUDED.total_amount, item_count = EXCLUDED.item_count, updated_at = EXCLUDED.updated_at;`
    );
  });
  sqlLines.push('');

  // Sales SQL
  sales.forEach((s) => {
    sqlLines.push(
      `INSERT INTO public.sales (id, bill_id, date, product_id, product_name, brand, sku, size, base, film_color, color_code, price, tint_price, quantity, total, customer_name, customer_phone, salesperson, salesperson_email, branch, sheet_synced, created_at, updated_at) ` +
      `VALUES ('${s.id}', '${s.bill_id}', '${s.date}', '${s.product_id}', '${s.product_name.replace(/'/g, "''")}', '${s.brand.replace(/'/g, "''")}', ` +
      `'${s.sku}', '${s.size}', ${s.base ? `'${s.base}'` : 'NULL'}, ${s.film_color ? `'${s.film_color.replace(/'/g, "''")}'` : 'NULL'}, ` +
      `${s.color_code ? `'${s.color_code.replace(/'/g, "''")}'` : 'NULL'}, ${s.price}, ${s.tint_price}, ${s.quantity}, ${s.total}, ` +
      `'${s.customer_name?.replace(/'/g, "''")}', ${s.customer_phone ? `'${s.customer_phone}'` : 'NULL'}, '${s.salesperson.replace(/'/g, "''")}', ` +
      `${s.salesperson_email ? `'${s.salesperson_email}'` : 'NULL'}, '${s.branch.replace(/'/g, "''")}', ${s.sheet_synced}, '${s.created_at}', '${s.updated_at}') ` +
      `ON CONFLICT (id) DO UPDATE SET total = EXCLUDED.total, quantity = EXCLUDED.quantity, updated_at = EXCLUDED.updated_at;`
    );
  });
  sqlLines.push('');

  // Stock Ins SQL
  stockIns.forEach((stk) => {
    sqlLines.push(
      `INSERT INTO public.stock_ins (id, date, product_id, product_name, sku, size, base, quantity, note, created_at) ` +
      `VALUES ('${stk.id}', '${stk.date}', '${stk.product_id}', '${stk.product_name.replace(/'/g, "''")}', '${stk.sku}', ` +
      `'${stk.size}', ${stk.base ? `'${stk.base}'` : 'NULL'}, ${stk.quantity}, ${stk.note ? `'${stk.note.replace(/'/g, "''")}'` : 'NULL'}, '${stk.created_at}') ` +
      `ON CONFLICT (id) DO NOTHING;`
    );
  });
  sqlLines.push('');

  sqlLines.push('COMMIT;');

  fs.writeFileSync(path.join(sqlDir, '01_seed_import_idempotent.sql'), sqlLines.join('\n'));

  console.log('✓ Successfully transformed data to PostgreSQL format:');
  console.log(`  Bills: ${bills.length}`);
  console.log(`  Sales: ${sales.length}`);
  console.log(`  Products: ${products.length}`);
  console.log(`  Catalog Items: ${catalogItems.length}`);
  console.log(`  Stock Ins: ${stockIns.length}`);
  console.log(`  System Configs: ${systemConfigs.length}`);
  console.log(`  SQL Seed File: data-migration/sql/01_seed_import_idempotent.sql (${sqlLines.length} lines)`);

  return dataset;
}

if (process.argv[1]?.endsWith('03_transform.ts')) {
  transformData();
  process.exit(0);
}
