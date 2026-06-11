import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const SORT_COLUMNS = {
  pessoa_id: "p.pessoa_id",
  pessoa_nome_razao: "p.pessoa_nome_razao",
  pessoa_cpf_cnpj: "p.pessoa_cpf_cnpj",
  pessoa_email: "p.pessoa_email",
  pessoa_ativo: "p.pessoa_ativo",
};

const buildOrderBy = (sort = {}) => {
  const entries = Object.entries(sort)
    .map(([column, direction]) => {
      if (!SORT_COLUMNS[column]) return null;
      const normalizedDirection = String(direction).toUpperCase() === "DESC" ? "DESC" : "ASC";
      return `${SORT_COLUMNS[column]} ${normalizedDirection}`;
    })
    .filter(Boolean);

  return entries.length ? entries.join(", ") : "p.pessoa_nome_razao ASC";
};

const normalizeText = (value, maxLength, { required = false } = {}) => {
  const normalized = String(value || "").trim();

  if (!normalized) {
    if (required) {
      throw new Error("Preencha os campos obrigatorios da pessoa.");
    }

    return null;
  }

  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "yes"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no"].includes(normalized)) return false;

  return defaultValue;
};

const normalizeDate = (value) => {
  const normalized = String(value || "").trim();
  return normalized || null;
};

const normalizeTipoPessoa = (value) => {
  const normalized = String(value || "F").trim().toUpperCase();
  return normalized === "J" ? "J" : "F";
};

const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");

const hasAddressData = (endereco = {}) =>
  [
    endereco.cep,
    endereco.logradouro,
    endereco.numero,
    endereco.complemento,
    endereco.bairro,
    endereco.cidade,
    endereco.uf,
    endereco.codigo_ibge,
    endereco.pais,
  ].some((value) => String(value || "").trim() !== "");

