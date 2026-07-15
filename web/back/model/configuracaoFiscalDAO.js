import crypto from "crypto";
import { TENANT_CONTEXT_SQL } from "../utils/sql.js";
import { previewCertificate } from "../utils/certificatePreview.js";
import MensagemDAO from "./mensagemDAO.js";

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

const parseInteger = (value, { allowNull = false, min = 1, max = null, label = "Campo" } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (allowNull) return null;
    throw new Error(`${label} obrigatório.`);
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || (max !== null && parsed > max)) {
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

const DEFAULT_RESPONSAVEL_TECNICO = {
  cnpj: "66056990000198",
  nome: "jhes sistemas",
  contato: "Jonas Paulino",
  email: "jonaspaulino@jhes.com.br",
  telefone: "819984163086",
  logradouro: "Rua nova Baraunas",
  numero: "451",
  bairro: "nova caruaru",
  cidade: "Caruaru",
  uf: "PE",
};

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
  static async avancarProximoNumeroNfce(client, { tenantId, numeroAtual }) {
    const safeTenantId = Number(tenantId);
    const safeNumeroAtual = Number(numeroAtual);

    if (!Number.isInteger(safeTenantId) || safeTenantId <= 0) {
      throw new Error("Tenant inválido para avanço da numeração NFC-e.");
    }

    if (!Number.isInteger(safeNumeroAtual) || safeNumeroAtual <= 0) {
      return;
    }

    await client.query(
      `
        UPDATE tenant_configuracao_fiscal
        SET proximo_numero_nfce = GREATEST(
          COALESCE(proximo_numero_nfce, 1),
          $2
        )
        WHERE tenant_id = $1
      `,
      [safeTenantId, safeNumeroAtual + 1],
    );
  }

  static async legacyGatewayTableExists(client) {
    const { rows } = await client.query(
      `
        SELECT to_regclass('public.tenant_configuracao_gateway') AS table_name
      `
    );

    return !!rows[0]?.table_name;
  }

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

    const hasLegacyTable = await this.legacyGatewayTableExists(client);

    if (hasLegacyTable) {
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
    }

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
          cfg.ambiente_nfce,
          cfg.nfce_habilitada,
          cfg.serie_nfce_padrao,
          cfg.proximo_numero_nfce,
          cfg.nfce_id_token_csc,
          cfg.nfce_csc_masked,
          cfg.nfce_ind_pres_padrao,
          cfg.ambiente_mdfe,
          cfg.serie_mdfe_padrao,
          cfg.proximo_numero_mdfe,
          cfg.mdfe_habilitado,
          cfg.crt,
          cfg.cnae,
          cfg.natureza_operacao_padrao,
          cfg.nfe_habilitada,
          cfg.observacao,
          cert.nome_arquivo AS certificado_nome_arquivo,
          cert.tamanho_arquivo AS certificado_tamanho_arquivo,
          cert.validade_em AS certificado_validade_em,
          cert.importado_em AS certificado_importado_em,
          cert.atualizado_em AS certificado_atualizado_em,
          logo.nome_arquivo AS logo_nome_arquivo,
          logo.mime_type AS logo_mime_type,
          logo.tamanho_arquivo AS logo_tamanho_arquivo,
          logo.importado_em AS logo_importado_em,
          logo.atualizado_em AS logo_atualizado_em,
          gw.provider AS gateway_provider,
          gw.ambiente AS gateway_ambiente,
          gw.wallet_id AS gateway_wallet_id,
          gw.api_key_masked AS gateway_api_key_masked,
          gw.webhook_auth_token_masked AS gateway_webhook_auth_token_masked,
          gw.gateway_ativo,
          gw.auto_criar_cliente,
          gw.baixa_automatica_pix,
          gw.baixa_automatica_boleto,
          gw.observacao AS gateway_observacao,
          rt.cnpj AS responsavel_tecnico_cnpj,
          rt.nome AS responsavel_tecnico_nome,
          rt.contato AS responsavel_tecnico_contato,
          rt.email AS responsavel_tecnico_email,
          rt.telefone AS responsavel_tecnico_telefone,
          rt.logradouro AS responsavel_tecnico_logradouro,
          rt.numero AS responsavel_tecnico_numero,
          rt.bairro AS responsavel_tecnico_bairro,
          rt.cidade AS responsavel_tecnico_cidade,
          rt.uf AS responsavel_tecnico_uf
        FROM tenant t
        LEFT JOIN tenant_configuracao_fiscal cfg
          ON cfg.tenant_id = t.tenant_id
        LEFT JOIN tenant_certificado_a1 cert
          ON cert.tenant_id = t.tenant_id
        LEFT JOIN tenant_logo logo
          ON logo.tenant_id = t.tenant_id
        LEFT JOIN payments.tenant_configuracao_gateway gw
          ON gw.tenant_id = t.tenant_id
        LEFT JOIN tenant_responsavel_tecnico rt
          ON rt.tenant_id = t.tenant_id
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
        serie_nfe_padrao: Number(row.serie_nfe_padrao ?? 1),
        proximo_numero_nfe: Number(row.proximo_numero_nfe ?? 1),
        ambiente_nfce: row.ambiente_nfce || "2",
        nfce_habilitada: !!row.nfce_habilitada,
        serie_nfce_padrao: Number(row.serie_nfce_padrao ?? 1),
        proximo_numero_nfce: Number(row.proximo_numero_nfce ?? 1),
        nfce_id_token_csc: row.nfce_id_token_csc || "",
        nfce_csc_configurado: !!row.nfce_csc_masked,
        nfce_csc_masked: row.nfce_csc_masked || "",
        nfce_ind_pres_padrao: row.nfce_ind_pres_padrao || "1",
        ambiente_mdfe: row.ambiente_mdfe || "2",
        serie_mdfe_padrao: Number(row.serie_mdfe_padrao ?? 1),
        proximo_numero_mdfe: Number(row.proximo_numero_mdfe ?? 1),
        mdfe_habilitado: row.mdfe_habilitado !== false,
        crt: row.crt || "3",
        cnae: row.cnae || "",
        natureza_operacao_padrao: row.natureza_operacao_padrao || "",
        nfe_habilitada: !!row.nfe_habilitada,
        observacao: row.observacao || "",
      },
      certificado: {
        nome_arquivo: row.certificado_nome_arquivo || "",
        tamanho_arquivo: Number(row.certificado_tamanho_arquivo || 0),
        validade_em: row.certificado_validade_em || null,
        importado_em: row.certificado_importado_em || null,
        atualizado_em: row.certificado_atualizado_em || null,
        configurado: !!row.certificado_nome_arquivo,
      },
      logo: {
        nome_arquivo: row.logo_nome_arquivo || "",
        mime_type: row.logo_mime_type || "",
        tamanho_arquivo: Number(row.logo_tamanho_arquivo || 0),
        importado_em: row.logo_importado_em || null,
        atualizado_em: row.logo_atualizado_em || null,
        configurado: !!row.logo_nome_arquivo,
      },
      responsavel_tecnico: {
        cnpj: row.responsavel_tecnico_cnpj || DEFAULT_RESPONSAVEL_TECNICO.cnpj,
        nome: row.responsavel_tecnico_nome || DEFAULT_RESPONSAVEL_TECNICO.nome,
        contato: row.responsavel_tecnico_contato || DEFAULT_RESPONSAVEL_TECNICO.contato,
        email: row.responsavel_tecnico_email || DEFAULT_RESPONSAVEL_TECNICO.email,
        telefone: row.responsavel_tecnico_telefone || DEFAULT_RESPONSAVEL_TECNICO.telefone,
        logradouro:
          row.responsavel_tecnico_logradouro || DEFAULT_RESPONSAVEL_TECNICO.logradouro,
        numero: row.responsavel_tecnico_numero || DEFAULT_RESPONSAVEL_TECNICO.numero,
        bairro: row.responsavel_tecnico_bairro || DEFAULT_RESPONSAVEL_TECNICO.bairro,
        cidade: row.responsavel_tecnico_cidade || DEFAULT_RESPONSAVEL_TECNICO.cidade,
        uf: row.responsavel_tecnico_uf || DEFAULT_RESPONSAVEL_TECNICO.uf,
      },
      contas: buildGatewayView(gatewayViewRow),
      mensagens: {
        whatsapp: await MensagemDAO.buscarConfiguracaoWhatsApp(client),
      },
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

    const ambienteNfce = normalizeText(payload.ambiente_nfce ?? "2", 1, {
      required: true,
      label: "Ambiente da NFC-e",
    });

    if (!["1", "2"].includes(ambienteNfce)) {
      throw new Error("Ambiente da NFC-e inválido.");
    }

    const ambienteMdfe = normalizeText(payload.ambiente_mdfe ?? "2", 1, {
      required: true,
      label: "Ambiente do MDF-e",
    });

    if (!["1", "2"].includes(ambienteMdfe)) {
      throw new Error("Ambiente do MDF-e inválido.");
    }

    const serieNfePadrao = parseInteger(payload.serie_nfe_padrao, {
      min: 0,
      max: 999,
      label: "Série padrão",
    });

    const proximoNumeroNfe = parseInteger(payload.proximo_numero_nfe, {
      max: 999999999,
      label: "Próximo número da NF-e",
    });

    const serieNfcePadrao = parseInteger(payload.serie_nfce_padrao ?? 1, {
      min: 0,
      max: 999,
      label: "Série padrão do NFC-e",
    });

    const proximoNumeroNfce = parseInteger(payload.proximo_numero_nfce ?? 1, {
      max: 999999999,
      label: "Próximo número do NFC-e",
    });

    const nfceIdTokenCsc = normalizeDigits(payload.nfce_id_token_csc).slice(0, 6);
    const nfceCsc = normalizeText(payload.nfce_csc, null, {
      label: "CSC do NFC-e",
    });
    const nfceIndPresPadrao = normalizeText(payload.nfce_ind_pres_padrao ?? "1", 1, {
      required: true,
      label: "Indicador de presença padrão do NFC-e",
    });

    if (!["0", "1", "2", "3", "4", "5", "9"].includes(nfceIndPresPadrao)) {
      throw new Error("Indicador de presença padrão do NFC-e inválido.");
    }

    if (nfceIdTokenCsc && !/^\d{1,6}$/.test(nfceIdTokenCsc)) {
      throw new Error("ID token CSC do NFC-e inválido.");
    }

    const serieMdfePadrao = parseInteger(payload.serie_mdfe_padrao ?? 1, {
      min: 0,
      max: 999,
      label: "Série padrão do MDF-e",
    });

    const proximoNumeroMdfe = parseInteger(payload.proximo_numero_mdfe ?? 1, {
      max: 999999999,
      label: "Próximo número do MDF-e",
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
    const logo = payload.logo || {};
    const logoNomeArquivo = normalizeText(logo.nome_arquivo, 180, {
      label: "Nome da logo",
    });
    const logoMimeType = normalizeText(logo.mime_type, 80, {
      label: "Tipo da logo",
    });
    const logoConteudoBase64 = normalizeText(logo.conteudo_base64, null, {
      label: "Conteúdo da logo",
    });
    const shouldUpdateResponsavelTecnico = Object.prototype.hasOwnProperty.call(
      payload,
      "responsavel_tecnico"
    );
    let responsavelTecnico = null;

    if (shouldUpdateResponsavelTecnico) {
      const responsavelTecnicoPayload = payload.responsavel_tecnico || {};
      responsavelTecnico = {
        cnpj:
          normalizeDigits(responsavelTecnicoPayload.cnpj) ||
          DEFAULT_RESPONSAVEL_TECNICO.cnpj,
        nome:
          normalizeText(responsavelTecnicoPayload.nome, 150, {
            label: "Nome do responsável técnico",
          }) || DEFAULT_RESPONSAVEL_TECNICO.nome,
        contato:
          normalizeText(responsavelTecnicoPayload.contato, 120, {
            label: "Contato do responsável técnico",
          }) || DEFAULT_RESPONSAVEL_TECNICO.contato,
        email:
          normalizeText(responsavelTecnicoPayload.email, 150, {
            label: "E-mail do responsável técnico",
          }) || DEFAULT_RESPONSAVEL_TECNICO.email,
        telefone:
          normalizeDigits(responsavelTecnicoPayload.telefone) ||
          DEFAULT_RESPONSAVEL_TECNICO.telefone,
        logradouro:
          normalizeText(responsavelTecnicoPayload.logradouro, 180, {
            label: "Logradouro do responsável técnico",
          }) || DEFAULT_RESPONSAVEL_TECNICO.logradouro,
        numero:
          normalizeText(responsavelTecnicoPayload.numero, 20, {
            label: "Número do responsável técnico",
          }) || DEFAULT_RESPONSAVEL_TECNICO.numero,
        bairro:
          normalizeText(responsavelTecnicoPayload.bairro, 100, {
            label: "Bairro do responsável técnico",
          }) || DEFAULT_RESPONSAVEL_TECNICO.bairro,
        cidade:
          normalizeText(responsavelTecnicoPayload.cidade, 100, {
            label: "Cidade do responsável técnico",
          }) || DEFAULT_RESPONSAVEL_TECNICO.cidade,
        uf:
          normalizeText(responsavelTecnicoPayload.uf, 2, {
            label: "UF do responsável técnico",
          }) || DEFAULT_RESPONSAVEL_TECNICO.uf,
      };

      if (!/^\d{14}$/.test(responsavelTecnico.cnpj)) {
        throw new Error("CNPJ do responsável técnico inválido.");
      }

      if (!responsavelTecnico.email.includes("@")) {
        throw new Error("E-mail do responsável técnico inválido.");
      }

      if (responsavelTecnico.telefone.length < 10) {
        throw new Error("Telefone do responsável técnico inválido.");
      }
    }

    return {
      emitente_pessoa_id: emitentePessoaId,
      ambiente_nfe: ambienteNfe,
      serie_nfe_padrao: serieNfePadrao,
      proximo_numero_nfe: proximoNumeroNfe,
      ambiente_nfce: ambienteNfce,
      nfce_habilitada: normalizeBoolean(payload.nfce_habilitada, false),
      serie_nfce_padrao: serieNfcePadrao,
      proximo_numero_nfce: proximoNumeroNfce,
      nfce_id_token_csc: nfceIdTokenCsc,
      nfce_csc: nfceCsc,
      nfce_ind_pres_padrao: nfceIndPresPadrao,
      ambiente_mdfe: ambienteMdfe,
      serie_mdfe_padrao: serieMdfePadrao,
      proximo_numero_mdfe: proximoNumeroMdfe,
      mdfe_habilitado: normalizeBoolean(payload.mdfe_habilitado, true),
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
      logo: {
        nome_arquivo: logoNomeArquivo,
        mime_type: logoMimeType,
        conteudo_base64: logoConteudoBase64,
      },
      shouldUpdateResponsavelTecnico,
      responsavel_tecnico: responsavelTecnico,
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
    const whatsapp = MensagemDAO.normalizarPayloadWhatsApp(
      payload?.mensagens?.whatsapp || {}
    );
    const emitente = await this.obterPessoaEmitente(client, data.emitente_pessoa_id);
    this.validarPessoaEmitente(emitente);

    const shouldUpdateCertificado =
      !!data.certificado.conteudo_base64 ||
      !!data.certificado.senha ||
      !!data.certificado.nome_arquivo;
    const shouldUpdateLogo =
      !!data.logo.conteudo_base64 || !!data.logo.nome_arquivo || !!data.logo.mime_type;

    await client.query("BEGIN");

    try {
      const gatewayAtual = await this.buscarGatewayAtual(client);
      this.validarConfiguracaoContas(contas, gatewayAtual);
      MensagemDAO.validarConfiguracaoWhatsApp(whatsapp);

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
            ambiente_nfce,
            nfce_habilitada,
            serie_nfce_padrao,
            proximo_numero_nfce,
            nfce_id_token_csc,
            nfce_csc_criptografado,
            nfce_csc_masked,
            nfce_ind_pres_padrao,
            ambiente_mdfe,
            serie_mdfe_padrao,
            proximo_numero_mdfe,
            mdfe_habilitado,
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
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16,
            $17,
            $18,
            $19
            ,
            $20
          )
          ON CONFLICT (tenant_id) DO UPDATE
          SET
            ambiente_nfe = EXCLUDED.ambiente_nfe,
            serie_nfe_padrao = EXCLUDED.serie_nfe_padrao,
            proximo_numero_nfe = EXCLUDED.proximo_numero_nfe,
            ambiente_nfce = EXCLUDED.ambiente_nfce,
            nfce_habilitada = EXCLUDED.nfce_habilitada,
            serie_nfce_padrao = EXCLUDED.serie_nfce_padrao,
            proximo_numero_nfce = EXCLUDED.proximo_numero_nfce,
            nfce_id_token_csc = EXCLUDED.nfce_id_token_csc,
            nfce_csc_criptografado = COALESCE(EXCLUDED.nfce_csc_criptografado, tenant_configuracao_fiscal.nfce_csc_criptografado),
            nfce_csc_masked = COALESCE(EXCLUDED.nfce_csc_masked, tenant_configuracao_fiscal.nfce_csc_masked),
            nfce_ind_pres_padrao = EXCLUDED.nfce_ind_pres_padrao,
            ambiente_mdfe = EXCLUDED.ambiente_mdfe,
            serie_mdfe_padrao = EXCLUDED.serie_mdfe_padrao,
            proximo_numero_mdfe = EXCLUDED.proximo_numero_mdfe,
            mdfe_habilitado = EXCLUDED.mdfe_habilitado,
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
          data.ambiente_nfce,
          data.nfce_habilitada,
          data.serie_nfce_padrao,
          data.proximo_numero_nfce,
          data.nfce_id_token_csc || null,
          data.nfce_csc ? encryptSecret(data.nfce_csc) : null,
          data.nfce_csc ? maskSecret(data.nfce_csc, { visibleStart: 3, visibleEnd: 3 }) : null,
          data.nfce_ind_pres_padrao,
          data.ambiente_mdfe,
          data.serie_mdfe_padrao,
          data.proximo_numero_mdfe,
          data.mdfe_habilitado,
          data.crt,
          data.cnae,
          data.natureza_operacao_padrao,
          data.nfe_habilitada,
          data.observacao,
        ]
      );

      if (data.shouldUpdateResponsavelTecnico) {
        await client.query(
          `
            INSERT INTO tenant_responsavel_tecnico (
              tenant_id,
              cnpj,
              nome,
              contato,
              email,
              telefone,
              logradouro,
              numero,
              bairro,
              cidade,
              uf
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
              $10
            )
            ON CONFLICT (tenant_id) DO UPDATE
            SET
              cnpj = EXCLUDED.cnpj,
              nome = EXCLUDED.nome,
              contato = EXCLUDED.contato,
              email = EXCLUDED.email,
              telefone = EXCLUDED.telefone,
              logradouro = EXCLUDED.logradouro,
              numero = EXCLUDED.numero,
              bairro = EXCLUDED.bairro,
              cidade = EXCLUDED.cidade,
              uf = EXCLUDED.uf
          `,
          [
            data.responsavel_tecnico.cnpj,
            data.responsavel_tecnico.nome,
            data.responsavel_tecnico.contato,
            data.responsavel_tecnico.email,
            data.responsavel_tecnico.telefone,
            data.responsavel_tecnico.logradouro,
            data.responsavel_tecnico.numero,
            data.responsavel_tecnico.bairro,
            data.responsavel_tecnico.cidade,
            data.responsavel_tecnico.uf,
          ]
        );
      }

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

        const certificadoPreview = await previewCertificate({
          certificadoBase64: data.certificado.conteudo_base64,
          certificadoSenha: data.certificado.senha,
          scopeKey: `config-fiscal-cert-${Date.now()}`,
        });

        await client.query(
          `
            INSERT INTO tenant_certificado_a1 (
              tenant_id,
              nome_arquivo,
              conteudo_pfx,
              senha_criptografada,
              tamanho_arquivo,
              validade_em,
              importado_em
            )
            VALUES (
              ${TENANT_CONTEXT_SQL},
              $1,
              $2,
              $3,
              $4,
              $5,
              NOW()
            )
            ON CONFLICT (tenant_id) DO UPDATE
            SET
              nome_arquivo = EXCLUDED.nome_arquivo,
              conteudo_pfx = EXCLUDED.conteudo_pfx,
              senha_criptografada = EXCLUDED.senha_criptografada,
              tamanho_arquivo = EXCLUDED.tamanho_arquivo,
              validade_em = EXCLUDED.validade_em,
              importado_em = EXCLUDED.importado_em
          `,
          [
            data.certificado.nome_arquivo,
            buffer,
            encryptSecret(data.certificado.senha),
            buffer.length,
            certificadoPreview.validade_em,
          ]
        );
      }

      if (shouldUpdateLogo) {
        if (!data.logo.nome_arquivo || !data.logo.mime_type || !data.logo.conteudo_base64) {
          throw new Error("Para importar a logo informe arquivo, conteúdo e tipo.");
        }

        if (!String(data.logo.mime_type).startsWith("image/")) {
          throw new Error("A logo precisa ser uma imagem.");
        }

        const buffer = Buffer.from(data.logo.conteudo_base64, "base64");
        if (!buffer.length) {
          throw new Error("Conteúdo da logo inválido.");
        }

        await client.query(
          `
            INSERT INTO tenant_logo (
              tenant_id,
              nome_arquivo,
              mime_type,
              conteudo,
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
              mime_type = EXCLUDED.mime_type,
              conteudo = EXCLUDED.conteudo,
              tamanho_arquivo = EXCLUDED.tamanho_arquivo,
              importado_em = EXCLUDED.importado_em
          `,
          [data.logo.nome_arquivo, data.logo.mime_type, buffer, buffer.length]
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

      await MensagemDAO.salvarConfiguracaoWhatsApp(client, whatsapp);

      await client.query("COMMIT");
      return this.buscar(client);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default ConfiguracaoFiscalDAO;
