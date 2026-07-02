import crypto from "crypto";
import { hashPassword } from "../utils/password.js";
import { previewCertificate } from "../utils/certificatePreview.js";

const normalizeText = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    if (required) throw new Error(`${label} obrigatório.`);
    return null;
  }

  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const normalizeDigits = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    if (required) throw new Error(`${label} obrigatório.`);
    return null;
  }

  return maxLength ? digits.slice(0, maxLength) : digits;
};

const parseInteger = (value, { required = false, min = 1, max = null, label = "Campo" } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`${label} obrigatório.`);
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min || (max !== null && parsed > max)) {
    throw new Error(`${label} inválido.`);
  }

  return parsed;
};

const parseDecimal = (value, { required = false, min = 0, label = "Campo" } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`${label} obrigatório.`);
    return null;
  }

  const raw = String(value).trim();
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < min) {
    throw new Error(`${label} inválido.`);
  }

  return Number(parsed.toFixed(2));
};

const parseDateOnly = (value, { required = false, label = "Data" } = {}) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    if (required) throw new Error(`${label} obrigatória.`);
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error(`${label} inválida.`);
  }

  return normalized;
};

const addMonths = (dateValue, months) => {
  const [year, month, day] = String(dateValue).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCMonth(date.getUTCMonth() + months);

  return date.toISOString().slice(0, 10);
};

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

