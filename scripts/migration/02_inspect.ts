import fs from 'fs';
import path from 'path';
import { RawExportData } from './01_export';

export interface AnomalyReport {
  generatedAt: string;
  totalRecordsExamined: number;
  totalAnomaliesFound: number;
  hasBlockingErrors: boolean;
  summary: {
    salesChecked: number;
    productsChecked: number;
    catalogItemsChecked: number;
    stockInsChecked: number;
    systemConfigsChecked: number;
  };
  details: {
    missingRequiredFields: Array<{ collection: string; id: string; field: string }>;
    duplicateIds: Array<{ collection: string; id: string }>;
    invalidDataTypes: Array<{ collection: string; id: string; field: string; expected: string; actual: string }>;
    invalidDates: Array<{ collection: string; id: string; field: string; value: any }>;
    referentialIntegrityWarnings: Array<{ collection: string; id: string; issue: string }>;
  };
}

export function inspectAnomalies(rawData?: RawExportData): AnomalyReport {
  console.log('--- Step 2: Running Source Data Anomaly & Quality Inspection ---');

  const exportDir = path.join(process.cwd(), 'data-migration', 'exports');
  const reportsDir = path.join(process.cwd(), 'data-migration', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const data: RawExportData = rawData || JSON.parse(
    fs.readFileSync(path.join(exportDir, 'raw_all_export.json'), 'utf-8')
  );

  const report: AnomalyReport = {
    generatedAt: new Date().toISOString(),
    totalRecordsExamined: 0,
    totalAnomaliesFound: 0,
    hasBlockingErrors: false,
    summary: {
      salesChecked: data.sales.length,
      productsChecked: data.products.length,
      catalogItemsChecked: data.catalogItems.length,
      stockInsChecked: data.stockIns.length,
      systemConfigsChecked: Object.keys(data.systemConfigs).length,
    },
    details: {
      missingRequiredFields: [],
      duplicateIds: [],
      invalidDataTypes: [],
      invalidDates: [],
      referentialIntegrityWarnings: [],
    },
  };

  // 1. Check Catalog Items
  const catalogIds = new Set<string>();
  const catalogSkus = new Set<string>();
  data.catalogItems.forEach((item, idx) => {
    report.totalRecordsExamined++;
    const id = item.id || `unidentified-catalog-${idx}`;

    if (!item.id) report.details.missingRequiredFields.push({ collection: 'catalog_items', id, field: 'id' });
    if (!item.sku) report.details.missingRequiredFields.push({ collection: 'catalog_items', id, field: 'sku' });
    if (!item.name) report.details.missingRequiredFields.push({ collection: 'catalog_items', id, field: 'name' });
    if (!item.size) report.details.missingRequiredFields.push({ collection: 'catalog_items', id, field: 'size' });

    if (catalogIds.has(item.id)) {
      report.details.duplicateIds.push({ collection: 'catalog_items', id: item.id });
    }
    catalogIds.add(item.id);
    if (item.sku) catalogSkus.add(item.sku);

    if (typeof item.price !== 'number' || isNaN(item.price) || item.price < 0) {
      report.details.invalidDataTypes.push({
        collection: 'catalog_items',
        id,
        field: 'price',
        expected: 'non-negative number',
        actual: String(item.price),
      });
    }
  });

  // 2. Check Products
  const productIds = new Set<string>();
  data.products.forEach((prod, idx) => {
    report.totalRecordsExamined++;
    const id = prod.id || `unidentified-product-${idx}`;

    if (!prod.id) report.details.missingRequiredFields.push({ collection: 'products', id, field: 'id' });
    if (!prod.sku) report.details.missingRequiredFields.push({ collection: 'products', id, field: 'sku' });
    if (!prod.name) report.details.missingRequiredFields.push({ collection: 'products', id, field: 'name' });
    if (!prod.category) report.details.missingRequiredFields.push({ collection: 'products', id, field: 'category' });

    if (productIds.has(prod.id)) {
      report.details.duplicateIds.push({ collection: 'products', id: prod.id });
    }
    productIds.add(prod.id);

    if (!Array.isArray(prod.availableSizes) || prod.availableSizes.length === 0) {
      report.details.invalidDataTypes.push({
        collection: 'products',
        id,
        field: 'availableSizes',
        expected: 'non-empty array',
        actual: JSON.stringify(prod.availableSizes),
      });
    }

    if (typeof prod.basePrices !== 'object' || prod.basePrices === null) {
      report.details.invalidDataTypes.push({
        collection: 'products',
        id,
        field: 'basePrices',
        expected: 'object',
        actual: String(prod.basePrices),
      });
    }
  });

  // 3. Check Sales
  const saleIds = new Set<string>();
  data.sales.forEach((sale, idx) => {
    report.totalRecordsExamined++;
    const id = sale.id || `unidentified-sale-${idx}`;

    if (!sale.id) report.details.missingRequiredFields.push({ collection: 'sales', id, field: 'id' });
    if (!sale.billId) report.details.missingRequiredFields.push({ collection: 'sales', id, field: 'billId' });
    if (!sale.date) report.details.missingRequiredFields.push({ collection: 'sales', id, field: 'date' });
    if (!sale.productName) report.details.missingRequiredFields.push({ collection: 'sales', id, field: 'productName' });

    if (saleIds.has(sale.id)) {
      report.details.duplicateIds.push({ collection: 'sales', id: sale.id });
    }
    saleIds.add(sale.id);

    if (typeof sale.total !== 'number' || isNaN(sale.total) || sale.total < 0) {
      report.details.invalidDataTypes.push({
        collection: 'sales',
        id,
        field: 'total',
        expected: 'non-negative number',
        actual: String(sale.total),
      });
    }
    if (typeof sale.quantity !== 'number' || isNaN(sale.quantity) || sale.quantity <= 0) {
      report.details.invalidDataTypes.push({
        collection: 'sales',
        id,
        field: 'quantity',
        expected: 'positive number',
        actual: String(sale.quantity),
      });
    }

    // Validate date format
    if (sale.date && isNaN(Date.parse(sale.date))) {
      report.details.invalidDates.push({ collection: 'sales', id, field: 'date', value: sale.date });
    }
  });

  // 4. Check Stock Ins
  const stockInIds = new Set<string>();
  data.stockIns.forEach((stk, idx) => {
    report.totalRecordsExamined++;
    const id = stk.id || `unidentified-stockin-${idx}`;

    if (!stk.id) report.details.missingRequiredFields.push({ collection: 'stock_ins', id, field: 'id' });
    if (!stk.date) report.details.missingRequiredFields.push({ collection: 'stock_ins', id, field: 'date' });
    if (!stk.productId) report.details.missingRequiredFields.push({ collection: 'stock_ins', id, field: 'productId' });

    if (stockInIds.has(stk.id)) {
      report.details.duplicateIds.push({ collection: 'stock_ins', id: stk.id });
    }
    stockInIds.add(stk.id);

    if (typeof stk.quantity !== 'number' || isNaN(stk.quantity)) {
      report.details.invalidDataTypes.push({
        collection: 'stock_ins',
        id,
        field: 'quantity',
        expected: 'number',
        actual: String(stk.quantity),
      });
    }
  });

  // 5. Check System Configs
  Object.entries(data.systemConfigs).forEach(([key, val]) => {
    report.totalRecordsExamined++;
    if (!val || typeof val !== 'object') {
      report.details.invalidDataTypes.push({
        collection: 'system_configs',
        id: key,
        field: 'value',
        expected: 'object',
        actual: typeof val,
      });
    }
  });

  report.totalAnomaliesFound =
    report.details.missingRequiredFields.length +
    report.details.duplicateIds.length +
    report.details.invalidDataTypes.length +
    report.details.invalidDates.length;

  report.hasBlockingErrors =
    report.details.missingRequiredFields.length > 0 ||
    report.details.duplicateIds.length > 0 ||
    report.details.invalidDates.length > 0;

  fs.writeFileSync(path.join(reportsDir, 'anomaly_report.json'), JSON.stringify(report, null, 2));

  console.log(`✓ Completed anomaly inspection: examined ${report.totalRecordsExamined} records.`);
  console.log(`  Total anomalies detected: ${report.totalAnomaliesFound}`);
  console.log(`  Blocking errors: ${report.hasBlockingErrors ? 'YES (FAILED)' : 'NONE (PASSED CLEAN)'}`);

  return report;
}

if (process.argv[1]?.endsWith('02_inspect.ts')) {
  const rep = inspectAnomalies();
  if (rep.hasBlockingErrors) {
    console.error('Inspection failed due to blocking errors.');
    process.exit(1);
  } else {
    process.exit(0);
  }
}
