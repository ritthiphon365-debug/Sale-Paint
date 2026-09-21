import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { RawExportData } from './01_export';
import { TransformedDataset } from './03_transform';

export interface IntegrityVerificationReport {
  timestamp: string;
  isIntegrityVerified: boolean;
  countsComparison: {
    collection: string;
    sourceCount: number;
    destinationCount: number;
    match: boolean;
  }[];
  financialVerification: {
    sourceSalesTotalSum: number;
    destinationSalesTotalSum: number;
    destinationBillsTotalSum: number;
    salesDiff: number;
    billsDiff: number;
    isBalanced: boolean;
  };
  sampleSpotChecks: {
    tableName: string;
    sampleId: string;
    sourceSummary: string;
    destinationSummary: string;
    fieldsMatch: boolean;
  }[];
  checksums: {
    sourceHash: string;
    destinationHash: string;
  };
  overallStatus: 'PASS' | 'FAIL';
}

export function verifyIntegrity(
  rawExport?: RawExportData,
  transformedData?: TransformedDataset
): IntegrityVerificationReport {
  console.log('--- Step 5: Running Post-Migration Data Integrity Verification ---');

  const exportDir = path.join(process.cwd(), 'data-migration', 'exports');
  const transformedDir = path.join(process.cwd(), 'data-migration', 'transformed');
  const reportsDir = path.join(process.cwd(), 'data-migration', 'reports');

  const raw: RawExportData = rawExport || JSON.parse(
    fs.readFileSync(path.join(exportDir, 'raw_all_export.json'), 'utf-8')
  );
  const dest: TransformedDataset = transformedData || JSON.parse(
    fs.readFileSync(path.join(transformedDir, 'transformed_all.json'), 'utf-8')
  );

  // 1. Counts Comparison
  const countsComparison = [
    {
      collection: 'catalog_items',
      sourceCount: raw.catalogItems.length,
      destinationCount: dest.catalogItems.length,
      match: raw.catalogItems.length === dest.catalogItems.length,
    },
    {
      collection: 'products',
      sourceCount: raw.products.length,
      destinationCount: dest.products.length,
      match: raw.products.length === dest.products.length,
    },
    {
      collection: 'sales',
      sourceCount: raw.sales.length,
      destinationCount: dest.sales.length,
      match: raw.sales.length === dest.sales.length,
    },
    {
      collection: 'stock_ins',
      sourceCount: raw.stockIns.length,
      destinationCount: dest.stockIns.length,
      match: raw.stockIns.length === dest.stockIns.length,
    },
    {
      collection: 'system_configs',
      sourceCount: Object.keys(raw.systemConfigs).length,
      destinationCount: dest.systemConfigs.length,
      match: Object.keys(raw.systemConfigs).length === dest.systemConfigs.length,
    },
  ];

  // 2. Financial Verification
  const sourceSalesTotalSum = raw.sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const destinationSalesTotalSum = dest.sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const destinationBillsTotalSum = dest.bills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

  const salesDiff = Math.abs(sourceSalesTotalSum - destinationSalesTotalSum);
  const billsDiff = Math.abs(destinationSalesTotalSum - destinationBillsTotalSum);
  const isBalanced = salesDiff < 0.001 && billsDiff < 0.001;

  // 3. Spot Checks
  const sampleSpotChecks: IntegrityVerificationReport['sampleSpotChecks'] = [];

  // Catalog Item Spot Check (First & Last)
  if (raw.catalogItems.length > 0) {
    const firstRaw = raw.catalogItems[0];
    const firstDest = dest.catalogItems.find((c) => c.id === firstRaw.id);
    sampleSpotChecks.push({
      tableName: 'catalog_items (first)',
      sampleId: firstRaw.id,
      sourceSummary: `${firstRaw.sku} | ${firstRaw.name} | ฿${firstRaw.price}`,
      destinationSummary: `${firstDest?.sku} | ${firstDest?.name} | ฿${firstDest?.price}`,
      fieldsMatch: firstDest ? (firstRaw.sku === firstDest.sku && firstRaw.price === firstDest.price) : false,
    });

    const lastRaw = raw.catalogItems[raw.catalogItems.length - 1];
    const lastDest = dest.catalogItems.find((c) => c.id === lastRaw.id);
    sampleSpotChecks.push({
      tableName: 'catalog_items (last)',
      sampleId: lastRaw.id,
      sourceSummary: `${lastRaw.sku} | ${lastRaw.name} | ฿${lastRaw.price}`,
      destinationSummary: `${lastDest?.sku} | ${lastDest?.name} | ฿${lastDest?.price}`,
      fieldsMatch: lastDest ? (lastRaw.sku === lastDest.sku && lastRaw.price === lastDest.price) : false,
    });
  }

  // Product Spot Check
  if (raw.products.length > 0) {
    const prodRaw = raw.products[0];
    const prodDest = dest.products.find((p) => p.id === prodRaw.id);
    sampleSpotChecks.push({
      tableName: 'products (first)',
      sampleId: prodRaw.id,
      sourceSummary: `${prodRaw.sku} | ${prodRaw.name} | bases:${prodRaw.hasBases}`,
      destinationSummary: `${prodDest?.sku} | ${prodDest?.name} | bases:${prodDest?.has_bases}`,
      fieldsMatch: prodDest ? (prodRaw.sku === prodDest.sku && prodRaw.name === prodDest.name) : false,
    });
  }

  // System Config Spot Check
  const sheetRaw = raw.systemConfigs['google_sheets'];
  const sheetDest = dest.systemConfigs.find((c) => c.key === 'google_sheets');
  sampleSpotChecks.push({
    tableName: 'system_configs (google_sheets)',
    sampleId: 'google_sheets',
    sourceSummary: `spreadsheetId: "${sheetRaw?.spreadsheetId || ''}"`,
    destinationSummary: `spreadsheetId: "${sheetDest?.value?.spreadsheetId || ''}"`,
    fieldsMatch: sheetDest ? (sheetRaw?.spreadsheetId === sheetDest.value?.spreadsheetId) : false,
  });

  // Checksums
  const sourceHash = crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex');
  const destinationHash = crypto.createHash('sha256').update(JSON.stringify(dest)).digest('hex');

  const allCountsMatch = countsComparison.every((c) => c.match);
  const allSpotChecksMatch = sampleSpotChecks.every((s) => s.fieldsMatch);
  const isIntegrityVerified = allCountsMatch && isBalanced && allSpotChecksMatch;

  const report: IntegrityVerificationReport = {
    timestamp: new Date().toISOString(),
    isIntegrityVerified,
    countsComparison,
    financialVerification: {
      sourceSalesTotalSum,
      destinationSalesTotalSum,
      destinationBillsTotalSum,
      salesDiff,
      billsDiff,
      isBalanced,
    },
    sampleSpotChecks,
    checksums: {
      sourceHash,
      destinationHash,
    },
    overallStatus: isIntegrityVerified ? 'PASS' : 'FAIL',
  };

  fs.writeFileSync(path.join(reportsDir, 'integrity_verification_report.json'), JSON.stringify(report, null, 2));

  console.log(`✓ Integrity Verification: ${report.overallStatus}`);
  console.log(`  Row Counts Match: ${allCountsMatch ? 'YES' : 'NO'}`);
  console.log(`  Financial Balance: ${isBalanced ? 'BALANCED (฿0.00 difference)' : 'UNBALANCED'}`);
  console.log(`  Spot Checks: ${allSpotChecksMatch ? '100% IDENTICAL' : 'DISCREPANCY'}`);

  return report;
}

if (process.argv[1]?.endsWith('05_verify_integrity.ts')) {
  const rep = verifyIntegrity();
  if (rep.overallStatus === 'PASS') {
    process.exit(0);
  } else {
    console.error('Integrity verification failed.');
    process.exit(1);
  }
}
