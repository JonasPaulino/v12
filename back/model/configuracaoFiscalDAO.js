import crypto from "crypto";
import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const normalizeText = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    if (required) {
      throw new Error(`${label} obrigatório não informado.`);
    }

    return null;
  }

  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const parseInteger = (value, { allowNull = false, min = 1, label = "Campo" } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (allowNull) return null;
    throw new Error(`${label} obrigatório.`);
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`${label} inválido.`);
  }

  return parsed;
};

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "yes"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no"].includes(normalized)) return false;

  return defaultValue;
};

const normalizeDigits = (value) => String(value ?? "").replace(/\D/g, "");

const maskSecret = (value, { visibleStart = 4, visibleEnd = 4 } = {}) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  if (normalized.length <= visibleStart + visibleEnd) {
    return `${normalized.slice(0, 2)}••••`;
  }

  return `${normalized.slice(0, visibleStart)}••••${normalized.slice(-visibleEnd)}`;
};

const encryptSecret = (text) => {
  if (!text) return null;

  const key = crypto.createHash("sha256").update(String(process.env.CHAVE_TOKEN || "")).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    value: encrypted.toString("base64"),
  });
};

const buildGatewayView = (row) => ({
  provider: row?.gateway_provider || "asaas",
  ambiente: row?.gateway_ambiente || "sandbox",
  wallet_id: row?.gateway_wallet_id || "",
  gateway_ativo: !!row?.gateway_ativo,
  auto_criar_cliente: row?.auto_criar_cliente !== false,
  baixa_automatica_pix: row?.baixa_automatica_pix !== false,
  baixa_automatica_boleto: row?.baixa_automatica_boleto !== false,
  observacao: row?.gateway_observacao || "",
  api_key_configurada: !!row?.gateway_api_key_masked,
  api_key_masked: row?.gateway_api_key_masked || "",
  webhook_auth_token_configurado: !!row?.gateway_webhook_auth_token_masked,
  webhook_auth_token_masked: row?.gateway_webhook_auth_token_masked || "",
});

const mapGatewayRowToViewRow = (row) => ({
  gateway_provider: row?.provider || "asaas",
  gateway_ambiente: row?.ambiente || "sandbox",
  gateway_wallet_id: row?.wallet_id || "",
  gateway_api_key_masked: row?.api_key_masked || "",
  gateway_webhook_auth_token_masked: row?.webhook_auth_token_masked || "",
  gateway_ativo: !!row?.gateway_ativo,
  auto_criar_cliente: row?.auto_criar_cliente !== false,
  baixa_automatica_pix: row?.baixa_automatica_pix !== false,
  baixa_automatica_boleto: row?.baixa_automatica_boleto !== false,
  gateway_observacao: row?.observacao || "",
});

class ConfiguracaoFiscalDAO {
  static async buscarGatewayAtualCompat(client) {
    const paymentsRows = await client.query(
      `
        SELECT
          provider,
          ambiente,
          wallet_id,
          api_key_criptografada,
          api_key_masked,
          webhook_auth_token_criptografada,
          webhook_auth_token_masked,
          gateway_ativo,
          auto_criar_cliente,
          baixa_automatica_pix,
          baixa_automatica_boleto,
          observacao
        FROM payments.tenant_configuracao_gateway
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `
    );

    const paymentsRow = paymentsRows.rows[0] || null;
    if (
      paymentsRow &&
      (
        paymentsRow.gateway_ativo ||
        paymentsRow.api_key_masked ||
        paymentsRow.webhook_auth_token_masked ||
        paymentsRow.wallet_id ||
        paymentsRow.observacao
      )
    ) {
      return paymentsRow;
    }

    try {
      const legacyRows = await client.query(
        `
          SELECT
            provider,
            ambiente,
            wallet_id,
            api_key_criptografada,
            api_key_masked,
            webhook_auth_token_criptografada,
            webhook_auth_token_masked,
            gateway_ativo,
            auto_criar_cliente,
            baixa_automatica_pix,
            baixa_automatica_boleto,
            observacao
          FROM public.tenant_configuracao_gateway
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          LIMIT 1
        `
      );

      const legacyRow = legacyRows.rows[0] || null;
      if (legacyRow) {
        return legacyRow;
      }
    } catch {}

    return paymentsRow;
  }