const mapPessoa = (row = {}) => ({
  pessoa_id: row.pessoa_id,
  pessoa_tipo: row.pessoa_tipo,
  pessoa_nome_razao: row.pessoa_nome_razao,
  pessoa_nome_fantasia: row.pessoa_nome_fantasia,
  pessoa_cpf_cnpj: row.pessoa_cpf_cnpj,
  pessoa_inscricao_estadual: row.pessoa_inscricao_estadual,
  pessoa_inscricao_municipal: row.pessoa_inscricao_municipal,
  pessoa_rg: row.pessoa_rg,
  pessoa_email: row.pessoa_email,
  pessoa_telefone: row.pessoa_telefone,
  pessoa_whatsapp: row.pessoa_whatsapp,
  pessoa_data_nascimento: row.pessoa_data_nascimento,
  pessoa_observacao: row.pessoa_observacao,
  pessoa_cliente: row.pessoa_cliente,
  pessoa_fornecedor: row.pessoa_fornecedor,
  pessoa_funcionario: row.pessoa_funcionario,
  pessoa_transportadora: row.pessoa_transportadora,
  pessoa_ativo: row.pessoa_ativo,
  criado_em: row.criado_em,
  atualizado_em: row.atualizado_em,
  endereco: {
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
});

class PessoaDAO {
  static async listar(client, { page = 1, limit = 20, search = "", sort = {} }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const normalizedSearch = String(search || "").trim();
    const values = [];

    let where = `
      WHERE pt.tenant_id = ${TENANT_CONTEXT_SQL}
        AND pt.ativo = TRUE
        AND p.pessoa_excluido = FALSE
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      const searchClauses = [
        `LOWER(p.pessoa_nome_razao) LIKE LOWER($${values.length})`,
        `LOWER(COALESCE(p.pessoa_nome_fantasia, '')) LIKE LOWER($${values.length})`,
        `LOWER(COALESCE(p.pessoa_email, '')) LIKE LOWER($${values.length})`,
        `LOWER(COALESCE(p.pessoa_cpf_cnpj, '')) LIKE LOWER($${values.length})`,
        `LOWER(COALESCE(p.pessoa_telefone, '')) LIKE LOWER($${values.length})`,
      ];

      const digits = normalizeDigits(normalizedSearch);
      if (digits) {
        values.push(`%${digits}%`);
        searchClauses.push(
          `REGEXP_REPLACE(COALESCE(p.pessoa_cpf_cnpj, ''), '\\D', '', 'g') LIKE $${values.length}`,
          `REGEXP_REPLACE(COALESCE(p.pessoa_telefone, ''), '\\D', '', 'g') LIKE $${values.length}`,
          `REGEXP_REPLACE(COALESCE(p.pessoa_whatsapp, ''), '\\D', '', 'g') LIKE $${values.length}`
        );
      }

      where += ` AND (${searchClauses.join(" OR ")})`;
    }

    const orderBy = buildOrderBy(sort);

    const listSql = `
      SELECT
        p.pessoa_id,
        p.pessoa_tipo,
        p.pessoa_nome_razao,
        p.pessoa_nome_fantasia,
        p.pessoa_cpf_cnpj,
        p.pessoa_email,
        p.pessoa_telefone,
        p.pessoa_whatsapp,
        p.pessoa_cliente,
        p.pessoa_fornecedor,
        p.pessoa_funcionario,
        p.pessoa_transportadora,
        p.pessoa_ativo,
        p.criado_em,
        p.atualizado_em,
        pe.cidade,
        pe.uf
      FROM pessoa p
      JOIN pessoa_tenant pt
        ON pt.pessoa_id = p.pessoa_id
      LEFT JOIN pessoa_endereco pe
        ON pe.pessoa_id = p.pessoa_id
       AND pe.tenant_id = ${TENANT_CONTEXT_SQL}
       AND pe.endereco_tipo = 'principal'
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM pessoa p
      JOIN pessoa_tenant pt
        ON pt.pessoa_id = p.pessoa_id
      ${where}
    `;

    const [listResult, countResult] = await Promise.all([
      client.query(listSql, [...values, safeLimit, offset]),
      client.query(countSql, values),
    ]);

    const total = countResult.rows[0]?.total || 0;

    return {
      data: listResult.rows,
      page: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  static async buscarPorId(client, pessoaId) {
    const { rows } = await client.query(
      `
        SELECT
          p.*,
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
        LIMIT 1
      `,
      [pessoaId]
    );

    return rows[0] ? mapPessoa(rows[0]) : null;
  }

  static async verificarCpfCnpjDuplicado(client, { pessoaId = null, cpfCnpj = "" }) {
    const digits = normalizeDigits(cpfCnpj);
    if (!digits) return null;

    const params = [digits];
    let sql = `
      SELECT pessoa_id
      FROM pessoa
      WHERE pessoa_excluido = FALSE
        AND REGEXP_REPLACE(COALESCE(pessoa_cpf_cnpj, ''), '\\D', '', 'g') = $1
    `;

    if (pessoaId) {
      params.push(pessoaId);
      sql += ` AND pessoa_id <> $2`;
    }

    sql += " LIMIT 1";

    const { rows } = await client.query(sql, params);
    return rows[0] || null;
  }

  static normalizarPayload(payload = {}) {
    const pessoaTipo = normalizeTipoPessoa(payload.pessoa_tipo);

    return {
      pessoa_tipo: pessoaTipo,
      pessoa_nome_razao: normalizeText(payload.pessoa_nome_razao, 180, { required: true }),
      pessoa_nome_fantasia: normalizeText(payload.pessoa_nome_fantasia, 180),
      pessoa_cpf_cnpj: normalizeText(payload.pessoa_cpf_cnpj, 20),
      pessoa_inscricao_estadual: normalizeText(payload.pessoa_inscricao_estadual, 20),
      pessoa_inscricao_municipal: normalizeText(payload.pessoa_inscricao_municipal, 20),
      pessoa_rg: normalizeText(payload.pessoa_rg, 20),
      pessoa_email: normalizeText(payload.pessoa_email, 150),
      pessoa_telefone: normalizeText(payload.pessoa_telefone, 20),
      pessoa_whatsapp: normalizeText(payload.pessoa_whatsapp, 20),
      pessoa_data_nascimento: normalizeDate(payload.pessoa_data_nascimento),
      pessoa_observacao: normalizeText(payload.pessoa_observacao, null),
      pessoa_cliente: normalizeBoolean(payload.pessoa_cliente, false),
      pessoa_fornecedor: normalizeBoolean(payload.pessoa_fornecedor, false),
      pessoa_funcionario: normalizeBoolean(payload.pessoa_funcionario, false),
      pessoa_transportadora: normalizeBoolean(payload.pessoa_transportadora, false),
      pessoa_ativo: normalizeBoolean(payload.pessoa_ativo, true),
      endereco: {
        cep: normalizeText(payload?.endereco?.cep, 9),
        logradouro: normalizeText(payload?.endereco?.logradouro, 180),
        numero: normalizeText(payload?.endereco?.numero, 20),
        complemento: normalizeText(payload?.endereco?.complemento, 120),
        bairro: normalizeText(payload?.endereco?.bairro, 100),
        cidade: normalizeText(payload?.endereco?.cidade, 100),
        uf: normalizeText(payload?.endereco?.uf, 2),
        codigo_ibge: normalizeText(payload?.endereco?.codigo_ibge, 10),
        pais: normalizeText(payload?.endereco?.pais, 60) || "Brasil",
      },
    };
  }

  static async criar(client, payload = {}) {
    const data = this.normalizarPayload(payload);

    if (await this.verificarCpfCnpjDuplicado(client, { cpfCnpj: data.pessoa_cpf_cnpj })) {
      throw new Error("Ja existe uma pessoa com este CPF ou CNPJ.");
    }

    await client.query("BEGIN");

    try {
      const insertPessoa = await client.query(
        `
          INSERT INTO pessoa (
            pessoa_tipo,
            pessoa_nome_razao,
            pessoa_nome_fantasia,
            pessoa_cpf_cnpj,
            pessoa_inscricao_estadual,
            pessoa_inscricao_municipal,
            pessoa_rg,
            pessoa_email,
            pessoa_telefone,
            pessoa_whatsapp,
            pessoa_data_nascimento,
            pessoa_observacao,
            pessoa_cliente,
            pessoa_fornecedor,
            pessoa_funcionario,
            pessoa_transportadora,
            pessoa_ativo,
            pessoa_excluido
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, FALSE)
          RETURNING pessoa_id
        `,
        [
          data.pessoa_tipo,
          data.pessoa_nome_razao,
          data.pessoa_nome_fantasia,
          data.pessoa_cpf_cnpj,
          data.pessoa_inscricao_estadual,
          data.pessoa_inscricao_municipal,
          data.pessoa_rg,
          data.pessoa_email,
          data.pessoa_telefone,
          data.pessoa_whatsapp,
          data.pessoa_data_nascimento,
          data.pessoa_observacao,
          data.pessoa_cliente,
          data.pessoa_fornecedor,
          data.pessoa_funcionario,
          data.pessoa_transportadora,
          data.pessoa_ativo,
        ]
      );

      const pessoaId = insertPessoa.rows[0].pessoa_id;

      await client.query(
        `
          INSERT INTO pessoa_tenant (pessoa_id, tenant_id, principal, ativo)
          VALUES ($1, ${TENANT_CONTEXT_SQL}, TRUE, TRUE)
          ON CONFLICT (pessoa_id, tenant_id)
          DO UPDATE SET principal = TRUE, ativo = TRUE
        `,
        [pessoaId]
      );

      if (hasAddressData(data.endereco)) {
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
            VALUES ($1, ${TENANT_CONTEXT_SQL}, 'principal', $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (pessoa_id, tenant_id, endereco_tipo)
            DO UPDATE SET
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
            pessoaId,
            data.endereco.cep,
            data.endereco.logradouro,
            data.endereco.numero,
            data.endereco.complemento,
            data.endereco.bairro,
            data.endereco.cidade,
            data.endereco.uf,
            data.endereco.codigo_ibge,
            data.endereco.pais,
          ]
        );
      }

      await client.query("COMMIT");
      return this.buscarPorId(client, pessoaId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async atualizar(client, pessoaId, payload = {}) {
    const data = this.normalizarPayload(payload);
    const current = await this.buscarPorId(client, pessoaId);

    if (!current) {
      throw new Error("Pessoa nao encontrada.");
    }

    if (await this.verificarCpfCnpjDuplicado(client, { pessoaId, cpfCnpj: data.pessoa_cpf_cnpj })) {
      throw new Error("Ja existe uma pessoa com este CPF ou CNPJ.");
    }

    await client.query("BEGIN");

    try {
      await client.query(
        `
          UPDATE pessoa
          SET
            pessoa_tipo = $2,
            pessoa_nome_razao = $3,
            pessoa_nome_fantasia = $4,
            pessoa_cpf_cnpj = $5,
            pessoa_inscricao_estadual = $6,
            pessoa_inscricao_municipal = $7,
            pessoa_rg = $8,
            pessoa_email = $9,
            pessoa_telefone = $10,
            pessoa_whatsapp = $11,
            pessoa_data_nascimento = $12,
            pessoa_observacao = $13,
            pessoa_cliente = $14,
            pessoa_fornecedor = $15,
            pessoa_funcionario = $16,
            pessoa_transportadora = $17,
            pessoa_ativo = $18
          WHERE pessoa_id = $1
        `,
        [
          pessoaId,
          data.pessoa_tipo,
          data.pessoa_nome_razao,
          data.pessoa_nome_fantasia,
          data.pessoa_cpf_cnpj,
          data.pessoa_inscricao_estadual,
          data.pessoa_inscricao_municipal,
          data.pessoa_rg,
          data.pessoa_email,
          data.pessoa_telefone,
          data.pessoa_whatsapp,
          data.pessoa_data_nascimento,
          data.pessoa_observacao,
          data.pessoa_cliente,
          data.pessoa_fornecedor,
          data.pessoa_funcionario,
          data.pessoa_transportadora,
          data.pessoa_ativo,
        ]
      );

      await client.query(
        `
          INSERT INTO pessoa_tenant (pessoa_id, tenant_id, principal, ativo)
          VALUES ($1, ${TENANT_CONTEXT_SQL}, TRUE, TRUE)
          ON CONFLICT (pessoa_id, tenant_id)
          DO UPDATE SET ativo = TRUE
        `,
        [pessoaId]
      );

      if (hasAddressData(data.endereco)) {
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
            VALUES ($1, ${TENANT_CONTEXT_SQL}, 'principal', $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (pessoa_id, tenant_id, endereco_tipo)
            DO UPDATE SET
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
            pessoaId,
            data.endereco.cep,
            data.endereco.logradouro,
            data.endereco.numero,
            data.endereco.complemento,
            data.endereco.bairro,
            data.endereco.cidade,
            data.endereco.uf,
            data.endereco.codigo_ibge,
            data.endereco.pais,
          ]
        );
      } else {
        await client.query(
          `
            DELETE FROM pessoa_endereco
            WHERE pessoa_id = $1
              AND tenant_id = ${TENANT_CONTEXT_SQL}
              AND endereco_tipo = 'principal'
          `,
          [pessoaId]
        );
      }

      await client.query("COMMIT");
      return this.buscarPorId(client, pessoaId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async excluir(client, pessoaId) {
    const current = await this.buscarPorId(client, pessoaId);

    if (!current) {
      throw new Error("Pessoa nao encontrada.");
    }

    await client.query("BEGIN");

    try {
      const countResult = await client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM pessoa_tenant
          WHERE pessoa_id = $1
            AND ativo = TRUE
        `,
        [pessoaId]
      );

      const activeLinks = countResult.rows[0]?.total || 0;

      await client.query(
        `
          UPDATE pessoa_tenant
          SET ativo = FALSE
          WHERE pessoa_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [pessoaId]
      );

      await client.query(
        `
          DELETE FROM pessoa_endereco
          WHERE pessoa_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
        `,
        [pessoaId]
      );

      if (activeLinks <= 1) {
        await client.query(
          `
            UPDATE pessoa
            SET pessoa_ativo = FALSE, pessoa_excluido = TRUE
            WHERE pessoa_id = $1
          `,
          [pessoaId]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default PessoaDAO;
