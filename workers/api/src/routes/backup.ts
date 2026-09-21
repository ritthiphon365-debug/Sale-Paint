/**
 * Phase 1 Cloudflare R2 Backup Foundation
 *
 * Intended future flow:
 * Supabase PostgreSQL -> Backup Cron/Trigger -> Cloudflare R2
 *
 * Standard Backup Key Naming Convention:
 * backups/{environment}/{year}/{month}/{YYYY-MM-DD_HHmmss}_{backup_type}_v{schema_version}.json.gz
 *
 * Example:
 * backups/production/2026/09/2026-09-21_170000_full_snapshot_v1.json.gz
 */

export interface BackupMetadata {
  databaseVersion: string;
  schemaVersion: string;
  backupType: 'full_snapshot' | 'incremental_diff' | 'daily_aggregate';
  environment: string;
  timestamp: string;
  recordCounts: {
    bills?: number;
    sales?: number;
    products?: number;
    catalogItems?: number;
    stockIns?: number;
    systemConfigs?: number;
  };
  checksumSha256?: string;
}

export class R2BackupManager {
  /**
   * Generates standard identifiable R2 storage path for a backup file
   */
  static generateBackupKey(
    backupType: 'full_snapshot' | 'incremental_diff' | 'daily_aggregate' = 'full_snapshot',
    envName: string = 'production',
    schemaVer: string = 'v1',
    dateObj: Date = new Date()
  ): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = dateObj.getUTCFullYear();
    const mm = pad(dateObj.getUTCMonth() + 1);
    const dd = pad(dateObj.getUTCDate());
    const hh = pad(dateObj.getUTCHours());
    const mi = pad(dateObj.getUTCMinutes());
    const ss = pad(dateObj.getUTCSeconds());

    const datePrefix = `${yyyy}-${mm}-${dd}`;
    const timeStamp = `${hh}${mi}${ss}`;

    return `backups/${envName}/${yyyy}/${mm}/${datePrefix}_${timeStamp}_${backupType}_${schemaVer}.json.gz`;
  }

  /**
   * Health status inspection for R2 storage binding
   */
  static checkR2Binding(env: any): { ready: boolean; bucketName?: string } {
    const hasBucket = Boolean(env?.BACKUP_BUCKET);
    return {
      ready: hasBucket,
      bucketName: hasBucket ? 'sale-paint-backups' : undefined,
    };
  }
}
