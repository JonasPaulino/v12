import { getDb } from "../../db/connection.js";

export function getFiscalConfig() {
  return (
    getDb()
      .prepare(
        `SELECT
          config_id,
          tenant_erp_id,
          ambiente_nfe,
          crt,
          cnae,
          natureza_operacao_padrao,
          nfce_habilitada,
          serie_nfce_padrao,
          proximo_numero_nfce,
          nfce_id_token_csc,
          nfce_csc,
          nfce_ind_pres_padrao,
          emitente_nome_razao,
          emitente_nome_fantasia,
          emitente_cpf_cnpj,
          emitente_inscricao_estadual,
          emitente_inscricao_municipal,
          emitente_email,
          emitente_telefone,
          emitente_cep,
          emitente_logradouro,
          emitente_numero,
          emitente_complemento,
          emitente_bairro,
          emitente_cidade,
          emitente_uf,
          emitente_codigo_ibge,
          emitente_pais,
          responsavel_tecnico_cnpj,
          responsavel_tecnico_nome,
          responsavel_tecnico_contato,
          responsavel_tecnico_email,
          responsavel_tecnico_telefone,
          certificado_nome_arquivo,
          certificado_conteudo_base64,
          certificado_senha,
          sincronizado_em,
          atualizado_em
        FROM fiscal_config
        WHERE config_id = 1`,
      )
      .get() || null
  );
}

export function saveFiscalConfig(payload = {}) {
  const db = getDb();
  const tenantErpId = Number(payload.tenant_erp_id || 0);

  if (!Number.isInteger(tenantErpId) || tenantErpId <= 0) {
    throw new Error("Filial fiscal do NFC-e inválida para o PDV.");
  }

  db.prepare(
    `INSERT INTO fiscal_config (
      config_id,
      tenant_erp_id,
      ambiente_nfe,
      crt,
      cnae,
      natureza_operacao_padrao,
      nfce_habilitada,
      serie_nfce_padrao,
      proximo_numero_nfce,
      nfce_id_token_csc,
      nfce_csc,
      nfce_ind_pres_padrao,
      emitente_nome_razao,
      emitente_nome_fantasia,
      emitente_cpf_cnpj,
      emitente_inscricao_estadual,
      emitente_inscricao_municipal,
      emitente_email,
      emitente_telefone,
      emitente_cep,
      emitente_logradouro,
      emitente_numero,
      emitente_complemento,
      emitente_bairro,
      emitente_cidade,
      emitente_uf,
      emitente_codigo_ibge,
      emitente_pais,
      responsavel_tecnico_cnpj,
      responsavel_tecnico_nome,
      responsavel_tecnico_contato,
      responsavel_tecnico_email,
      responsavel_tecnico_telefone,
      certificado_nome_arquivo,
      certificado_conteudo_base64,
      certificado_senha,
      sincronizado_em,
      atualizado_em
    )
    VALUES (
      1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT(config_id) DO UPDATE SET
      tenant_erp_id = excluded.tenant_erp_id,
      ambiente_nfe = excluded.ambiente_nfe,
      crt = excluded.crt,
      cnae = excluded.cnae,
      natureza_operacao_padrao = excluded.natureza_operacao_padrao,
      nfce_habilitada = excluded.nfce_habilitada,
      serie_nfce_padrao = excluded.serie_nfce_padrao,
      proximo_numero_nfce = excluded.proximo_numero_nfce,
      nfce_id_token_csc = excluded.nfce_id_token_csc,
      nfce_csc = excluded.nfce_csc,
      nfce_ind_pres_padrao = excluded.nfce_ind_pres_padrao,
      emitente_nome_razao = excluded.emitente_nome_razao,
      emitente_nome_fantasia = excluded.emitente_nome_fantasia,
      emitente_cpf_cnpj = excluded.emitente_cpf_cnpj,
      emitente_inscricao_estadual = excluded.emitente_inscricao_estadual,
      emitente_inscricao_municipal = excluded.emitente_inscricao_municipal,
      emitente_email = excluded.emitente_email,
      emitente_telefone = excluded.emitente_telefone,
      emitente_cep = excluded.emitente_cep,
      emitente_logradouro = excluded.emitente_logradouro,
      emitente_numero = excluded.emitente_numero,
      emitente_complemento = excluded.emitente_complemento,
      emitente_bairro = excluded.emitente_bairro,
      emitente_cidade = excluded.emitente_cidade,
      emitente_uf = excluded.emitente_uf,
      emitente_codigo_ibge = excluded.emitente_codigo_ibge,
      emitente_pais = excluded.emitente_pais,
      responsavel_tecnico_cnpj = excluded.responsavel_tecnico_cnpj,
      responsavel_tecnico_nome = excluded.responsavel_tecnico_nome,
      responsavel_tecnico_contato = excluded.responsavel_tecnico_contato,
      responsavel_tecnico_email = excluded.responsavel_tecnico_email,
      responsavel_tecnico_telefone = excluded.responsavel_tecnico_telefone,
      certificado_nome_arquivo = excluded.certificado_nome_arquivo,
      certificado_conteudo_base64 = excluded.certificado_conteudo_base64,
      certificado_senha = excluded.certificado_senha,
      sincronizado_em = CURRENT_TIMESTAMP,
      atualizado_em = CURRENT_TIMESTAMP`,
  ).run(
    tenantErpId,
    payload.ambiente_nfe || "2",
    payload.crt || "3",
    payload.cnae || null,
    payload.natureza_operacao_padrao || "Venda de mercadoria",
    payload.nfce_habilitada ? 1 : 0,
    Number(payload.serie_nfce_padrao || 1),
    Number(payload.proximo_numero_nfce || 1),
    payload.nfce_id_token_csc || null,
    payload.nfce_csc || null,
    payload.nfce_ind_pres_padrao || "1",
    payload.emitente_nome_razao || null,
    payload.emitente_nome_fantasia || null,
    payload.emitente_cpf_cnpj || null,
    payload.emitente_inscricao_estadual || null,
    payload.emitente_inscricao_municipal || null,
    payload.emitente_email || null,
    payload.emitente_telefone || null,
    payload.emitente_cep || null,
    payload.emitente_logradouro || null,
    payload.emitente_numero || null,
    payload.emitente_complemento || null,
    payload.emitente_bairro || null,
    payload.emitente_cidade || null,
    payload.emitente_uf || null,
    payload.emitente_codigo_ibge || null,
    payload.emitente_pais || "Brasil",
    payload.responsavel_tecnico_cnpj || null,
    payload.responsavel_tecnico_nome || null,
    payload.responsavel_tecnico_contato || null,
    payload.responsavel_tecnico_email || null,
    payload.responsavel_tecnico_telefone || null,
    payload.certificado_nome_arquivo || null,
    payload.certificado_conteudo_base64 || null,
    payload.certificado_senha || null,
  );

  return getFiscalConfig();
}

export function clearFiscalConfig() {
  getDb().prepare("DELETE FROM fiscal_config WHERE config_id = 1").run();
}
