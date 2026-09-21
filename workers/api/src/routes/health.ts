export function handleHealthCheck(env: any): Response {
  const payload = {
    status: 'ok',
    service: 'sale-paint-api',
    phase: 'Phase 1 Foundation',
    environment: env?.ENVIRONMENT || 'production',
    schemaVersion: env?.SCHEMA_VERSION || 'v1',
    capabilities: {
      supabaseConfigured: Boolean(env?.SUPABASE_URL),
      r2BackupConfigured: Boolean(env?.BACKUP_BUCKET),
    },
    serverTime: new Date().toISOString(),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
