CREATE SCHEMA IF NOT EXISTS fiscal;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'nfe'
  ) THEN
    DROP TABLE IF EXISTS public.nfe CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'nfe_item'
  ) THEN
    DROP TABLE IF EXISTS public.nfe_item CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'nfe_item_imposto'
  ) THEN
    DROP TABLE IF EXISTS public.nfe_item_imposto CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'nfe_evento'
  ) THEN
    DROP TABLE IF EXISTS public.nfe_evento CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'nfe_xml'
  ) THEN
    DROP TABLE IF EXISTS public.nfe_xml CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'nfe_importacao_xml'
  ) THEN
    DROP TABLE IF EXISTS public.nfe_importacao_xml CASCADE;
  END IF;
END $$;
