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

class ConfiguracaoFiscalDAO {
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
          cert.atualizado_em AS certificado_atualizado_em
        FROM tenant t
        LEFT JOIN tenant_configuracao_fiscal cfg
          ON cfg.tenant_id = t.tenant_id
        LEFT JOIN tenant_certificado_a1 cert
          ON cert.tenant_id = t.tenant_id
        WHERE t.tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `
    );

    const row = rows[0];
    if (!row) return null;

    const emitente = await this.obterPessoaEmitente(client, row.pessoa_id);

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

  static async salvar(client, payload = {}) {
    const data = this.normalizarPayload(payload);
    const emitente = await this.obterPessoaEmitente(client, data.emitente_pessoa_id);
    this.validarPessoaEmitente(emitente);

    const shouldUpdateCertificado =
      !!data.certificado.conteudo_base64 ||
      !!data.certificado.senha ||
      !!data.certificado.nome_arquivo;

    await client.query("BEGIN");

    try {
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

      await client.query("COMMIT");
      return this.buscar(client);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default ConfiguracaoFiscalDAO;
