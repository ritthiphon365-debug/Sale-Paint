-- ==============================================================================
-- SALE PAINT — PHASE 4 MIGRATION: ATOMIC STOCK & TRANSACTION SAFETY
-- Prevents lost updates and race conditions during concurrent multi-device sales
-- ==============================================================================

-- 1. Function to compute variant remaining stock atomically inside PostgreSQL
CREATE OR REPLACE FUNCTION public.get_variant_stock(
    p_product_id TEXT,
    p_size TEXT,
    p_base TEXT DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_initial_stock NUMERIC := 0;
    v_total_stock_in NUMERIC := 0;
    v_total_sold NUMERIC := 0;
    v_product_json JSONB;
    v_base_key TEXT;
    v_norm_base TEXT;
BEGIN
    v_norm_base := COALESCE(p_base, 'NONE');

    -- Fetch product initial stock jsonb
    SELECT initial_stock INTO v_product_json
    FROM public.products
    WHERE id = p_product_id;

    IF v_product_json IS NOT NULL THEN
        -- Try specific key "${size}_${base}" then "${size}"
        v_base_key := p_size || '_' || COALESCE(p_base, 'A');
        IF v_product_json ? v_base_key THEN
            v_initial_stock := COALESCE((v_product_json->>v_base_key)::NUMERIC, 0);
        ELSIF v_product_json ? p_size THEN
            v_initial_stock := COALESCE((v_product_json->>p_size)::NUMERIC, 0);
        END IF;
    END IF;

    -- Calculate total stock-in for this variant
    SELECT COALESCE(SUM(quantity), 0) INTO v_total_stock_in
    FROM public.stock_ins
    WHERE product_id = p_product_id
      AND size = p_size
      AND (
        (base IS NULL AND (p_base IS NULL OR p_base = 'NONE')) OR
        (base = p_base)
      );

    -- Calculate total sold for this variant
    SELECT COALESCE(SUM(quantity), 0) INTO v_total_sold
    FROM public.sales
    WHERE product_id = p_product_id
      AND size = p_size
      AND (
        (base IS NULL AND (p_base IS NULL OR p_base = 'NONE')) OR
        (base = p_base)
      );

    RETURN (v_initial_stock + v_total_stock_in - v_total_sold);
END;
$$;

-- 2. Transaction-Safe checkout with atomic stock verification & locking
CREATE OR REPLACE FUNCTION public.execute_atomic_checkout(
    p_bill JSONB,
    p_items JSONB,
    p_allow_oversell BOOLEAN DEFAULT TRUE
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
    v_current_stock NUMERIC;
    v_insufficient_items JSONB := '[]'::JSONB;
BEGIN
    v_bill_id := p_bill->>'id';
    IF v_bill_id IS NULL OR v_bill_id = '' THEN
        v_bill_id := 'BILL-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6);
    END IF;

    -- If oversell is not allowed, acquire row lock on affected products and verify stock
    IF NOT p_allow_oversell THEN
        -- Acquire pessimistic row lock on products to serialize concurrent writes
        PERFORM 1 FROM public.products
        WHERE id IN (
            SELECT productId FROM jsonb_to_recordset(p_items) AS x(productId TEXT)
        )
        FOR UPDATE;

        FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
            productId TEXT,
            productName TEXT,
            size TEXT,
            base TEXT,
            quantity NUMERIC
        )
        LOOP
            v_current_stock := public.get_variant_stock(v_item.productId, v_item.size, v_item.base);
            IF v_current_stock < v_item.quantity THEN
                v_insufficient_items := v_insufficient_items || jsonb_build_object(
                    'productId', v_item.productId,
                    'productName', v_item.productName,
                    'size', v_item.size,
                    'base', v_item.base,
                    'available', v_current_stock,
                    'requested', v_item.quantity
                );
            END IF;
        END LOOP;

        IF jsonb_array_length(v_insufficient_items) > 0 THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error_code', 'INSUFFICIENT_STOCK',
                'message', 'สต็อกสินค้าบางรายการไม่เพียงพอสำหรับการขาย',
                'insufficient_items', v_insufficient_items
            );
        END IF;
    END IF;

    -- Calculate total and count
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        total NUMERIC
    )
    LOOP
        v_total_amount := v_total_amount + COALESCE(v_item.total, 0);
        v_item_count := v_item_count + 1;
    END LOOP;

    -- Insert master bill atomically
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
    ON CONFLICT (id) DO UPDATE SET
        total_amount = EXCLUDED.total_amount,
        item_count = EXCLUDED.item_count,
        updated_at = NOW();

    -- Insert sales line items atomically
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
            COALESCE(v_item.id, 'sale-' || v_bill_id || '-' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 6)),
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
        )
        ON CONFLICT (id) DO NOTHING;
    END LOOP;

    RETURN jsonb_build_object(
        'success', TRUE,
        'bill_id', v_bill_id,
        'item_count', v_item_count,
        'total_amount', v_total_amount
    );
END;
$$;
