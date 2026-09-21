import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('BLOCKED: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for live verification.');
  process.exit(2);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const tables = ['bills','sales','products','catalog_items','stock_ins','system_configs','sync_queue'] as const;
const result: Record<string, any> = { timestamp: new Date().toISOString(), url, checks: {} };
for (const table of tables) {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
  result.checks[table] = error ? { ok: false, error: error.message } : { ok: true, count };
}
const { data: rpcData, error: rpcError } = await db.rpc('get_variant_stock', { p_product_id: '__phase4_probe__', p_size: '__phase4_probe__', p_base: null });
result.checks.atomic_stock_rpc = rpcError ? { ok: false, error: rpcError.message } : { ok: true, data: rpcData };
const failures = Object.values(result.checks).filter((x: any) => x.ok === false);
console.log(JSON.stringify({ ...result, overall: failures.length ? 'FAIL' : 'PASS' }, null, 2));
process.exit(failures.length ? 1 : 0);
