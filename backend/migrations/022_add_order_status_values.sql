-- Add missing order_status enum values for both bubu and public schemas
DO $$
BEGIN
    -- Public schema order_status enum
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'order_status' AND n.nspname = 'public') THEN
        ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'Processing';
        ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'Delivered';
        ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'Cancelled';
        ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'Failed';
    END IF;

    -- Bubu schema bubu_order_status enum
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'bubu_order_status' AND n.nspname = 'bubu') THEN
        ALTER TYPE bubu.bubu_order_status ADD VALUE IF NOT EXISTS 'Processing';
        ALTER TYPE bubu.bubu_order_status ADD VALUE IF NOT EXISTS 'Delivered';
        ALTER TYPE bubu.bubu_order_status ADD VALUE IF NOT EXISTS 'Cancelled';
        ALTER TYPE bubu.bubu_order_status ADD VALUE IF NOT EXISTS 'Failed';
    END IF;

    -- Also check if order_status exists in bubu schema
    IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'order_status' AND n.nspname = 'bubu') THEN
        ALTER TYPE bubu.order_status ADD VALUE IF NOT EXISTS 'Processing';
        ALTER TYPE bubu.order_status ADD VALUE IF NOT EXISTS 'Delivered';
        ALTER TYPE bubu.order_status ADD VALUE IF NOT EXISTS 'Cancelled';
        ALTER TYPE bubu.order_status ADD VALUE IF NOT EXISTS 'Failed';
    END IF;
END$$;
