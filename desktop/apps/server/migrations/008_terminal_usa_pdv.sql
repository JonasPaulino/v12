ALTER TABLE terminal_config ADD COLUMN tenant_usa_pdv INTEGER NOT NULL DEFAULT 1;

UPDATE terminal_config
SET tenant_usa_pdv = 1
WHERE tenant_usa_pdv IS NULL;
