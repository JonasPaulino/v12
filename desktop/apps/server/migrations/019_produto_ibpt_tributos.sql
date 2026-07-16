ALTER TABLE produto ADD COLUMN ibpt_aliquota_federal_nacional NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE produto ADD COLUMN ibpt_aliquota_federal_importado NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE produto ADD COLUMN ibpt_aliquota_estadual NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE produto ADD COLUMN ibpt_aliquota_municipal NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE produto ADD COLUMN ibpt_fonte TEXT;
ALTER TABLE produto ADD COLUMN ibpt_chave TEXT;
ALTER TABLE produto ADD COLUMN ibpt_atualizado_em TEXT;