const buildUniqueTenantSlug = async (client, baseValue) => {
  const baseSlug = slugify(baseValue) || `filial-${Date.now()}`;
  let currentSlug = baseSlug;
  let suffix = 1;

  while (true) {
    const { rows } = await client.query(
      `
        SELECT 1
        FROM tenant
        WHERE tenant_slug = $1
        LIMIT 1
      `,
      [currentSlug]
    );

    if (!rows[0]) return currentSlug;

    suffix += 1;
    currentSlug = `${baseSlug.slice(0, 64)}-${suffix}`;
  }
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

const seedCondicoesPagamento = async (client, tenantId) => {
  await client.query(
    `
      INSERT INTO financeiro_condicao_pagamento (
        tenant_id,
        descricao,
        tipo,
        quantidade_parcelas,
        dias_primeiro_vencimento,
        intervalo_dias,
        percentual_entrada,
        gera_boleto,
        ativo,
        padrao
      )
      VALUES
        ($1, 'A vista', 'receber', 1, 0, 30, 0, FALSE, TRUE, TRUE),
        ($1, '30 dias', 'receber', 1, 30, 30, 0, FALSE, TRUE, FALSE),
        ($1, '2x 30/60', 'receber', 2, 30, 30, 0, FALSE, TRUE, FALSE),
        ($1, '3x 30/60/90', 'receber', 3, 30, 30, 0, FALSE, TRUE, FALSE),
        ($1, 'Boleto à vista', 'receber', 1, 0, 30, 0, TRUE, TRUE, FALSE),
        ($1, 'Boleto 30 dias', 'receber', 1, 30, 30, 0, TRUE, TRUE, FALSE),
        ($1, 'Boleto 2x 30/60', 'receber', 2, 30, 30, 0, TRUE, TRUE, FALSE),
        ($1, 'Boleto 3x 30/60/90', 'receber', 3, 30, 30, 0, TRUE, TRUE, FALSE),
        ($1, 'A vista fornecedor', 'pagar', 1, 0, 30, 0, FALSE, TRUE, FALSE)
    `,
    [tenantId]
  );
};

const seedFormasPagamento = async (client, tenantId) => {
  await client.query(
    `
      INSERT INTO financeiro_forma_pagamento (
        tenant_id,
        descricao,
        tipo,
        ativo,
        padrao,
        ordem
      )
      VALUES
        ($1, 'Dinheiro', 'ambos', TRUE, TRUE, 1),
        ($1, 'Pix', 'ambos', TRUE, FALSE, 2),
        ($1, 'Cartao de debito', 'receber', TRUE, FALSE, 3),
        ($1, 'Cartao de credito', 'receber', TRUE, FALSE, 4),
        ($1, 'Transferencia', 'ambos', TRUE, FALSE, 5)
    `,
    [tenantId]
  );
};

const upsertPessoaGestaoV12 = async (client, empresa) => {
  const documento = normalizeDigits(empresa.cnpj, 14, {
    required: true,
    label: "CNPJ",
  });

  const existingResult = await client.query(
    `
      SELECT pessoa_id
      FROM gestao.pessoa
      WHERE cpf_cnpj = $1
        AND excluido = FALSE
      LIMIT 1
    `,
    [documento]
  );

  let pessoaGestaoId = Number(existingResult.rows[0]?.pessoa_id || 0);

  if (pessoaGestaoId) {
    await client.query(
      `
        UPDATE gestao.pessoa
        SET
          pessoa_tipo = 'J',
          nome_razao = $2,
          nome_fantasia = $3,
          cpf_cnpj = $4,
          inscricao_estadual = $5,
          inscricao_municipal = $6,
          email = $7,
          telefone = $8,
          ativo = TRUE
        WHERE pessoa_id = $1
      `,
      [
        pessoaGestaoId,
        empresa.nome_razao,
        empresa.nome_fantasia,
        documento,
        empresa.inscricao_estadual,
        empresa.inscricao_municipal,
        empresa.email,
        empresa.telefone,
      ]
    );
  } else {
    const pessoaResult = await client.query(
      `
        INSERT INTO gestao.pessoa (
          pessoa_tipo,
          nome_razao,
          nome_fantasia,
          cpf_cnpj,
          inscricao_estadual,
          inscricao_municipal,
          email,
          telefone,
          ativo,
          excluido
        )
        VALUES ('J', $1, $2, $3, $4, $5, $6, $7, TRUE, FALSE)
        RETURNING pessoa_id
      `,
      [
        empresa.nome_razao,
        empresa.nome_fantasia,
        documento,
        empresa.inscricao_estadual,
        empresa.inscricao_municipal,
        empresa.email,
        empresa.telefone,
      ]
    );

    pessoaGestaoId = Number(pessoaResult.rows[0].pessoa_id);
  }

  await client.query(
    `
      INSERT INTO gestao.pessoa_endereco (
        pessoa_id,
        endereco_tipo,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        codigo_ibge,
        pais
      )
      VALUES ($1, 'principal', $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (pessoa_id, endereco_tipo) DO UPDATE
      SET
        cep = EXCLUDED.cep,
        logradouro = EXCLUDED.logradouro,
        numero = EXCLUDED.numero,
        complemento = EXCLUDED.complemento,
        bairro = EXCLUDED.bairro,
        cidade = EXCLUDED.cidade,
        uf = EXCLUDED.uf,
        codigo_ibge = EXCLUDED.codigo_ibge,
        pais = EXCLUDED.pais
    `,
    [
      pessoaGestaoId,
      empresa.cep,
      empresa.logradouro,
      empresa.numero,
      empresa.complemento,
      empresa.bairro,
      empresa.cidade,
      empresa.uf,
      empresa.codigo_ibge,
      empresa.pais,
    ]
  );

  return pessoaGestaoId;
};

const criarContratoGestaoV12 = async (
  client,
  tenantId,
  pessoaGestaoId,
  financeiro,
  usuarioCriadorId
) => {
  if (!financeiro?.criar_contrato) return null;

  const contratoResult = await client.query(
    `
      INSERT INTO gestao.cliente_contrato (
        tenant_id,
        pessoa_id,
        plano_nome,
        ciclo,
        forma_cobranca,
        valor_mensal,
        quantidade_parcelas,
        dia_vencimento,
        primeiro_vencimento,
        juros_mora_percentual,
        multa_atraso_percentual,
        bloquear_apos_dias,
        observacao,
        criado_por
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING contrato_id
    `,
    [
      tenantId,
      pessoaGestaoId,
      financeiro.plano_nome,
      financeiro.ciclo,
      financeiro.forma_cobranca,
      financeiro.valor_mensal,
      financeiro.quantidade_parcelas,
      financeiro.dia_vencimento,
      financeiro.primeiro_vencimento,
      financeiro.juros_mora_percentual,
      financeiro.multa_atraso_percentual,
      financeiro.bloquear_apos_dias,
      financeiro.observacao,
      usuarioCriadorId,
    ]
  );

  const contratoId = Number(contratoResult.rows[0].contrato_id);

  for (let index = 0; index < financeiro.quantidade_parcelas; index += 1) {
    const numeroParcela = index + 1;
    const vencimento = addMonths(financeiro.primeiro_vencimento, index);

    await client.query(
      `
        INSERT INTO gestao.cliente_parcela (
          contrato_id,
          tenant_id,
          numero_parcela,
          descricao,
          forma_cobranca,
          valor,
          vencimento
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        contratoId,
        tenantId,
        numeroParcela,
        `Mensalidade V12 ERP ${numeroParcela}/${financeiro.quantidade_parcelas}`,
        financeiro.forma_cobranca,
        financeiro.valor_mensal,
        vencimento,
      ]
    );
  }

  return contratoId;
};

class TenantSetupDAO {
  static async obterFilialPorId(client, tenantId) {
    const { rows } = await client.query(
      `
        SELECT
          t.tenant_id,
          t.tenant_nome,
          t.tenant_slug,
          t.tenant_documento,
          t.tenant_ativo,
          t.pessoa_id,
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
          pe.pais,
          cfg.ambiente_nfe,
          cfg.serie_nfe_padrao,
          cfg.proximo_numero_nfe,
          cfg.crt,
          cfg.cnae,
          cfg.natureza_operacao_padrao,
          cert.nome_arquivo AS certificado_nome_arquivo,
          cert.tamanho_arquivo AS certificado_tamanho_arquivo,
          cert.validade_em AS certificado_validade_em,
          cert.importado_em AS certificado_importado_em,
          logo.nome_arquivo AS logo_nome_arquivo,
          logo.mime_type AS logo_mime_type,
          logo.tamanho_arquivo AS logo_tamanho_arquivo,
          logo.importado_em AS logo_importado_em,
          (
            cert.conteudo_pfx IS NOT NULL
            AND cert.senha_criptografada IS NOT NULL
          ) AS certificado_configurado
        FROM tenant t
        LEFT JOIN pessoa p ON p.pessoa_id = t.pessoa_id
        LEFT JOIN LATERAL (
          SELECT *
          FROM pessoa_endereco
          WHERE pessoa_id = t.pessoa_id
            AND endereco_tipo = 'principal'
          ORDER BY atualizado_em DESC, criado_em DESC
          LIMIT 1
        ) pe ON TRUE
        LEFT JOIN tenant_configuracao_fiscal cfg ON cfg.tenant_id = t.tenant_id
        LEFT JOIN tenant_certificado_a1 cert ON cert.tenant_id = t.tenant_id
        LEFT JOIN tenant_logo logo ON logo.tenant_id = t.tenant_id
        WHERE t.tenant_id = $1
        LIMIT 1
      `,
      [tenantId]
    );

    const row = rows[0];
    if (!row) return null;

    return {
      tenant_id: row.tenant_id,
      tenant_nome: row.tenant_nome,
      tenant_slug: row.tenant_slug,
      tenant_documento: row.tenant_documento,
      tenant_ativo: row.tenant_ativo,
      pessoa_id: row.pessoa_id,
      empresa: {
        tenant_nome: row.tenant_nome || "",
        nome_razao: row.pessoa_nome_razao || "",
        nome_fantasia: row.pessoa_nome_fantasia || "",
        cnpj: row.pessoa_cpf_cnpj || row.tenant_documento || "",
        inscricao_estadual: row.pessoa_inscricao_estadual || "",
        inscricao_municipal: row.pessoa_inscricao_municipal || "",
        email: row.pessoa_email || "",
        telefone: row.pessoa_telefone || "",
        cep: row.cep || "",
        logradouro: row.logradouro || "",
        numero: row.numero || "",
        complemento: row.complemento || "",
        bairro: row.bairro || "",
        cidade: row.cidade || "",
        uf: row.uf || "",
        codigo_ibge: row.codigo_ibge || "",
        pais: row.pais || "Brasil",
      },
      fiscal: {
        ambiente_nfe: row.ambiente_nfe || "2",
        serie_nfe_padrao: Number(row.serie_nfe_padrao ?? 1),
        proximo_numero_nfe: Number(row.proximo_numero_nfe ?? 1),
        crt: row.crt || "3",
        cnae: row.cnae || "",
        natureza_operacao_padrao: row.natureza_operacao_padrao || "Venda de mercadoria",
      },
      certificado: {
        configurado: !!row.certificado_configurado,
        nome_arquivo: row.certificado_nome_arquivo || "",
        tamanho_arquivo: Number(row.certificado_tamanho_arquivo || 0),
        validade_em: row.certificado_validade_em || null,
        importado_em: row.certificado_importado_em || null,
      },
      logo: {
        configurado: !!row.logo_nome_arquivo,
        nome_arquivo: row.logo_nome_arquivo || "",
        mime_type: row.logo_mime_type || "",
        tamanho_arquivo: Number(row.logo_tamanho_arquivo || 0),
        importado_em: row.logo_importado_em || null,
      },
    };
  }

  static normalizarPayload(payload = {}) {
    const empresa = payload.empresa || {};
    const usuario = payload.usuario || {};
    const certificado = payload.certificado || {};
    const fiscal = payload.fiscal || {};
    const financeiro = payload.financeiro || {};
    const hasFinanceiro = !!payload.financeiro;
    const logo = payload.logo || null;

    const tenantNome = normalizeText(empresa.tenant_nome, 150, {
      required: true,
      label: "Nome da filial",
    });
    const documento = normalizeDigits(empresa.cnpj, 14, {
      required: true,
      label: "CNPJ",
    });
    const razaoSocial = normalizeText(empresa.nome_razao, 180, {
      required: true,
      label: "Razão social",
    });

    const senha = normalizeText(usuario.password, 120, {
      required: true,
      label: "Senha do usuário",
    });

    if (senha.length < 6) {
      throw new Error("A senha do usuário precisa ter pelo menos 6 caracteres.");
    }

    return {
      empresa: {
        tenant_nome: tenantNome,
        nome_razao: razaoSocial,
        nome_fantasia: normalizeText(empresa.nome_fantasia, 180),
        cnpj: documento,
        inscricao_estadual: normalizeText(empresa.inscricao_estadual, 20),
        inscricao_municipal: normalizeText(empresa.inscricao_municipal, 20),
        email: normalizeText(empresa.email, 150),
        telefone: normalizeText(empresa.telefone, 20),
        cep: normalizeText(empresa.cep, 9),
        logradouro: normalizeText(empresa.logradouro, 180),
        numero: normalizeText(empresa.numero, 20),
        complemento: normalizeText(empresa.complemento, 120),
        bairro: normalizeText(empresa.bairro, 100),
        cidade: normalizeText(empresa.cidade, 100),
        uf: normalizeText(empresa.uf, 2),
        codigo_ibge: normalizeText(empresa.codigo_ibge, 10),
        pais: normalizeText(empresa.pais, 60) || "Brasil",
      },
      usuario: {
        nome: normalizeText(usuario.nome, 150, {
          required: true,
          label: "Nome do usuário admin",
        }),
        email: normalizeText(usuario.email, 150, {
          required: true,
          label: "E-mail do usuário admin",
        }),
        username: normalizeText(usuario.username, 80, {
          required: true,
          label: "Login do usuário admin",
        }),
        password: senha,
      },
      certificado: {
        nome_arquivo: normalizeText(certificado.nome_arquivo, 180, {
          required: true,
          label: "Arquivo do certificado",
        }),
        senha: normalizeText(certificado.senha, 180, {
          required: true,
          label: "Senha do certificado",
        }),
        conteudo_base64: normalizeText(certificado.conteudo_base64, null, {
          required: true,
          label: "Conteúdo do certificado",
        }),
      },
      fiscal: {
        ambiente_nfe: normalizeText(fiscal.ambiente_nfe, 1) || "2",
        crt: normalizeText(fiscal.crt, 1) || "1",
        serie_nfe_padrao: parseInteger(fiscal.serie_nfe_padrao ?? 1, {
          required: true,
          min: 0,
          max: 999,
          label: "Série padrão",
        }),
        proximo_numero_nfe: parseInteger(fiscal.proximo_numero_nfe ?? 1, {
          required: true,
          max: 999999999,
          label: "Próximo número da NF-e",
        }),
        cnae: normalizeText(fiscal.cnae, 7),
        natureza_operacao_padrao:
          normalizeText(fiscal.natureza_operacao_padrao, 120) || "Venda de mercadoria",
      },
      logo:
        logo?.conteudo && logo?.mime_type
          ? {
              nome_arquivo: normalizeText(logo.nome_arquivo, 180) || "logo.webp",
              mime_type: normalizeText(logo.mime_type, 80) || "image/webp",
              conteudo: logo.conteudo,
              tamanho_arquivo: Number(logo.tamanho_arquivo || logo.conteudo.length || 0),
            }
          : null,
      financeiro: {
        criar_contrato: hasFinanceiro && financeiro.criar_contrato !== false,
        plano_nome: normalizeText(financeiro.plano_nome, 120) || "V12 ERP",
        ciclo: ["mensal", "trimestral", "semestral", "anual"].includes(financeiro.ciclo)
          ? financeiro.ciclo
          : "mensal",
        forma_cobranca: ["boleto", "pix"].includes(financeiro.forma_cobranca)
          ? financeiro.forma_cobranca
          : "boleto",
        valor_mensal: parseDecimal(financeiro.valor_mensal, {
          required: hasFinanceiro && financeiro.criar_contrato !== false,
          label: "Valor mensal",
        }),
        quantidade_parcelas: parseInteger(financeiro.quantidade_parcelas ?? 1, {
          required: hasFinanceiro && financeiro.criar_contrato !== false,
          min: 1,
          max: 120,
          label: "Quantidade de parcelas",
        }),
        dia_vencimento: parseInteger(financeiro.dia_vencimento ?? 10, {
          required: false,
          min: 1,
          max: 31,
          label: "Dia de vencimento",
        }) || 10,
        primeiro_vencimento: parseDateOnly(financeiro.primeiro_vencimento, {
          required: hasFinanceiro && financeiro.criar_contrato !== false,
          label: "Primeiro vencimento",
        }),
        juros_mora_percentual:
          parseDecimal(financeiro.juros_mora_percentual ?? 0, {
            label: "Juros por atraso",
          }) || 0,
        multa_atraso_percentual:
          parseDecimal(financeiro.multa_atraso_percentual ?? 0, {
            label: "Multa por atraso",
          }) || 0,
        bloquear_apos_dias:
          parseInteger(financeiro.bloquear_apos_dias ?? 0, {
            required: false,
            min: 0,
            max: 365,
            label: "Bloquear após dias",
          }) || 0,
        observacao: normalizeText(financeiro.observacao, 500),
      },
    };
  }

  static async validarDuplicidades(client, data) {
    const checks = await Promise.all([
      client.query(
        `
          SELECT tenant_id
          FROM tenant
          WHERE REGEXP_REPLACE(COALESCE(tenant_documento, ''), '\\D', '', 'g') = $1
          LIMIT 1
        `,
        [data.empresa.cnpj]
      ),
      client.query(
        `
          SELECT pessoa_id
          FROM pessoa
          WHERE REGEXP_REPLACE(COALESCE(pessoa_cpf_cnpj, ''), '\\D', '', 'g') = $1
            AND pessoa_excluido = FALSE
          LIMIT 1
        `,
        [data.empresa.cnpj]
      ),
      client.query(
        `
          SELECT usuario_id
          FROM usuario
          WHERE usuario_excluido = FALSE
            AND (
              UPPER(usuario_email) = UPPER($1)
              OR UPPER(usuario_username) = UPPER($2)
            )
          LIMIT 1
        `,
        [data.usuario.email, data.usuario.username]
      ),
    ]);

    if (checks[0].rows[0]) {
      throw new Error("Já existe uma filial cadastrada com este CNPJ.");
    }

    if (checks[1].rows[0]) {
      throw new Error("Já existe uma pessoa cadastrada com este CNPJ.");
    }

    if (checks[2].rows[0]) {
      throw new Error("O e-mail ou login do usuário admin já está em uso.");
    }
  }

  static async criarFilial(client, payload, usuarioCriadorId = null) {
    const data = this.normalizarPayload(payload);
    await this.validarDuplicidades(client, data);

    const tenantSlug = await buildUniqueTenantSlug(
      client,
      data.empresa.nome_fantasia || data.empresa.nome_razao || data.empresa.tenant_nome
    );

      const certificadoBuffer = Buffer.from(data.certificado.conteudo_base64, "base64");
      if (!certificadoBuffer.length) {
        throw new Error("Conteúdo do certificado inválido.");
      }

      const certificadoPreview = await previewCertificate({
        certificadoBase64: data.certificado.conteudo_base64,
        certificadoSenha: data.certificado.senha,
        scopeKey: `tenant-create-${Date.now()}`,
      });

    await client.query("BEGIN");

    try {
      const pessoaResult = await client.query(
        `
          INSERT INTO pessoa (
            pessoa_tipo,
            pessoa_nome_razao,
            pessoa_nome_fantasia,
            pessoa_cpf_cnpj,
            pessoa_inscricao_estadual,
            pessoa_inscricao_municipal,
            pessoa_email,
            pessoa_telefone,
            pessoa_ativo,
            pessoa_excluido
          )
          VALUES ('J', $1, $2, $3, $4, $5, $6, $7, TRUE, FALSE)
          RETURNING pessoa_id
        `,
        [
          data.empresa.nome_razao,
          data.empresa.nome_fantasia,
          data.empresa.cnpj,
          data.empresa.inscricao_estadual,
          data.empresa.inscricao_municipal,
          data.empresa.email,
          data.empresa.telefone,
        ]
      );

      const pessoaId = Number(pessoaResult.rows[0].pessoa_id);

      const tenantResult = await client.query(
        `
          INSERT INTO tenant (
            tenant_nome,
            tenant_slug,
            tenant_documento,
            tenant_ativo,
            pessoa_id
          )
          VALUES ($1, $2, $3, TRUE, $4)
          RETURNING tenant_id
        `,
        [data.empresa.tenant_nome, tenantSlug, data.empresa.cnpj, pessoaId]
      );

      const tenantId = Number(tenantResult.rows[0].tenant_id);

      await client.query(
        `
          INSERT INTO pessoa_tenant (pessoa_id, tenant_id, principal, ativo)
          VALUES ($1, $2, TRUE, TRUE)
        `,
        [pessoaId, tenantId]
      );

      await client.query(
        `
          INSERT INTO pessoa_endereco (
            pessoa_id,
            tenant_id,
            endereco_tipo,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            uf,
            codigo_ibge,
            pais
          )
          VALUES (
            $1,
            $2,
            'principal',
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11
          )
        `,
        [
          pessoaId,
          tenantId,
          data.empresa.cep,
          data.empresa.logradouro,
          data.empresa.numero,
          data.empresa.complemento,
          data.empresa.bairro,
          data.empresa.cidade,
          data.empresa.uf,
          data.empresa.codigo_ibge,
          data.empresa.pais,
        ]
      );

      const usuarioResult = await client.query(
        `
          INSERT INTO usuario (
            tenant_id_default,
            pessoa_id,
            usuario_nome,
            usuario_email,
            usuario_username,
            usuario_senha,
            usuario_ativo,
            usuario_primeiro_login,
            usuario_excluido,
            usuario_master
          )
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, FALSE, FALSE)
          RETURNING usuario_id
        `,
        [
          tenantId,
          null,
          data.usuario.nome,
          data.usuario.email,
          data.usuario.username,
          hashPassword(data.usuario.password),
        ]
      );

      const usuarioId = Number(usuarioResult.rows[0].usuario_id);

      await client.query(
        `
          INSERT INTO usuario_tenant (
            tenant_id,
            usuario_id,
            perfil,
            ativo,
            ultimo_acesso_em
          )
          VALUES ($1, $2, 'admin', TRUE, NOW())
        `,
        [tenantId, usuarioId]
      );

      if (usuarioCriadorId) {
        await client.query(
          `
            INSERT INTO usuario_tenant (
              tenant_id,
              usuario_id,
              perfil,
              ativo,
              ultimo_acesso_em
            )
            VALUES ($1, $2, 'admin', TRUE, NOW())
            ON CONFLICT (tenant_id, usuario_id) DO UPDATE
            SET
              perfil = EXCLUDED.perfil,
              ativo = TRUE
          `,
          [tenantId, usuarioCriadorId]
        );
      }

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
            nfe_habilitada
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
        `,
        [
          tenantId,
          data.fiscal.ambiente_nfe,
          data.fiscal.serie_nfe_padrao,
          data.fiscal.proximo_numero_nfe,
          data.fiscal.crt,
          data.fiscal.cnae,
          data.fiscal.natureza_operacao_padrao,
        ]
      );

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
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [
          tenantId,
          data.certificado.nome_arquivo,
          certificadoBuffer,
          encryptSecret(data.certificado.senha),
          certificadoBuffer.length,
          certificadoPreview.validade_em,
        ]
      );

      if (data.logo) {
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
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (tenant_id) DO UPDATE
            SET
              nome_arquivo = EXCLUDED.nome_arquivo,
              mime_type = EXCLUDED.mime_type,
              conteudo = EXCLUDED.conteudo,
              tamanho_arquivo = EXCLUDED.tamanho_arquivo,
              importado_em = EXCLUDED.importado_em
          `,
          [
            tenantId,
            data.logo.nome_arquivo,
            data.logo.mime_type,
            data.logo.conteudo,
            data.logo.tamanho_arquivo,
          ]
        );
      }

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
            $1,
            '66056990000198',
            'jhes sistemas',
            'Jonas Paulino',
            'jonaspaulino@jhes.com.br',
            '819984163086',
            'Rua nova Baraunas',
            '451',
            'nova caruaru',
            'Caruaru',
            'PE'
          )
          ON CONFLICT (tenant_id) DO NOTHING
        `,
        [tenantId]
      );

      await client.query(
        `
          INSERT INTO tabela_preco (tenant_id, nome, padrao, ativo, excluido)
          VALUES ($1, 'Tabela Padrão', TRUE, TRUE, FALSE)
        `,
        [tenantId]
      );

      await client.query(
        `
          INSERT INTO deposito (tenant_id, nome, padrao, ativo, excluido)
          VALUES ($1, 'Depósito Padrão', TRUE, TRUE, FALSE)
        `,
        [tenantId]
      );

      await seedCondicoesPagamento(client, tenantId);
      await seedFormasPagamento(client, tenantId);

      await client.query(
        `
          INSERT INTO payments.tenant_configuracao_gateway (
            tenant_id,
            provider,
            ambiente,
            gateway_ativo,
            auto_criar_cliente,
            baixa_automatica_pix,
            baixa_automatica_boleto
          )
          VALUES ($1, 'asaas', 'sandbox', FALSE, TRUE, TRUE, TRUE)
        `,
        [tenantId]
      );

      await client.query(
        `
          INSERT INTO message.tenant_configuracao_whatsapp (
            tenant_id,
            provider,
            whatsapp_ativo,
            auto_enviar_boleto_venda,
            auto_enviar_pix_venda,
            mensagem_boleto_padrao,
            mensagem_pix_padrao
          )
          VALUES (
            $1,
            'evolution',
            FALSE,
            FALSE,
            FALSE,
            'Olá, {nome}. Seguem os boletos do título #{titulo_id}. {boletos}',
            'Olá, {nome}. Segue o PIX do título #{titulo_id}, parcela {parcela}. Valor: {valor}. Vencimento: {vencimento}. Copia e cola: {pix_copia_cola}'
          )
        `,
        [tenantId]
      );

      const pessoaGestaoId = await upsertPessoaGestaoV12(client, data.empresa);

      const contratoGestaoId = await criarContratoGestaoV12(
        client,
        tenantId,
        pessoaGestaoId,
        data.financeiro,
        usuarioCriadorId
      );

      await client.query("COMMIT");

      return {
        tenant_id: tenantId,
        tenant_nome: data.empresa.tenant_nome,
        tenant_slug: tenantSlug,
        pessoa_id: pessoaId,
        pessoa_gestao_id: pessoaGestaoId,
        usuario_id: usuarioId,
        tenant_ativo: true,
        certificado_validade_em: certificadoPreview.validade_em,
        contrato_gestao_id: contratoGestaoId,
        created_by: usuarioCriadorId,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async atualizarFilial(client, tenantId, payload) {
    const empresa = payload?.empresa || {};
    const fiscal = payload?.fiscal || {};
    const certificado = payload?.certificado || {};
    const logo = payload?.logo || null;

    const data = {
      empresa: {
        tenant_nome: normalizeText(empresa.tenant_nome, 150, {
          required: true,
          label: "Nome da filial",
        }),
        nome_razao: normalizeText(empresa.nome_razao, 180, {
          required: true,
          label: "Razão social",
        }),
        nome_fantasia: normalizeText(empresa.nome_fantasia, 180),
        cnpj: normalizeDigits(empresa.cnpj, 14, {
          required: true,
          label: "CNPJ",
        }),
        inscricao_estadual: normalizeText(empresa.inscricao_estadual, 20),
        inscricao_municipal: normalizeText(empresa.inscricao_municipal, 20),
        email: normalizeText(empresa.email, 150),
        telefone: normalizeText(empresa.telefone, 20),
        cep: normalizeText(empresa.cep, 9),
        logradouro: normalizeText(empresa.logradouro, 180),
        numero: normalizeText(empresa.numero, 20),
        complemento: normalizeText(empresa.complemento, 120),
        bairro: normalizeText(empresa.bairro, 100),
        cidade: normalizeText(empresa.cidade, 100),
        uf: normalizeText(empresa.uf, 2),
        codigo_ibge: normalizeText(empresa.codigo_ibge, 10),
        pais: normalizeText(empresa.pais, 60) || "Brasil",
      },
      fiscal: {
        ambiente_nfe: normalizeText(fiscal.ambiente_nfe, 1) || "2",
        serie_nfe_padrao: parseInteger(fiscal.serie_nfe_padrao ?? 1, {
          required: true,
          min: 0,
          max: 999,
          label: "Série padrão",
        }),
        proximo_numero_nfe: parseInteger(fiscal.proximo_numero_nfe ?? 1, {
          required: true,
          max: 999999999,
          label: "Próximo número da NF-e",
        }),
        crt: normalizeText(fiscal.crt, 1) || "3",
        cnae: normalizeText(fiscal.cnae, 7),
        natureza_operacao_padrao:
          normalizeText(fiscal.natureza_operacao_padrao, 120) || "Venda de mercadoria",
      },
      certificado: {
        nome_arquivo: normalizeText(certificado.nome_arquivo, 180),
        senha: normalizeText(certificado.senha, 180),
        conteudo_base64: normalizeText(certificado.conteudo_base64, null),
      },
      logo:
        logo?.conteudo && logo?.mime_type
          ? {
              nome_arquivo: normalizeText(logo.nome_arquivo, 180) || "logo.webp",
              mime_type: normalizeText(logo.mime_type, 80) || "image/webp",
              conteudo: logo.conteudo,
              tamanho_arquivo: Number(logo.tamanho_arquivo || logo.conteudo.length || 0),
            }
          : null,
    };

    const querAtualizarCertificado =
      !!data.certificado.nome_arquivo ||
      !!data.certificado.senha ||
      !!data.certificado.conteudo_base64;

    if (
      querAtualizarCertificado &&
      (!data.certificado.senha || !data.certificado.conteudo_base64)
    ) {
      throw new Error("Para substituir o certificado, informe o arquivo PFX e a senha.");
    }

    await client.query("BEGIN");

    try {
      const tenantResult = await client.query(
        `
          UPDATE tenant
          SET tenant_nome = $2,
              tenant_documento = $3
          WHERE tenant_id = $1
          RETURNING tenant_id
        `,
        [tenantId, data.empresa.tenant_nome, data.empresa.cnpj]
      );

      if (!tenantResult.rows[0]) {
        throw new Error("Filial não encontrada.");
      }

      const pessoaResult = await client.query(
        `
          SELECT pessoa_id
          FROM tenant
          WHERE tenant_id = $1
          LIMIT 1
        `,
        [tenantId]
      );

      const pessoaId = Number(pessoaResult.rows[0]?.pessoa_id || 0);

      if (pessoaId) {
        await client.query(
          `
            UPDATE pessoa
            SET pessoa_nome_razao = $2,
                pessoa_nome_fantasia = $3,
                pessoa_cpf_cnpj = $4,
                pessoa_inscricao_estadual = $5,
                pessoa_inscricao_municipal = $6,
                pessoa_email = $7,
                pessoa_telefone = $8
            WHERE pessoa_id = $1
          `,
          [
            pessoaId,
            data.empresa.nome_razao,
            data.empresa.nome_fantasia,
            data.empresa.cnpj,
            data.empresa.inscricao_estadual,
            data.empresa.inscricao_municipal,
            data.empresa.email,
            data.empresa.telefone,
          ]
        );

        await client.query(
          `
            UPDATE pessoa_endereco
            SET cep = $2,
                logradouro = $3,
                numero = $4,
                complemento = $5,
                bairro = $6,
                cidade = $7,
                uf = $8,
                codigo_ibge = $9,
                pais = $10
            WHERE pessoa_id = $1
              AND endereco_tipo = 'principal'
          `,
          [
            pessoaId,
            data.empresa.cep,
            data.empresa.logradouro,
            data.empresa.numero,
            data.empresa.complemento,
            data.empresa.bairro,
            data.empresa.cidade,
            data.empresa.uf,
            data.empresa.codigo_ibge,
            data.empresa.pais,
          ]
        );
      }

      const pessoaGestaoId = await upsertPessoaGestaoV12(client, data.empresa);

      await client.query(
        `
          UPDATE gestao.cliente_contrato
          SET pessoa_id = $2
          WHERE tenant_id = $1
            AND status = 'ativo'
        `,
        [tenantId, pessoaGestaoId]
      );

      if (querAtualizarCertificado) {
        const certificadoBuffer = Buffer.from(data.certificado.conteudo_base64, "base64");
        if (!certificadoBuffer.length) {
          throw new Error("Conteúdo do certificado inválido.");
        }

        const certificadoPreview = await previewCertificate({
          certificadoBase64: data.certificado.conteudo_base64,
          certificadoSenha: data.certificado.senha,
          scopeKey: `tenant-update-${tenantId}-${Date.now()}`,
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
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
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
            tenantId,
            data.certificado.nome_arquivo || `certificado-${tenantId}.pfx`,
            certificadoBuffer,
            encryptSecret(data.certificado.senha),
            certificadoBuffer.length,
            certificadoPreview.validade_em,
          ]
        );
      }

      if (data.logo) {
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
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (tenant_id) DO UPDATE
            SET
              nome_arquivo = EXCLUDED.nome_arquivo,
              mime_type = EXCLUDED.mime_type,
              conteudo = EXCLUDED.conteudo,
              tamanho_arquivo = EXCLUDED.tamanho_arquivo,
              importado_em = EXCLUDED.importado_em
          `,
          [
            tenantId,
            data.logo.nome_arquivo,
            data.logo.mime_type,
            data.logo.conteudo,
            data.logo.tamanho_arquivo,
          ]
        );
      }

      await client.query("COMMIT");
      return this.obterFilialPorId(client, tenantId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async alternarStatusFilial(client, tenantId, tenantAtivo) {
    const { rows } = await client.query(
      `
        UPDATE tenant
        SET tenant_ativo = $2
        WHERE tenant_id = $1
        RETURNING tenant_id, tenant_nome, tenant_ativo
      `,
      [tenantId, !!tenantAtivo]
    );

    return rows[0] || null;
  }
}

export default TenantSetupDAO;
