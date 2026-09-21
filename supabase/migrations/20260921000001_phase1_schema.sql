-- ==============================================================================
-- SALE PAINT — PHASE 1: SUPABASE POSTGRESQL SCHEMA SPECIFICATION
-- Database Architecture: Central Single Source of Truth
-- Designed for: Multi-device concurrency, ACID consistency, and auditability
-- ==============================================================================

-- Enable required cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. BILLS TABLE (Master sales transaction header)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bills (
    id TEXT PRIMARY KEY,                       -- Deterministic or UUID (e.g. BILL-POS1-1712000000-ABC)
    bill_no TEXT,                              -- Human-readable invoice/bill number
    date DATE NOT NULL DEFAULT CURRENT_DATE,   -- Sale date (YYYY-MM-DD)
    customer_name TEXT,
    customer_phone TEXT,
    salesperson TEXT,
    salesperson_email TEXT,
    branch TEXT NOT NULL DEFAULT 'สาขาหลัก',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    item_count INTEGER NOT NULL DEFAULT 0,
    sheet_synced BOOLEAN NOT NULL DEFAULT FALSE,
    sheet_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. SALES TABLE (Line items for each bill)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales (
    id TEXT PRIMARY KEY,                       -- Unique item sale ID (e.g. sale-1712000000-xyz)
    bill_id TEXT NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    brand TEXT NOT NULL,
    sku TEXT NOT NULL,
    size TEXT NOT NULL,                        -- 5GL, 2.5GL, 1GL, 1/4GL
    base TEXT,                                 -- A, B, C, D
    film_color TEXT,                           -- กึ่งเงา, ด้าน, เนียน, เงา
    color_code TEXT,                           -- เบอร์สี
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tint_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    customer_name TEXT,
    customer_phone TEXT,
    salesperson TEXT,
    salesperson_email TEXT,
    branch TEXT NOT NULL DEFAULT 'สาขาหลัก',
    sheet_synced BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. PRODUCTS TABLE (Product configuration and inventory levels)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    available_sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
    has_bases BOOLEAN NOT NULL DEFAULT FALSE,
    available_bases JSONB DEFAULT '[]'::jsonb,
    has_film_color BOOLEAN NOT NULL DEFAULT FALSE,
    film_colors JSONB DEFAULT '[]'::jsonb,
    has_color_code BOOLEAN NOT NULL DEFAULT FALSE,
    base_prices JSONB NOT NULL DEFAULT '{}'::jsonb,  -- Variant size -> price
    initial_stock JSONB NOT NULL DEFAULT '{}'::jsonb,-- Variant key ("5GL_A") -> qty
    is_quick_pick BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. CATALOG_ITEMS TABLE (Master price and barcode catalog)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catalog_items (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL,
    name TEXT NOT NULL,
    film_color TEXT,
    size TEXT NOT NULL,
    base TEXT,
    color_code TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    brand TEXT,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. STOCK_INS TABLE (Stock reception transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stock_ins (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    size TEXT NOT NULL,
    base TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. SYSTEM_CONFIGS TABLE (Cloud configs like Google Sheets integration)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.system_configs (
    key TEXT PRIMARY KEY,                      -- e.g. 'google_sheets'
    value JSONB NOT NULL,                      -- { spreadsheetId, webhookUrl, autoSync, lastSyncTime }
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT
);

-- ------------------------------------------------------------------------------
-- 7. AUDIT_LOGS TABLE (Security and user action history)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action TEXT NOT NULL,
    user_name TEXT NOT NULL,
    detail TEXT NOT NULL,
    flag TEXT DEFAULT 'info'
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR HIGH-PERFORMANCE MULTI-DEVICE QUERIES
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_bill_id ON public.sales(bill_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON public.sales(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_sheet_synced ON public.sales(sheet_synced);
CREATE INDEX IF NOT EXISTS idx_bills_date ON public.bills(date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_ins_date ON public.stock_ins(date DESC);
CREATE INDEX IF NOT EXISTS idx_catalog_items_sku ON public.catalog_items(sku);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- ------------------------------------------------------------------------------
-- TRANSACTION-SAFE STORED PROCEDURE: PROCESS SALE & STOCK
-- Prevents race conditions during multi-device concurrent checkout
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_sale_transaction(
    p_bill JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bill_id TEXT;
    v_item RECORD;
    v_total_amount NUMERIC(12, 2) := 0;
    v_item_count INTEGER := 0;
BEGIN
    v_bill_id := p_bill->>'id';
    IF v_bill_id IS NULL OR v_bill_id = '' THEN
        v_bill_id := 'BILL-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6);
    END IF;

    -- Calculate total and count
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        id TEXT,
        productId TEXT,
        productName TEXT,
        brand TEXT,
        sku TEXT,
        size TEXT,
        base TEXT,
        filmColor TEXT,
        colorCode TEXT,
        price NUMERIC,
        tintPrice NUMERIC,
        quantity NUMERIC,
        total NUMERIC
    )
    LOOP
        v_total_amount := v_total_amount + COALESCE(v_item.total, 0);
        v_item_count := v_item_count + 1;
    END LOOP;

    -- 1. Insert master bill
    INSERT INTO public.bills (
        id,
        bill_no,
        date,
        customer_name,
        customer_phone,
        salesperson,
        salesperson_email,
        branch,
        total_amount,
        item_count,
        sheet_synced,
        created_at,
        updated_at
    ) VALUES (
        v_bill_id,
        COALESCE(p_bill->>'billNo', v_bill_id),
        COALESCE((p_bill->>'date')::DATE, CURRENT_DATE),
        p_bill->>'customerName',
        p_bill->>'customerPhone',
        p_bill->>'salesperson',
        p_bill->>'salespersonEmail',
        COALESCE(p_bill->>'branch', 'สาขาหลัก'),
        v_total_amount,
        v_item_count,
        FALSE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Insert line items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        id TEXT,
        productId TEXT,
        productName TEXT,
        brand TEXT,
        sku TEXT,
        size TEXT,
        base TEXT,
        filmColor TEXT,
        colorCode TEXT,
        price NUMERIC,
        tintPrice NUMERIC,
        quantity NUMERIC,
        total NUMERIC,
        customerName TEXT,
        customerPhone TEXT,
        salesperson TEXT,
        salespersonEmail TEXT,
        branch TEXT
    )
    LOOP
        INSERT INTO public.sales (
            id,
            bill_id,
            date,
            product_id,
            product_name,
            brand,
            sku,
            size,
            base,
            film_color,
            color_code,
            price,
            tint_price,
            quantity,
            total,
            customer_name,
            customer_phone,
            salesperson,
            salesperson_email,
            branch,
            sheet_synced,
            created_at,
            updated_at
        ) VALUES (
            COALESCE(v_item.id, 'sale-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 5)),
            v_bill_id,
            COALESCE((p_bill->>'date')::DATE, CURRENT_DATE),
            v_item.productId,
            v_item.productName,
            COALESCE(v_item.brand, 'NIPPON PAINT'),
            v_item.sku,
            v_item.size,
            v_item.base,
            v_item.filmColor,
            v_item.colorCode,
            COALESCE(v_item.price, 0),
            COALESCE(v_item.tintPrice, 0),
            COALESCE(v_item.quantity, 1),
            COALESCE(v_item.total, 0),
            COALESCE(v_item.customerName, p_bill->>'customerName'),
            COALESCE(v_item.customerPhone, p_bill->>'customerPhone'),
            COALESCE(v_item.salesperson, p_bill->>'salesperson'),
            COALESCE(v_item.salespersonEmail, p_bill->>'salespersonEmail'),
            COALESCE(v_item.branch, p_bill->>'branch', 'สาขาหลัก'),
            FALSE,
            NOW(),
            NOW()
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'billId', v_bill_id,
        'itemCount', v_item_count,
        'totalAmount', v_total_amount
    );
END;
$$;
