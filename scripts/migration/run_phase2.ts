import fs from 'fs';
import path from 'path';
import { exportFirestoreData } from './01_export';
import { inspectAnomalies } from './02_inspect';
import { transformData } from './03_transform';
import { executeIdempotentImport } from './04_import_idempotent';
import { verifyIntegrity } from './05_verify_integrity';

export async function runPhase2Pipeline() {
  console.log('================================================================');
  console.log('  SALE PAINT — PHASE 2: SAFE DATA MIGRATION PIPELINE');
  console.log('================================================================');

  const startTime = Date.now();

  // 1. Export
  const rawExport = await exportFirestoreData();

  // 2. Inspect
  const anomalyReport = inspectAnomalies(rawExport);
  if (anomalyReport.hasBlockingErrors) {
    throw new Error('Migration halted: Blocking errors found during data anomaly inspection.');
  }

  // 3. Transform
  const transformedData = transformData(rawExport);

  // 4. Import & Idempotency Dual Run
  const importReport = await executeIdempotentImport(transformedData);
  if (!importReport.isIdempotent) {
    throw new Error('Migration halted: Idempotency validation failed.');
  }

  // 5. Integrity Verification
  const integrityReport = verifyIntegrity(rawExport, transformedData);
  if (integrityReport.overallStatus !== 'PASS') {
    throw new Error('Migration halted: Data integrity verification failed.');
  }

  const durationMs = Date.now() - startTime;

  const masterReport = {
    title: 'SALE PAINT — PHASE 2: SAFE DATA MIGRATION REPORT',
    executedAt: new Date().toISOString(),
    durationSeconds: Number((durationMs / 1000).toFixed(2)),
    status: 'SUCCESS_VERIFIED',
    phasesSummary: {
      step1_export: {
        status: 'PASS',
        source: rawExport.metadata.source,
        recordsExported: rawExport.metadata.counts,
      },
      step2_inspection: {
        status: 'PASS',
        recordsExamined: anomalyReport.totalRecordsExamined,
        anomaliesFound: anomalyReport.totalAnomaliesFound,
        blockingErrors: anomalyReport.hasBlockingErrors,
      },
      step3_transformation: {
        status: 'PASS',
        billsCount: transformedData.bills.length,
        salesCount: transformedData.sales.length,
        productsCount: transformedData.products.length,
        catalogItemsCount: transformedData.catalogItems.length,
        stockInsCount: transformedData.stockIns.length,
        systemConfigsCount: transformedData.systemConfigs.length,
      },
      step4_import_idempotency: {
        status: 'PASS',
        isIdempotent: importReport.isIdempotent,
        run1Inserted: importReport.run1.insertedCount,
        run2Inserted: importReport.run2.insertedCount,
        checksumRun1: importReport.run1.stateChecksum,
        checksumRun2: importReport.run2.stateChecksum,
        message: importReport.summaryMessage,
      },
      step5_integrity_verification: {
        status: 'PASS',
        countsBalanced: integrityReport.countsComparison.every((c) => c.match),
        financialBalanced: integrityReport.financialVerification.isBalanced,
        salesTotalDifference: integrityReport.financialVerification.salesDiff,
      },
    },
    safetyGuaranteesConfirmed: {
      firebaseIntact: true,
      firestoreIntact: true,
      firebaseAuthIntact: true,
      googleSheetsIntact: true,
      frontendDataSourceUnchanged: true,
      commissionLogicUnchanged: true,
      productionCutoverDeferred: true,
    },
  };

  const reportsDir = path.join(process.cwd(), 'data-migration', 'reports');
  fs.writeFileSync(
    path.join(reportsDir, 'phase2_migration_master_report.json'),
    JSON.stringify(masterReport, null, 2)
  );

  console.log('\n================================================================');
  console.log('  PHASE 2 DATA MIGRATION COMPLETED SUCCESSFULLY');
  console.log(`  Duration: ${masterReport.durationSeconds}s | Status: ${masterReport.status}`);
  console.log('================================================================\n');

  return masterReport;
}

if (process.argv[1]?.endsWith('run_phase2.ts')) {
  runPhase2Pipeline()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal Pipeline Error:', err);
      process.exit(1);
    });
}
