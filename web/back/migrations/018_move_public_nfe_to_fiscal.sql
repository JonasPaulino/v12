CREATE SCHEMA IF NOT EXISTS fiscal;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'nfe'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'fiscal'
      AND table_name = 'nfe'
  ) THEN
    ALTER TABLE public.nfe SET SCHEMA fiscal;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'nfe_item'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'fiscal'
      AND table_name = 'nfe_item'
  ) THEN
    ALTER TABLE public.nfe_item SET SCHEMA fiscal;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'nfe_item_imposto'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'fiscal'
      AND table_name = 'nfe_item_imposto'
  ) THEN
    ALTER TABLE public.nfe_item_imposto SET SCHEMA fiscal;
  END IF;
END $$;

DROP INDEX IF EXISTS public.idx_nfe_tenant;
DROP INDEX IF EXISTS public.idx_nfe_item_nfe;
DROP INDEX IF EXISTS public.idx_nfe_item_imposto_nfe;
