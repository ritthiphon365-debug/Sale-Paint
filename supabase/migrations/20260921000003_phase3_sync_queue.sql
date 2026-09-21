-- ==============================================================================
-- SALE PAINT — PHASE 3: DUAL-WRITE SYNCHRONIZATION QUEUE SCHEMA
-- Reliable, Idempotent, and Durable Sync Pipeline from Firestore to Supabase
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sync_queue (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT UNIQUE NOT NULL,
    operation_type TEXT NOT NULL,         -- 'BILL_AND_SALES', 'UPDATE_SALE', 'DELETE_SALE', 'UPSERT_PRODUCTS', 'DELETE_PRODUCTS', 'UPSERT_CATALOG_ITEMS', 'DELETE_CATALOG_ITEMS', 'UPSERT_STOCK_INS', 'SET_SYSTEM_CONFIG', 'CLEAR_COLLECTION'
    table_name TEXT NOT NULL,             -- 'bills', 'sales', 'products', 'catalog_items', 'stock_ins', 'system_configs'
    record_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER'
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 5,
    last_error TEXT,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance and retrieval indexes for sync queue worker
CREATE INDEX IF NOT EXISTS idx_sync_queue_status_retry ON public.sync_queue(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_idempotency_key ON public.sync_queue(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created_at ON public.sync_queue(created_at DESC);

-- Enable RLS
ALTER TABLE public.sync_queue ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view sync queue status
CREATE POLICY "Allow authenticated read sync_queue"
ON public.sync_queue
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert/update sync queue items
CREATE POLICY "Allow authenticated write sync_queue"
ON public.sync_queue
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
