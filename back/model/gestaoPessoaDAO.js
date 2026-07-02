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

const normalizeTipo = (value) => (String(value || "F").toUpperCase() === "J" ? "J" : "F");

const mapPessoa = (row = {}) => ({
  pessoa_id: row.pessoa_id,
  pessoa_tipo: row.pessoa_tipo,
  pessoa_nome_razao: row.nome_razao,
  pessoa_nome_fantasia: row.nome_fantasia,
  pessoa_cpf_cnpj: row.cpf_cnpj,
  pessoa_inscricao_estadual: row.inscricao_estadual,
  pessoa_inscricao_municipal: row.inscricao_municipal,
  pessoa_rg: row.rg,
  pessoa_email: row.email,
  pessoa_telefone: row.telefone,
  pessoa_whatsapp: row.whatsapp,
  pessoa_data_nascimento: row.data_nascimento,
  pessoa_observacao: row.observacao,
  pessoa_ativo: row.ativo,
  criado_em: row.criado_em,
  atualizado_em: row.atualizado_em,
  cidade: row.cidade,
  uf: row.uf,
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

const normalizePayload = (payload = {}) => {
  const tipo = normalizeTipo(payload.pessoa_tipo);
  const documento = normalizeDigits(payload.pessoa_cpf_cnpj, tipo === "J" ? 14 : 11, {
    required: true,
    label: tipo === "J" ? "CNPJ" : "CPF",
  });
  const endereco = payload.endereco || {};

  return {
    pessoa_tipo: tipo,
    nome_razao: normalizeText(payload.pessoa_nome_razao, 180, {
      required: true,
      label: tipo === "J" ? "Razão social" : "Nome",
    }),
    nome_fantasia: normalizeText(payload.pessoa_nome_fantasia, 180),
    cpf_cnpj: documento,
    inscricao_estadual: normalizeText(payload.pessoa_inscricao_estadual, 30),
    inscricao_municipal: normalizeText(payload.pessoa_inscricao_municipal, 30),
    rg: normalizeText(payload.pessoa_rg, 30),
    email: normalizeText(payload.pessoa_email, 150),
    telefone: normalizeText(payload.pessoa_telefone, 30),
    whatsapp: normalizeText(payload.pessoa_whatsapp, 30),
    data_nascimento: normalizeText(payload.pessoa_data_nascimento, 10),
    observacao: normalizeText(payload.pessoa_observacao, 1000),
    ativo: payload.pessoa_ativo !== false,
    endereco: {
      cep: normalizeText(endereco.cep, 10),
      logradouro: normalizeText(endereco.logradouro, 180),
      numero: normalizeText(endereco.numero, 30),
      complemento: normalizeText(endereco.complemento, 120),
      bairro: normalizeText(endereco.bairro, 100),
      cidade: normalizeText(endereco.cidade, 100),
      uf: normalizeText(endereco.uf, 2),
      codigo_ibge: normalizeText(endereco.codigo_ibge, 10),
      pais: normalizeText(endereco.pais, 60) || "Brasil",
    },
  };
};

class GestaoPessoaDAO {
  static async listar(client, { page = 1, limit = 20, search = "" }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    let where = "WHERE p.excluido = FALSE";

    const normalizedSearch = String(search || "").trim();
    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          LOWER(p.nome_razao) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(p.nome_fantasia, '')) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(p.email, '')) LIKE LOWER($${values.length})
          OR COALESCE(p.cpf_cnpj, '') LIKE REGEXP_REPLACE($${values.length}, '\\D', '', 'g')
        )
      `;
    }

    const listSql = `
      SELECT
        p.*,
        e.cidade,
        e.uf
      FROM gestao.pessoa p
      LEFT JOIN gestao.pessoa_endereco e
        ON e.pessoa_id = p.pessoa_id
       AND e.endereco_tipo = 'principal'
      ${where}
      ORDER BY p.nome_razao ASC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM gestao.pessoa p
      ${where}
    `;

    const [listResult, countResult] = await Promise.all([
      client.query(listSql, [...values, safeLimit, offset]),
      client.query(countSql, values),
    ]);
    const total = countResult.rows[0]?.total || 0;

    return {
      data: listResult.rows.map(mapPessoa),
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
          e.cep,
          e.logradouro,
          e.numero,
          e.complemento,
          e.bairro,
          e.cidade,
          e.uf,
          e.codigo_ibge,
          e.pais
        FROM gestao.pessoa p
        LEFT JOIN gestao.pessoa_endereco e
          ON e.pessoa_id = p.pessoa_id
         AND e.endereco_tipo = 'principal'
        WHERE p.pessoa_id = $1
          AND p.excluido = FALSE
        LIMIT 1
      `,
      [pessoaId]
    );

    return rows[0] ? mapPessoa(rows[0]) : null;
  }

  static async criar(client, payload) {
    const data = normalizePayload(payload);

    await client.query("BEGIN");
    try {
      const pessoaResult = await client.query(
        `
          INSERT INTO gestao.pessoa (
            pessoa_tipo,
            nome_razao,
            nome_fantasia,
            cpf_cnpj,
            inscricao_estadual,
            inscricao_municipal,
            rg,
            email,
            telefone,
            whatsapp,
            data_nascimento,
            observacao,
            ativo
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING pessoa_id
        `,
        [
          data.pessoa_tipo,
          data.nome_razao,
          data.nome_fantasia,
          data.cpf_cnpj,
          data.inscricao_estadual,
          data.inscricao_municipal,
          data.rg,
          data.email,
          data.telefone,
          data.whatsapp,
          data.data_nascimento,
          data.observacao,
          data.ativo,
        ]
      );

      const pessoaId = Number(pessoaResult.rows[0].pessoa_id);
      await this.salvarEndereco(client, pessoaId, data.endereco);
      await client.query("COMMIT");
      return this.buscarPorId(client, pessoaId);
    } catch (error) {
      await client.query("ROLLBACK");
      if (error?.code === "23505") {
        throw new Error("Já existe uma pessoa cadastrada na gestão com este documento.");
      }
      throw error;
    }
  }

  static async atualizar(client, pessoaId, payload) {
    const data = normalizePayload(payload);

    await client.query("BEGIN");
    try {
      const result = await client.query(
        `
          UPDATE gestao.pessoa
          SET
            pessoa_tipo = $2,
            nome_razao = $3,
            nome_fantasia = $4,
            cpf_cnpj = $5,
            inscricao_estadual = $6,
            inscricao_municipal = $7,
            rg = $8,
            email = $9,
            telefone = $10,
            whatsapp = $11,
            data_nascimento = $12,
            observacao = $13,
            ativo = $14
          WHERE pessoa_id = $1
            AND excluido = FALSE
          RETURNING pessoa_id
        `,
        [
          pessoaId,
          data.pessoa_tipo,
          data.nome_razao,
          data.nome_fantasia,
          data.cpf_cnpj,
          data.inscricao_estadual,
          data.inscricao_municipal,
          data.rg,
          data.email,
          data.telefone,
          data.whatsapp,
          data.data_nascimento,
          data.observacao,
          data.ativo,
        ]
      );

      if (!result.rows[0]) throw new Error("Pessoa não encontrada.");

      await this.salvarEndereco(client, pessoaId, data.endereco);
      await client.query("COMMIT");
      return this.buscarPorId(client, pessoaId);
    } catch (error) {
      await client.query("ROLLBACK");
      if (error?.code === "23505") {
        throw new Error("Já existe uma pessoa cadastrada na gestão com este documento.");
      }
      throw error;
    }
  }

  static async salvarEndereco(client, pessoaId, endereco) {
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
        pessoaId,
        endereco.cep,
        endereco.logradouro,
        endereco.numero,
        endereco.complemento,
        endereco.bairro,
        endereco.cidade,
        endereco.uf,
        endereco.codigo_ibge,
        endereco.pais,
      ]
    );
  }

  static async excluir(client, pessoaId) {
    await client.query(
      `
        UPDATE gestao.pessoa
        SET excluido = TRUE,
            ativo = FALSE
        WHERE pessoa_id = $1
      `,
      [pessoaId]
    );
  }
}

export default GestaoPessoaDAO;
