ALTER TABLE fiscal_config
  ADD COLUMN ambiente_nfce TEXT NOT NULL DEFAULT '2';

UPDATE fiscal_config
SET ambiente_nfce = COALESCE(NULLIF(ambiente_nfe, ''), '2')
WHERE ambiente_nfce IS NULL
   OR TRIM(ambiente_nfce) = '';
