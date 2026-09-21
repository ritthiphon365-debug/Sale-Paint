import { handleHealthCheck } from './routes/health';
import { R2BackupManager } from './routes/backup';
import { verifySupabaseToken } from './middleware/auth';
import { createErrorResponse } from './middleware/errorHandler';

export interface Env {
  ENVIRONMENT: string;
  SCHEMA_VERSION: string;
  BACKUP_BUCKET?: any;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      // 2. Health check route
      if (url.pathname === '/api/health' || url.pathname === '/health') {
        return handleHealthCheck(env);
      }

      // 3. Auth token verification foundation endpoint
      if (url.pathname === '/api/auth/verify' && request.method === 'POST') {
        const authResult = await verifySupabaseToken(request, env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
        if (authResult.error) {
          return createErrorResponse(authResult.error, 401, 'UNAUTHORIZED');
        }
        return new Response(JSON.stringify({ success: true, user: authResult.user }, null, 2), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // 4. R2 Backup status endpoint (Foundation inspect only, no production backup)
      if (url.pathname === '/api/backup/status' && request.method === 'GET') {
        const r2Status = R2BackupManager.checkR2Binding(env);
        const sampleKey = R2BackupManager.generateBackupKey('full_snapshot', env.ENVIRONMENT, env.SCHEMA_VERSION);
        return new Response(
          JSON.stringify(
            {
              success: true,
              r2Binding: r2Status,
              namingConvention: sampleKey,
              backupDirectoryPattern: 'backups/{env}/{year}/{month}/{timestamp}_{type}_{version}.json.gz',
            },
            null,
            2
          ),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      // 5. 404 for unrecognized foundation paths
      return createErrorResponse(`Route not found: ${url.pathname}`, 404, 'NOT_FOUND');
    } catch (err: any) {
      return createErrorResponse(err?.message || 'Unexpected server error', 500, 'SERVER_ERROR');
    }
  },

  /**
   * Phase 1 Scheduled Cron Trigger Handler for R2 Backups
   * (Runs at midnight UTC 17:00 / Bangkok 00:00)
   */
  async scheduled(event: any, env: Env, ctx: any) {
    console.log('[Worker Cron] Scheduled automated backup trigger received at:', new Date().toISOString());
    // Phase 1: Foundation prepared, production database backup deferred to cutover phase
  },
};
