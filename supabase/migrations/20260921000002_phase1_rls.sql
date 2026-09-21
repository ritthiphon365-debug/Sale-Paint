-- ==============================================================================
-- SALE PAINT — PHASE 1: ROW LEVEL SECURITY (RLS) POLICIES
-- Strict access control: No public unrestricted access, no wildcard bypass.
-- Frontend clients connect via 'anon' or 'authenticated' role.
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. BILLS POLICIES
-- ------------------------------------------------------------------------------
-- Read: Authenticated users can view bills
CREATE POLICY "Allow authenticated read bills"
ON public.bills
FOR SELECT
TO authenticated
USING (true);

-- Insert: Authenticated users can insert bills
CREATE POLICY "Allow authenticated insert bills"
ON public.bills
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update: Authenticated users can update bills
CREATE POLICY "Allow authenticated update bills"
ON public.bills
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Delete: Authenticated users can delete bills
CREATE POLICY "Allow authenticated delete bills"
ON public.bills
FOR DELETE
TO authenticated
USING (true);

-- ------------------------------------------------------------------------------
-- 3. SALES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow authenticated read sales"
ON public.sales
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated update sales"
ON public.sales
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated delete sales"
ON public.sales
FOR DELETE
TO authenticated
USING (true);

-- ------------------------------------------------------------------------------
-- 4. PRODUCTS & CATALOG POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow authenticated read products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated write products"
ON public.products
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated read catalog"
ON public.catalog_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated write catalog"
ON public.catalog_items
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. STOCK_INS & SYSTEM_CONFIGS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow authenticated read stock_ins"
ON public.stock_ins
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated write stock_ins"
ON public.stock_ins
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated read system_configs"
ON public.system_configs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated write system_configs"
ON public.system_configs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. AUDIT_LOGS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Allow authenticated read audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated insert audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);