  static async listarPessoasSelect(client, { search = "", limit = 20 } = {}) {
    const values = [];
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE pt.tenant_id = ${TENANT_CONTEXT_SQL}
        AND pt.ativo = TRUE
        AND p.pessoa_excluido = FALSE
        AND p.pessoa_ativo = TRUE
        AND p.pessoa_tipo = 'J'
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          LOWER(unaccent(p.pessoa_nome_razao)) LIKE LOWER(unaccent($${values.length}))
          OR LOWER(unaccent(COALESCE(p.pessoa_nome_fantasia, ''))) LIKE LOWER(unaccent($${values.length}))
          OR LOWER(unaccent(COALESCE(p.pessoa_cpf_cnpj, ''))) LIKE LOWER(unaccent($${values.length}))
        )
      `;
    }

    values.push(safeLimit);

    const { rows } = await client.query(
      `
        SELECT
          p.pessoa_id,
          p.pessoa_tipo,
          p.pessoa_nome_razao,
          p.pessoa_nome_fantasia,
          p.pessoa_cpf_cnpj,
          p.pessoa_inscricao_estadual,
          p.pessoa_inscricao_municipal,
          p.pessoa_email,
          p.pessoa_telefone,
          pe.cep,
          pe.logradouro,
          pe.numero,
          pe.complemento,
          pe.bairro,
          pe.cidade,
          pe.uf,
          pe.codigo_ibge,
          pe.pais
        FROM pessoa p
        JOIN pessoa_tenant pt
          ON pt.pessoa_id = p.pessoa_id
        LEFT JOIN pessoa_endereco pe
          ON pe.pessoa_id = p.pessoa_id
         AND pe.tenant_id = ${TENANT_CONTEXT_SQL}
         AND pe.endereco_tipo = 'principal'
        ${where}
        ORDER BY p.pessoa_nome_razao
        LIMIT $${values.length}
      `,
      values
    );

    return rows;
  }

  static async obterPessoaEmitente(client, pessoaId) {
    if (!pessoaId) return null;

    const { rows } = await client.query(
      `
        SELECT
          p.pessoa_id,
          p.pessoa_tipo,
          p.pessoa_nome_razao,
          p.pessoa_nome_fantasia,
          p.pessoa_cpf_cnpj,
          p.pessoa_inscricao_estadual,
          p.pessoa_inscricao_municipal,
          p.pessoa_email,
          p.pessoa_telefone,
          pe.cep,
          pe.logradouro,
          pe.numero,
          pe.complemento,
          pe.bairro,
          pe.cidade,
          pe.uf,
          pe.codigo_ibge,
          pe.pais
        FROM pessoa p
        JOIN pessoa_tenant pt
          ON pt.pessoa_id = p.pessoa_id
         AND pt.tenant_id = ${TENANT_CONTEXT_SQL}
         AND pt.ativo = TRUE
        LEFT JOIN pessoa_endereco pe
          ON pe.pessoa_id = p.pessoa_id
         AND pe.tenant_id = ${TENANT_CONTEXT_SQL}
         AND pe.endereco_tipo = 'principal'
        WHERE p.pessoa_id = $1
          AND p.pessoa_excluido = FALSE
          AND p.pessoa_ativo = TRUE
        LIMIT 1
      `,
      [pessoaId]
    );

    return rows[0] || null;
  }

  static validarPessoaEmitente(pessoa) {
    if (!pessoa) {
      throw new Error("Selecione a pessoa emitente da filial.");
    }

    if (pessoa.pessoa_tipo !== "J") {
      throw new Error("A pessoa emitente da filial deve ser pessoa jurídica.");
    }

    if (!normalizeDigits(pessoa.pessoa_cpf_cnpj)) {
      throw new Error("A pessoa emitente precisa ter CNPJ preenchido.");
    }

    if (!String(pessoa.pessoa_inscricao_estadual || "").trim()) {
      throw new Error(
        "A pessoa emitente precisa ter inscrição estadual preenchida ou o literal ISENTO."
      );
    }

    const missingAddress = [
      ["cep", "CEP"],
      ["logradouro", "logradouro"],
      ["numero", "numero"],
      ["bairro", "bairro"],
      ["cidade", "cidade"],
      ["uf", "UF"],
      ["codigo_ibge", "codigo IBGE"],
    ].find(([key]) => !String(pessoa[key] || "").trim());

    if (missingAddress) {
      throw new Error(`A pessoa emitente precisa ter ${missingAddress[1]} no endereço principal.`);
    }
  }

  static async buscar(client) {
    const { rows } = await client.query(
      `
        SELECT
          t.tenant_id,
          t.tenant_nome,
          t.pessoa_id,
          cfg.ambiente_nfe,
          cfg.serie_nfe_padrao,
          cfg.proximo_numero_nfe,
          cfg.crt,
          cfg.cnae,
          cfg.natureza_operacao_padrao,
          cfg.nfe_habilitada,
          cfg.observacao,
          cert.nome_arquivo AS certificado_nome_arquivo,
          cert.tamanho_arquivo AS certificado_tamanho_arquivo,
          cert.importado_em AS certificado_importado_em,
          cert.atualizado_em AS certificado_atualizado_em,
          gw.provider AS gateway_provider,
          gw.ambiente AS gateway_ambiente,
          gw.wallet_id AS gateway_wallet_id,
          gw.api_key_masked AS gateway_api_key_masked,
          gw.webhook_auth_token_masked AS gateway_webhook_auth_token_masked,
          gw.gateway_ativo,
          gw.auto_criar_cliente,
          gw.baixa_automatica_pix,
          gw.baixa_automatica_boleto,
          gw.observacao AS gateway_observacao
        FROM tenant t
        LEFT JOIN tenant_configuracao_fiscal cfg
          ON cfg.tenant_id = t.tenant_id
        LEFT JOIN tenant_certificado_a1 cert
          ON cert.tenant_id = t.tenant_id
        LEFT JOIN payments.tenant_configuracao_gateway gw
          ON gw.tenant_id = t.tenant_id
        WHERE t.tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `
    );

    const row = rows[0];
    if (!row) return null;

    const emitente = await this.obterPessoaEmitente(client, row.pessoa_id);
    const gatewayAtual = await this.buscarGatewayAtualCompat(client);
    const gatewayViewRow = gatewayAtual ? mapGatewayRowToViewRow(gatewayAtual) : null;

    return {
      tenant: {
        tenant_id: row.tenant_id,
        tenant_nome: row.tenant_nome,
        pessoa_id: row.pessoa_id,
      },
      emitente,
      fiscal: {
        ambiente_nfe: row.ambiente_nfe || "2",
        serie_nfe_padrao: Number(row.serie_nfe_padrao || 1),
        proximo_numero_nfe: Number(row.proximo_numero_nfe || 1),
        crt: row.crt || "3",
        cnae: row.cnae || "",
        natureza_operacao_padrao: row.natureza_operacao_padrao || "",
        nfe_habilitada: !!row.nfe_habilitada,
        observacao: row.observacao || "",
      },
      certificado: {
        nome_arquivo: row.certificado_nome_arquivo || "",
        tamanho_arquivo: Number(row.certificado_tamanho_arquivo || 0),
        importado_em: row.certificado_importado_em || null,
        atualizado_em: row.certificado_atualizado_em || null,
        configurado: !!row.certificado_nome_arquivo,
      },
      contas: buildGatewayView(gatewayViewRow),
    };
  }

  static normalizarPayload(payload = {}) {
    const emitentePessoaId = parseInteger(payload.emitente_pessoa_id, {
      label: "Pessoa emitente",
    });

    const ambienteNfe = normalizeText(payload.ambiente_nfe, 1, {
      required: true,
      label: "Ambiente da NF-e",
    });

    const crt = normalizeText(payload.crt, 1, {
      required: true,
      label: "CRT",
    });

    if (!["1", "2", "3"].includes(crt)) {
      throw new Error("CRT inválido.");
    }

    if (!["1", "2"].includes(ambienteNfe)) {
      throw new Error("Ambiente da NF-e inválido.");
    }

    const serieNfePadrao = parseInteger(payload.serie_nfe_padrao, {
      label: "Série padrão",
    });

    const proximoNumeroNfe = parseInteger(payload.proximo_numero_nfe, {
      label: "Próximo número da NF-e",
    });

    const certificado = payload.certificado || {};
    const certificadoNomeArquivo = normalizeText(certificado.nome_arquivo, 180, {
      label: "Nome do certificado",
    });
    const certificadoSenha = normalizeText(certificado.senha, 180, {
      label: "Senha do certificado",
    });
    const certificadoConteudoBase64 = normalizeText(certificado.conteudo_base64, null, {
      label: "Conteúdo do certificado",
    });

    return {
      emitente_pessoa_id: emitentePessoaId,
      ambiente_nfe: ambienteNfe,
      serie_nfe_padrao: serieNfePadrao,
      proximo_numero_nfe: proximoNumeroNfe,
      crt,
      cnae: normalizeText(payload.cnae, 7, { label: "CNAE" }),
      natureza_operacao_padrao: normalizeText(payload.natureza_operacao_padrao, 120, {
        required: true,
        label: "Natureza de operação padrão",
      }),
      nfe_habilitada: normalizeBoolean(payload.nfe_habilitada, false),
      observacao: normalizeText(payload.observacao, null),
      certificado: {
        nome_arquivo: certificadoNomeArquivo,
        senha: certificadoSenha,
        conteudo_base64: certificadoConteudoBase64,
      },
    };
  }

  static normalizarPayloadContas(payload = {}) {
    const provider = normalizeText(payload.provider, 30, {
      required: true,
      label: "Provider do gateway",
    });

    const ambiente = normalizeText(payload.ambiente, 20, {
      required: true,
      label: "Ambiente do gateway",
    });

    if (!["asaas"].includes(provider)) {
      throw new Error("Provider do gateway inválido.");
    }

    if (!["sandbox", "production"].includes(ambiente)) {
      throw new Error("Ambiente do gateway inválido.");
    }

    return {
      provider,
      ambiente,
      wallet_id: normalizeText(payload.wallet_id, 120, {
        label: "Wallet ID",
      }),
      gateway_ativo: normalizeBoolean(payload.gateway_ativo, false),
      auto_criar_cliente: normalizeBoolean(payload.auto_criar_cliente, true),
      baixa_automatica_pix: normalizeBoolean(payload.baixa_automatica_pix, true),
      baixa_automatica_boleto: normalizeBoolean(payload.baixa_automatica_boleto, true),
      observacao: normalizeText(payload.observacao, null, {
        label: "Observação do gateway",
      }),
      api_key: normalizeText(payload.api_key, null, {
        label: "API key do gateway",
      }),
      webhook_auth_token: normalizeText(payload.webhook_auth_token, null, {
        label: "Token do webhook",
      }),
    };
  }

  static async buscarGatewayAtual(client) {
    return this.buscarGatewayAtualCompat(client);
  }

  static validarConfiguracaoContas(data, currentRow) {
    const hasApiKey = !!(data.api_key || currentRow?.api_key_criptografada);
    const hasWebhookToken = !!(
      data.webhook_auth_token || currentRow?.webhook_auth_token_criptografada
    );

    if (data.gateway_ativo && !hasApiKey) {
      throw new Error("Informe a API key para ativar a integração de contas.");
    }

    if (data.gateway_ativo && !hasWebhookToken) {
      throw new Error("Informe o token do webhook para ativar a integração de contas.");
    }
  }

  static async salvar(client, payload = {}) {
    const data = this.normalizarPayload(payload);
    const contas = this.normalizarPayloadContas(payload.contas || {});
    const emitente = await this.obterPessoaEmitente(client, data.emitente_pessoa_id);
    this.validarPessoaEmitente(emitente);

    const shouldUpdateCertificado =
      !!data.certificado.conteudo_base64 ||
      !!data.certificado.senha ||
      !!data.certificado.nome_arquivo;

    await client.query("BEGIN");

    try {
      const gatewayAtual = await this.buscarGatewayAtual(client);
      this.validarConfiguracaoContas(contas, gatewayAtual);

      await client.query(
        `
          UPDATE tenant
          SET pessoa_id = $1
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [data.emitente_pessoa_id]
      );

      await client.query(
        `
          INSERT INTO tenant_configuracao_fiscal (
            tenant_id,
            ambiente_nfe,
            serie_nfe_padrao,
            proximo_numero_nfe,
            crt,
            cnae,
            natureza_operacao_padrao,
            nfe_habilitada,
            observacao
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          )
          ON CONFLICT (tenant_id) DO UPDATE
          SET
            ambiente_nfe = EXCLUDED.ambiente_nfe,
            serie_nfe_padrao = EXCLUDED.serie_nfe_padrao,
            proximo_numero_nfe = EXCLUDED.proximo_numero_nfe,
            crt = EXCLUDED.crt,
            cnae = EXCLUDED.cnae,
            natureza_operacao_padrao = EXCLUDED.natureza_operacao_padrao,
            nfe_habilitada = EXCLUDED.nfe_habilitada,
            observacao = EXCLUDED.observacao
        `,
        [
          data.ambiente_nfe,
          data.serie_nfe_padrao,
          data.proximo_numero_nfe,
          data.crt,
          data.cnae,
          data.natureza_operacao_padrao,
          data.nfe_habilitada,
          data.observacao,
        ]
      );

      if (shouldUpdateCertificado) {
        if (
          !data.certificado.nome_arquivo ||
          !data.certificado.senha ||
          !data.certificado.conteudo_base64
        ) {
          throw new Error(
            "Para importar o certificado A1 informe arquivo, conteúdo e senha."
          );
        }

        const buffer = Buffer.from(data.certificado.conteudo_base64, "base64");
        if (!buffer.length) {
          throw new Error("Conteúdo do certificado A1 inválido.");
        }

        await client.query(
          `
            INSERT INTO tenant_certificado_a1 (
              tenant_id,
              nome_arquivo,
              conteudo_pfx,
              senha_criptografada,
              tamanho_arquivo,
              importado_em
            )
            VALUES (
              ${TENANT_CONTEXT_SQL},
              $1,
              $2,
              $3,
              $4,
              NOW()
            )
            ON CONFLICT (tenant_id) DO UPDATE
            SET
              nome_arquivo = EXCLUDED.nome_arquivo,
              conteudo_pfx = EXCLUDED.conteudo_pfx,
              senha_criptografada = EXCLUDED.senha_criptografada,
              tamanho_arquivo = EXCLUDED.tamanho_arquivo,
              importado_em = EXCLUDED.importado_em
          `,
          [
            data.certificado.nome_arquivo,
            buffer,
            encryptSecret(data.certificado.senha),
            buffer.length,
          ]
        );
      }

      await client.query(
        `
          INSERT INTO payments.tenant_configuracao_gateway AS gateway (
            tenant_id,
            provider,
            ambiente,
            wallet_id,
            api_key_criptografada,
            api_key_masked,
            webhook_auth_token_criptografada,
            webhook_auth_token_masked,
            gateway_ativo,
            auto_criar_cliente,
            baixa_automatica_pix,
            baixa_automatica_boleto,
            observacao
          )
          VALUES (
            ${TENANT_CONTEXT_SQL},
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12
          )
          ON CONFLICT (tenant_id) DO UPDATE
          SET
            provider = EXCLUDED.provider,
            ambiente = EXCLUDED.ambiente,
            wallet_id = EXCLUDED.wallet_id,
            api_key_criptografada = COALESCE(EXCLUDED.api_key_criptografada, gateway.api_key_criptografada),
            api_key_masked = COALESCE(EXCLUDED.api_key_masked, gateway.api_key_masked),
            webhook_auth_token_criptografada = COALESCE(EXCLUDED.webhook_auth_token_criptografada, gateway.webhook_auth_token_criptografada),
            webhook_auth_token_masked = COALESCE(EXCLUDED.webhook_auth_token_masked, gateway.webhook_auth_token_masked),
            gateway_ativo = EXCLUDED.gateway_ativo,
            auto_criar_cliente = EXCLUDED.auto_criar_cliente,
            baixa_automatica_pix = EXCLUDED.baixa_automatica_pix,
            baixa_automatica_boleto = EXCLUDED.baixa_automatica_boleto,
            observacao = EXCLUDED.observacao
        `,
        [
          contas.provider,
          contas.ambiente,
          contas.wallet_id,
          contas.api_key ? encryptSecret(contas.api_key) : null,
          contas.api_key ? maskSecret(contas.api_key) : null,
          contas.webhook_auth_token ? encryptSecret(contas.webhook_auth_token) : null,
          contas.webhook_auth_token ? maskSecret(contas.webhook_auth_token) : null,
          contas.gateway_ativo,
          contas.auto_criar_cliente,
          contas.baixa_automatica_pix,
          contas.baixa_automatica_boleto,
          contas.observacao,
        ]
      );

      await client.query("COMMIT");
      return this.buscar(client);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default ConfiguracaoFiscalDAO;
