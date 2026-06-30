import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const SORT_COLUMNS = {
  data_emissao: "m.data_emissao",
  numero: "m.numero",
  status: "m.status",
  uf_inicio: "m.uf_inicio",
  uf_fim: "m.uf_fim",
  placa: "v.placa",
};

const ENTITY_TABLES = {
  veiculo: {
    table: "fiscal.mdfe_veiculo",
    id: "mdfe_veiculo_id",
    defaultOrder: "placa ASC",
    searchColumns: ["placa", "renavam", "rntrc"],
  },
  motorista: {
    table: "fiscal.mdfe_motorista",
    id: "mdfe_motorista_id",
    defaultOrder: "nome ASC",
    searchColumns: ["nome", "cpf", "cnh"],
  },
  seguradora: {
    table: "fiscal.mdfe_seguradora",
    id: "mdfe_seguradora_id",
    defaultOrder: "nome ASC",
    searchColumns: ["nome", "cnpj"],
  },
};

const onlyDigits = (value) => String(value ?? "").replace(/\D/g, "");

const normalizeText = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    if (required) throw new Error(`${label} obrigatório.`);
    return null;
  }
  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const normalizeUpper = (value, maxLength, options = {}) => {
  const normalized = normalizeText(value, maxLength, options);
  return normalized ? normalized.toUpperCase() : normalized;
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

const parseNumeric = (value, { defaultValue = 0, allowNull = false, label = "Campo" } = {}) => {
  if (value === undefined || value === null || value === "") {
    return allowNull ? null : defaultValue;
  }

  let normalized = String(value).trim();
  if (!normalized) return allowNull ? null : defaultValue;

  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");
  if (hasDot && hasComma) {
    normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
  } else {
    normalized = normalized.replace(/,/g, ".");
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} inválido.`);
  }
  return parsed;
};

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  return value === true || value === "true" || value === 1 || value === "1";
};

const uniqueNumbers = (values = []) =>
  [...new Set(values.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0))];

const normalizeIbgeCode = (value, label = "Código IBGE") => {
  const code = onlyDigits(value).slice(0, 7);
  if (code.length !== 7) throw new Error(`${label} deve conter 7 dígitos.`);
  return code;
};

const normalizeUf = (value, label = "UF", { required = true } = {}) => {
  const uf = normalizeUpper(value, 2, { required, label });
  if (required && uf.length !== 2) throw new Error(`${label} deve conter 2 letras.`);
  if (!required && uf && uf.length !== 2) throw new Error(`${label} deve conter 2 letras.`);
  return uf;
};

const buildOrderBy = (sort = {}) => {
  const entries = Object.entries(sort || {})
    .map(([column, direction]) => {
      if (!SORT_COLUMNS[column]) return null;
      const safeDirection = String(direction).toUpperCase() === "DESC" ? "DESC" : "ASC";
      return `${SORT_COLUMNS[column]} ${safeDirection}`;
    })
    .filter(Boolean);

  return entries.length ? entries.join(", ") : "m.data_emissao DESC, m.mdfe_id DESC";
};

const normalizeVeiculoPayload = (payload = {}) => {
  const placa = String(payload.placa ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);

  if (placa.length !== 7) throw new Error("Placa deve conter 7 caracteres.");

  return {
    proprietario_pessoa_id: parseInteger(payload.proprietario_pessoa_id, {
      allowNull: true,
      label: "Proprietário",
    }),
    placa,
    renavam: onlyDigits(payload.renavam).slice(0, 11) || null,
    uf: normalizeUf(payload.uf, "UF"),
    tara_kg: parseNumeric(payload.tara_kg, { label: "Tara" }),
    capacidade_kg: parseNumeric(payload.capacidade_kg, { label: "Capacidade KG" }),
    capacidade_m3: parseNumeric(payload.capacidade_m3, { label: "Capacidade M3" }),
    tipo_rodado: normalizeText(payload.tipo_rodado, 2, {
      required: true,
      label: "Tipo rodado",
    }),
    tipo_carroceria: normalizeText(payload.tipo_carroceria, 2, {
      required: true,
      label: "Tipo carroceria",
    }),
    tipo_proprietario: normalizeText(payload.tipo_proprietario, 2),
    rntrc: onlyDigits(payload.rntrc).slice(0, 8) || null,
    ativo: parseBoolean(payload.ativo, true),
  };
};

const normalizeMotoristaPayload = (payload = {}) => {
  return {
    pessoa_id: parseInteger(payload.pessoa_id, { allowNull: false, label: "Pessoa" }),
    cnh: normalizeText(payload.cnh, 20),
    telefone: normalizeText(payload.telefone, 20),
    ativo: parseBoolean(payload.ativo, true),
  };
};

const normalizeSeguradoraPayload = (payload = {}) => {
  const cnpj = onlyDigits(payload.cnpj);
  if (cnpj.length !== 14) throw new Error("CNPJ da seguradora deve conter 14 dígitos.");

  return {
    pessoa_id: parseInteger(payload.pessoa_id, { allowNull: true, label: "Pessoa" }),
    nome: normalizeText(payload.nome, 180, { required: true, label: "Nome" }),
    cnpj,
    ativo: parseBoolean(payload.ativo, true),
  };
};

const normalizeDocumento = (documento = {}) => {
  const chave = onlyDigits(documento.chave_acesso);
  if (chave.length !== 44) throw new Error("Chave de acesso do documento deve conter 44 dígitos.");

  const tipo = String(documento.tipo_documento || "nfe").toLowerCase();
  if (!["nfe", "cte"].includes(tipo)) throw new Error("Tipo de documento inválido.");

  const nfeId = parseInteger(documento.nfe_id, { allowNull: true, label: "NF-e" });
  if (tipo === "nfe" && !nfeId) {
    throw new Error("Selecione uma NF-e autorizada do sistema para vincular ao MDF-e.");
  }

  return {
    nfe_id: nfeId,
    tipo_documento: tipo,
    chave_acesso: chave,
    valor_documento: parseNumeric(documento.valor_documento, { label: "Valor do documento" }),
    peso_kg: parseNumeric(documento.peso_kg, { label: "Peso do documento" }),
    municipio_descarga_codigo: onlyDigits(documento.municipio_descarga_codigo).slice(0, 7) || null,
    municipio_descarga_nome: normalizeText(documento.municipio_descarga_nome, 100),
  };
};

const normalizeAverbacoes = (seguro = {}) => {
  const source = Array.isArray(seguro.averbacoes)
    ? seguro.averbacoes
    : String(seguro.averbacoes_texto || "")
        .split(/[\n,;]+/g)
        .map((item) => item.trim());

  return [...new Set(source.map((item) => normalizeText(item, 40)).filter(Boolean))];
};

const normalizeSeguro = (seguro = {}) => {
  const hasData = [
    seguro.seguradora_id,
    seguro.cnpj_responsavel,
    seguro.cpf_responsavel,
    seguro.numero_apolice,
    seguro.averbacoes_texto,
    ...(Array.isArray(seguro.averbacoes) ? seguro.averbacoes : []),
  ].some((value) => String(value ?? "").trim());

  if (!hasData) return null;

  const responsavelSeguro = normalizeText(seguro.responsavel_seguro || "1", 1, {
    required: true,
    label: "Responsável pelo seguro",
  });
  if (!["1", "2"].includes(responsavelSeguro)) {
    throw new Error("Responsável pelo seguro inválido.");
  }

  const cpfResponsavel = onlyDigits(seguro.cpf_responsavel).slice(0, 11) || null;
  const cnpjResponsavel = onlyDigits(seguro.cnpj_responsavel).slice(0, 14) || null;

  if (cpfResponsavel && cpfResponsavel.length !== 11) {
    throw new Error("CPF do responsável pelo seguro deve conter 11 dígitos.");
  }

  if (cnpjResponsavel && cnpjResponsavel.length !== 14) {
    throw new Error("CNPJ do responsável pelo seguro deve conter 14 dígitos.");
  }

  if (responsavelSeguro === "2" && !cpfResponsavel && !cnpjResponsavel) {
    throw new Error("Informe CPF ou CNPJ do responsável pelo seguro.");
  }

  const averbacoes = normalizeAverbacoes(seguro);
  if (!averbacoes.length) {
    throw new Error("Informe ao menos uma averbação para o seguro do MDF-e.");
  }

  return {
    seguradora_id: parseInteger(seguro.seguradora_id, {
      label: "Seguradora do MDF-e",
    }),
    responsavel_seguro: responsavelSeguro,
    cnpj_responsavel: cnpjResponsavel,
    cpf_responsavel: cpfResponsavel,
    numero_apolice: normalizeText(seguro.numero_apolice, 40, {
      required: true,
      label: "Número da apólice",
    }),
    averbacoes,
  };
};

const normalizeCiot = (ciot = {}) => {
  const hasData = [ciot.ciot, ciot.cpf_cnpj_responsavel].some((value) =>
    String(value ?? "").trim()
  );
  if (!hasData) return null;

  const numeroCiot = onlyDigits(ciot.ciot).slice(0, 12);
  if (numeroCiot.length !== 12) throw new Error("CIOT deve conter 12 dígitos.");

  const responsavel = onlyDigits(ciot.cpf_cnpj_responsavel).slice(0, 14);
  if (![11, 14].includes(responsavel.length)) {
    throw new Error("CPF/CNPJ responsável pelo CIOT deve conter 11 ou 14 dígitos.");
  }

  return {
    ciot: numeroCiot,
    cpf_cnpj_responsavel: responsavel,
  };
};

const normalizeManifestoPayload = (payload = {}, defaults = {}) => {
  const documentos = Array.isArray(payload.documentos)
    ? payload.documentos.filter((item) => item?.chave_acesso).map(normalizeDocumento)
    : [];

  if (!documentos.length) throw new Error("Informe ao menos uma NF-e ou CT-e da carga.");

  const condutores = Array.isArray(payload.condutores)
    ? payload.condutores
        .filter((item) => item?.motorista_id)
        .map((item, index) => ({
          motorista_id: parseInteger(item.motorista_id, { label: "Motorista" }),
          principal: index === 0 || parseBoolean(item.principal, false),
          ordem: index + 1,
        }))
    : [];

  if (!condutores.length) throw new Error("Informe ao menos um motorista.");

  const reboques = Array.isArray(payload.reboques)
    ? payload.reboques
        .filter((item) => item?.veiculo_id)
        .slice(0, 3)
        .map((item, index) => ({
          veiculo_id: parseInteger(item.veiculo_id, { label: "Reboque" }),
          ordem: index + 1,
        }))
    : [];

  const percurso = Array.isArray(payload.percurso)
    ? payload.percurso
        .filter((item) => item?.uf)
        .slice(0, 25)
        .map((item, index) => ({
          uf: normalizeUf(item.uf, "UF percurso"),
          ordem: index + 1,
        }))
    : [];

  const descargas = Array.isArray(payload.descargas)
    ? payload.descargas
        .filter((item) => item?.municipio_codigo || item?.municipio_nome)
        .map((item) => ({
          municipio_codigo: normalizeIbgeCode(
            item.municipio_codigo,
            "Código IBGE da descarga"
          ),
          municipio_nome: normalizeText(item.municipio_nome, 100, {
            required: true,
            label: "Município de descarga",
          }),
          uf: normalizeUf(item.uf, "UF da descarga", { required: false }),
        }))
    : [];

  if (!descargas.length) throw new Error("Informe ao menos um município de descarga.");

  const seguros = Array.isArray(payload.seguros)
    ? payload.seguros.map(normalizeSeguro).filter(Boolean)
    : [];

  const ciot = Array.isArray(payload.ciot)
    ? payload.ciot.map(normalizeCiot).filter(Boolean)
    : [];

  const ambiente = normalizeText(payload.ambiente ?? defaults.ambiente_mdfe ?? "2", 1, {
    required: true,
    label: "Ambiente do MDF-e",
  });
  const tipoTransportador = normalizeText(payload.tipo_transportador, 1);

  if (!["1", "2"].includes(ambiente)) {
    throw new Error("Ambiente do MDF-e inválido.");
  }

  if (tipoTransportador && !["1", "2", "3"].includes(tipoTransportador)) {
    throw new Error("Tipo de transportador do MDF-e inválido.");
  }

  return {
    emitente_pessoa_id: parseInteger(payload.emitente_pessoa_id, {
      allowNull: true,
      label: "Emitente",
    }),
    veiculo_tracao_id: parseInteger(payload.veiculo_tracao_id, {
      allowNull: false,
      label: "Veículo tração",
    }),
    serie: parseInteger(payload.serie ?? defaults.serie_mdfe_padrao ?? 1, { label: "Série" }),
    numero: parseInteger(payload.numero ?? defaults.numero ?? null, {
      allowNull: true,
      label: "Número",
    }),
    ambiente,
    tipo_emitente: normalizeText(payload.tipo_emitente || "2", 1, {
      required: true,
      label: "Tipo emitente",
    }),
    modal: normalizeText(payload.modal || "1", 2, { required: true, label: "Modal" }),
    tipo_transportador: tipoTransportador,
    uf_inicio: normalizeUf(payload.uf_inicio, "UF início"),
    uf_fim: normalizeUf(payload.uf_fim, "UF fim"),
    municipio_carregamento_codigo: normalizeIbgeCode(
      payload.municipio_carregamento_codigo,
      "Código IBGE do carregamento"
    ),
    municipio_carregamento_nome: normalizeText(payload.municipio_carregamento_nome, 100, {
      required: true,
      label: "Município de carregamento",
    }),
    observacao: normalizeText(payload.observacao, 5000),
    documentos,
    condutores,
    reboques,
    percurso,
    descargas,
    seguros,
    ciot,
  };
};

class MdfeDAO {
  static async buscarConfiguracaoMdfe(client) {
    const { rows } = await client.query(
      `
        SELECT
          ambiente_mdfe,
          serie_mdfe_padrao
        FROM tenant_configuracao_fiscal
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `
    );

    const row = rows[0] || {};
    return {
      ambiente_mdfe: row.ambiente_mdfe || "2",
      serie_mdfe_padrao: Number(row.serie_mdfe_padrao ?? 1),
    };
  }

  static async listarEntidade(client, type, { page = 1, limit = 20, search = "" } = {}) {
    const config = ENTITY_TABLES[type];
    if (!config) throw new Error("Tipo de cadastro inválido.");

    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        AND excluido = FALSE
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      const terms = config.searchColumns
        .map((column) => `LOWER(COALESCE(${column}::text, '')) LIKE LOWER($${values.length})`)
        .join(" OR ");
      where += ` AND (${terms})`;
    }

    const [listResult, countResult] = await Promise.all([
      client.query(
        `
          SELECT *
          FROM ${config.table}
          ${where}
          ORDER BY ${config.defaultOrder}
          LIMIT $${values.length + 1}
          OFFSET $${values.length + 2}
        `,
        [...values, safeLimit, offset]
      ),
      client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM ${config.table}
          ${where}
        `,
        values
      ),
    ]);

    const total = countResult.rows[0]?.total || 0;
    return {
      data: listResult.rows,
      page: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  static async listarVeiculosSelect(client, { search = "", limit = 20 } = {}) {
    const result = await this.listarEntidade(client, "veiculo", { page: 1, limit, search });
    return result.data.filter((item) => item.ativo);
  }

  static async listarMotoristasSelect(client, { search = "", limit = 20 } = {}) {
    const result = await this.listarEntidade(client, "motorista", { page: 1, limit, search });
    return result.data.filter((item) => item.ativo);
  }

  static async listarSeguradorasSelect(client, { search = "", limit = 20 } = {}) {
    const result = await this.listarEntidade(client, "seguradora", { page: 1, limit, search });
    return result.data.filter((item) => item.ativo);
  }

  static async listarPessoasMotoristaSelect(client, { search = "", limit = 20 } = {}) {
    const values = [];
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE p.pessoa_ativo = TRUE
        AND p.pessoa_excluido = FALSE
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          LOWER(unaccent(p.pessoa_nome_razao)) LIKE LOWER(unaccent($${values.length}))
          OR LOWER(unaccent(COALESCE(p.pessoa_cpf_cnpj, ''))) LIKE LOWER(unaccent($${values.length}))
        )
      `;
    }

    values.push(safeLimit);

    const { rows } = await client.query(
      `
        SELECT
          p.pessoa_id,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj,
          p.pessoa_telefone
        FROM pessoa p
        JOIN pessoa_tenant pt
          ON pt.pessoa_id = p.pessoa_id
         AND pt.tenant_id = ${TENANT_CONTEXT_SQL}
         AND pt.ativo = TRUE
        ${where}
        ORDER BY p.pessoa_nome_razao
        LIMIT $${values.length}
      `,
      values
    );

    return rows;
  }

  static async listarNfesAutorizadasSelect(
    client,
    { search = "", limit = 20, mdfeId = null } = {}
  ) {
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 80) : 20;
    const safeMdfeId = mdfeId ? parseInteger(mdfeId, { label: "MDF-e" }) : null;
    const values = [safeLimit, safeMdfeId];
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE n.tenant_id = ${TENANT_CONTEXT_SQL}
        AND n.modelo = '55'
        AND LOWER(COALESCE(n.status, '')) = 'autorizada'
        AND LENGTH(COALESCE(n.chave_acesso, '')) = 44
        AND NOT EXISTS (
          SELECT 1
          FROM fiscal.mdfe_documento d
          JOIN fiscal.mdfe m
            ON m.mdfe_id = d.mdfe_id
           AND m.tenant_id = d.tenant_id
          WHERE d.tenant_id = n.tenant_id
            AND (d.nfe_id = n.nfe_id OR d.chave_acesso = n.chave_acesso)
            AND m.excluido = FALSE
            AND m.status <> 'cancelado'
            AND ($2::int IS NULL OR d.mdfe_id <> $2::int)
        )
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          CAST(n.numero AS TEXT) LIKE $${values.length}
          OR LOWER(COALESCE(n.chave_acesso, '')) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(dest.pessoa_nome_razao, '')) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(dest.pessoa_cpf_cnpj, '')) LIKE LOWER($${values.length})
        )
      `;
    }

    const { rows } = await client.query(
      `
        SELECT
          n.nfe_id,
          n.serie,
          n.numero,
          n.chave_acesso,
          n.finalidade,
          n.tipo_operacao,
          n.valor_total,
          n.data_autorizacao,
          dest.pessoa_nome_razao AS destinatario_nome_razao,
          dest.pessoa_cpf_cnpj AS destinatario_cpf_cnpj,
          dest_end.cidade AS municipio_descarga_nome,
          dest_end.uf AS municipio_descarga_uf,
          dest_end.codigo_ibge AS municipio_descarga_codigo
        FROM fiscal.nfe n
        LEFT JOIN pessoa dest
          ON dest.pessoa_id = n.destinatario_pessoa_id
        LEFT JOIN LATERAL (
          SELECT cidade, uf, codigo_ibge
          FROM pessoa_endereco
          WHERE pessoa_id = n.destinatario_pessoa_id
            AND tenant_id = n.tenant_id
            AND endereco_tipo = 'principal'
          ORDER BY atualizado_em DESC, criado_em DESC
          LIMIT 1
        ) dest_end ON TRUE
        ${where}
        ORDER BY n.data_autorizacao DESC NULLS LAST, n.nfe_id DESC
        LIMIT $1
      `,
      values
    );

    return rows;
  }

  static async buscarPessoaMotorista(client, pessoaId) {
    const { rows } = await client.query(
      `
        SELECT
          p.pessoa_id,
          p.pessoa_nome_razao,
          p.pessoa_cpf_cnpj,
          p.pessoa_telefone
        FROM pessoa p
        JOIN pessoa_tenant pt
          ON pt.pessoa_id = p.pessoa_id
         AND pt.tenant_id = ${TENANT_CONTEXT_SQL}
         AND pt.ativo = TRUE
        WHERE p.pessoa_id = $1
          AND p.pessoa_ativo = TRUE
          AND p.pessoa_excluido = FALSE
        LIMIT 1
      `,
      [pessoaId]
    );

    const pessoa = rows[0];
    if (!pessoa) throw new Error("Pessoa do motorista não encontrada.");

    const cpf = onlyDigits(pessoa.pessoa_cpf_cnpj);
    if (cpf.length !== 11) {
      throw new Error("A pessoa selecionada para motorista precisa ter CPF válido.");
    }

    return {
      pessoa_id: pessoa.pessoa_id,
      nome: normalizeText(pessoa.pessoa_nome_razao, 180, {
        required: true,
        label: "Nome da pessoa",
      }),
      cpf,
      telefone: normalizeText(pessoa.pessoa_telefone, 20),
    };
  }

  static async validarPessoaVinculada(client, pessoaId, label = "Pessoa") {
    if (!pessoaId) return;

    const { rows } = await client.query(
      `
        SELECT p.pessoa_id
        FROM pessoa p
        JOIN pessoa_tenant pt
          ON pt.pessoa_id = p.pessoa_id
         AND pt.tenant_id = ${TENANT_CONTEXT_SQL}
         AND pt.ativo = TRUE
        WHERE p.pessoa_id = $1
          AND p.pessoa_ativo = TRUE
          AND p.pessoa_excluido = FALSE
        LIMIT 1
      `,
      [pessoaId]
    );

    if (!rows[0]) {
      throw new Error(`${label} não encontrada ou não vinculada à filial atual.`);
    }
  }

  static async validarIdsAtivos(client, { table, idColumn, ids = [], label }) {
    const safeIds = uniqueNumbers(ids);
    if (!safeIds.length) return;

    const { rows } = await client.query(
      `
        SELECT ${idColumn} AS id
        FROM ${table}
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND ${idColumn} = ANY($1::int[])
          AND ativo = TRUE
          AND excluido = FALSE
      `,
      [safeIds]
    );

    const found = new Set(rows.map((row) => Number(row.id)));
    const missing = safeIds.find((id) => !found.has(id));

    if (missing) {
      throw new Error(`${label} não encontrado ou inativo para esta filial.`);
    }
  }

  static async validarNfesVinculadas(client, documentos = []) {
    const nfeDocs = documentos.filter((item) => item.tipo_documento === "nfe" && item.nfe_id);
    const nfeIds = uniqueNumbers(nfeDocs.map((item) => item.nfe_id));
    if (!nfeIds.length) return;

    const { rows } = await client.query(
      `
        SELECT nfe_id, chave_acesso, status
        FROM fiscal.nfe
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND nfe_id = ANY($1::int[])
      `,
      [nfeIds]
    );

    const nfes = new Map(rows.map((row) => [Number(row.nfe_id), row]));

    for (const documento of nfeDocs) {
      const nfe = nfes.get(Number(documento.nfe_id));

      if (!nfe) {
        throw new Error("NF-e vinculada ao MDF-e não pertence à filial atual.");
      }

      if (String(nfe.status || "").toLowerCase() !== "autorizada") {
        throw new Error("Somente NF-e autorizada pode ser vinculada ao MDF-e.");
      }

      const chaveNfe = onlyDigits(nfe.chave_acesso);
      if (chaveNfe && chaveNfe !== documento.chave_acesso) {
        throw new Error("A chave de acesso informada não pertence à NF-e selecionada.");
      }
    }
  }

  static async validarVinculosManifesto(client, data) {
    const reboqueIds = uniqueNumbers(data.reboques.map((item) => item.veiculo_id));

    if (reboqueIds.includes(Number(data.veiculo_tracao_id))) {
      throw new Error("O veículo de tração não pode ser informado também como reboque.");
    }

    await this.validarPessoaVinculada(client, data.emitente_pessoa_id, "Emitente");

    await this.validarIdsAtivos(client, {
      table: "fiscal.mdfe_veiculo",
      idColumn: "mdfe_veiculo_id",
      ids: [data.veiculo_tracao_id, ...reboqueIds],
      label: "Veículo do MDF-e",
    });

    await this.validarIdsAtivos(client, {
      table: "fiscal.mdfe_motorista",
      idColumn: "mdfe_motorista_id",
      ids: data.condutores.map((item) => item.motorista_id),
      label: "Motorista do MDF-e",
    });

    await this.validarIdsAtivos(client, {
      table: "fiscal.mdfe_seguradora",
      idColumn: "mdfe_seguradora_id",
      ids: data.seguros.map((item) => item.seguradora_id),
      label: "Seguradora do MDF-e",
    });

    await this.validarNfesVinculadas(client, data.documentos);
  }

  static async validarEntidadeSemMdfeAtivo(client, type, id) {
    const safeId = parseInteger(id, { label: "Cadastro" });
    let query = null;

    if (type === "veiculo") {
      query = `
        SELECT m.mdfe_id
        FROM fiscal.mdfe m
        WHERE m.tenant_id = ${TENANT_CONTEXT_SQL}
          AND m.excluido = FALSE
          AND m.status NOT IN ('cancelado', 'encerrado')
          AND m.veiculo_tracao_id = $1
        UNION
        SELECT m.mdfe_id
        FROM fiscal.mdfe_reboque r
        JOIN fiscal.mdfe m
          ON m.mdfe_id = r.mdfe_id
         AND m.tenant_id = r.tenant_id
        WHERE r.tenant_id = ${TENANT_CONTEXT_SQL}
          AND r.veiculo_id = $1
          AND m.excluido = FALSE
          AND m.status NOT IN ('cancelado', 'encerrado')
        LIMIT 1
      `;
    }

    if (type === "motorista") {
      query = `
        SELECT m.mdfe_id
        FROM fiscal.mdfe_condutor c
        JOIN fiscal.mdfe m
          ON m.mdfe_id = c.mdfe_id
         AND m.tenant_id = c.tenant_id
        WHERE c.tenant_id = ${TENANT_CONTEXT_SQL}
          AND c.motorista_id = $1
          AND m.excluido = FALSE
          AND m.status NOT IN ('cancelado', 'encerrado')
        LIMIT 1
      `;
    }

    if (type === "seguradora") {
      query = `
        SELECT m.mdfe_id
        FROM fiscal.mdfe_seguro s
        JOIN fiscal.mdfe m
          ON m.mdfe_id = s.mdfe_id
         AND m.tenant_id = s.tenant_id
        WHERE s.tenant_id = ${TENANT_CONTEXT_SQL}
          AND s.seguradora_id = $1
          AND m.excluido = FALSE
          AND m.status NOT IN ('cancelado', 'encerrado')
        LIMIT 1
      `;
    }

    if (!query) return;

    const { rows } = await client.query(query, [safeId]);
    if (rows[0]) {
      throw new Error("Cadastro vinculado a MDF-e ativo não pode ser inativado.");
    }
  }

  static async salvarVeiculo(client, { id = null, payload = {} } = {}) {
    const data = normalizeVeiculoPayload(payload);
    await this.validarPessoaVinculada(client, data.proprietario_pessoa_id, "Proprietário do veículo");

    if (id) {
      const { rows } = await client.query(
        `
          UPDATE fiscal.mdfe_veiculo
          SET
            proprietario_pessoa_id = $1,
            placa = $2,
            renavam = $3,
            uf = $4,
            tara_kg = $5,
            capacidade_kg = $6,
            capacidade_m3 = $7,
            tipo_rodado = $8,
            tipo_carroceria = $9,
            tipo_proprietario = $10,
            rntrc = $11,
            ativo = $12
          WHERE mdfe_veiculo_id = $13
            AND tenant_id = ${TENANT_CONTEXT_SQL}
            AND excluido = FALSE
          RETURNING *
        `,
        [
          data.proprietario_pessoa_id,
          data.placa,
          data.renavam,
          data.uf,
          data.tara_kg,
          data.capacidade_kg,
          data.capacidade_m3,
          data.tipo_rodado,
          data.tipo_carroceria,
          data.tipo_proprietario,
          data.rntrc,
          data.ativo,
          id,
        ]
      );
      if (!rows[0]) throw new Error("Veículo não encontrado.");
      return rows[0];
    }

    const { rows } = await client.query(
      `
        INSERT INTO fiscal.mdfe_veiculo (
          tenant_id, proprietario_pessoa_id, placa, renavam, uf, tara_kg,
          capacidade_kg, capacidade_m3, tipo_rodado, tipo_carroceria,
          tipo_proprietario, rntrc, ativo
        )
        VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `,
      [
        data.proprietario_pessoa_id,
        data.placa,
        data.renavam,
        data.uf,
        data.tara_kg,
        data.capacidade_kg,
        data.capacidade_m3,
        data.tipo_rodado,
        data.tipo_carroceria,
        data.tipo_proprietario,
        data.rntrc,
        data.ativo,
      ]
    );
    return rows[0];
  }

  static async salvarMotorista(client, { id = null, payload = {} } = {}) {
    const data = normalizeMotoristaPayload(payload);
    const pessoa = await this.buscarPessoaMotorista(client, data.pessoa_id);
    const telefone = data.telefone || pessoa.telefone;

    if (id) {
      const { rows } = await client.query(
        `
          UPDATE fiscal.mdfe_motorista
          SET pessoa_id = $1, nome = $2, cpf = $3, cnh = $4, telefone = $5, ativo = $6
          WHERE mdfe_motorista_id = $7
            AND tenant_id = ${TENANT_CONTEXT_SQL}
            AND excluido = FALSE
          RETURNING *
        `,
        [pessoa.pessoa_id, pessoa.nome, pessoa.cpf, data.cnh, telefone, data.ativo, id]
      );
      if (!rows[0]) throw new Error("Motorista não encontrado.");
      return rows[0];
    }

    const { rows } = await client.query(
      `
        INSERT INTO fiscal.mdfe_motorista (
          tenant_id, pessoa_id, nome, cpf, cnh, telefone, ativo
        )
        VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [pessoa.pessoa_id, pessoa.nome, pessoa.cpf, data.cnh, telefone, data.ativo]
    );
    return rows[0];
  }

  static async salvarSeguradora(client, { id = null, payload = {} } = {}) {
    const data = normalizeSeguradoraPayload(payload);
    await this.validarPessoaVinculada(client, data.pessoa_id, "Pessoa da seguradora");

    if (id) {
      const { rows } = await client.query(
        `
          UPDATE fiscal.mdfe_seguradora
          SET pessoa_id = $1, nome = $2, cnpj = $3, ativo = $4
          WHERE mdfe_seguradora_id = $5
            AND tenant_id = ${TENANT_CONTEXT_SQL}
            AND excluido = FALSE
          RETURNING *
        `,
        [data.pessoa_id, data.nome, data.cnpj, data.ativo, id]
      );
      if (!rows[0]) throw new Error("Seguradora não encontrada.");
      return rows[0];
    }

    const { rows } = await client.query(
      `
        INSERT INTO fiscal.mdfe_seguradora (tenant_id, pessoa_id, nome, cnpj, ativo)
        VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3, $4)
        RETURNING *
      `,
      [data.pessoa_id, data.nome, data.cnpj, data.ativo]
    );
    return rows[0];
  }

  static async excluirEntidade(client, type, id) {
    const config = ENTITY_TABLES[type];
    if (!config) throw new Error("Tipo de cadastro inválido.");
    await this.validarEntidadeSemMdfeAtivo(client, type, id);

    const { rows } = await client.query(
      `
        UPDATE ${config.table}
        SET excluido = TRUE, ativo = FALSE
        WHERE ${config.id} = $1
          AND tenant_id = ${TENANT_CONTEXT_SQL}
          AND excluido = FALSE
        RETURNING *
      `,
      [id]
    );

    if (!rows[0]) throw new Error("Cadastro não encontrado.");
    return rows[0];
  }

  static async listarManifestos(client, { page = 1, limit = 20, search = "", sort = {} } = {}) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    const normalizedSearch = String(search || "").trim();

    let where = `
      WHERE m.tenant_id = ${TENANT_CONTEXT_SQL}
        AND m.excluido = FALSE
    `;

    if (normalizedSearch) {
      values.push(`%${normalizedSearch}%`);
      where += `
        AND (
          CAST(m.mdfe_id AS TEXT) LIKE $${values.length}
          OR CAST(COALESCE(m.numero, 0) AS TEXT) LIKE $${values.length}
          OR LOWER(COALESCE(m.chave_acesso, '')) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(v.placa, '')) LIKE LOWER($${values.length})
          OR LOWER(COALESCE(m.municipio_carregamento_nome, '')) LIKE LOWER($${values.length})
        )
      `;
    }

    const orderBy = buildOrderBy(sort);
    const [listResult, countResult] = await Promise.all([
      client.query(
        `
          SELECT
            m.*,
            v.placa AS veiculo_placa,
            v.uf AS veiculo_uf,
            COUNT(DISTINCT d.mdfe_documento_id)::int AS documentos_count,
            COUNT(DISTINCT c.mdfe_condutor_id)::int AS condutores_count
          FROM fiscal.mdfe m
          LEFT JOIN fiscal.mdfe_veiculo v
            ON v.mdfe_veiculo_id = m.veiculo_tracao_id
           AND v.tenant_id = m.tenant_id
          LEFT JOIN fiscal.mdfe_documento d
            ON d.mdfe_id = m.mdfe_id
           AND d.tenant_id = m.tenant_id
          LEFT JOIN fiscal.mdfe_condutor c
            ON c.mdfe_id = m.mdfe_id
           AND c.tenant_id = m.tenant_id
          ${where}
          GROUP BY m.mdfe_id, v.placa, v.uf
          ORDER BY ${orderBy}
          LIMIT $${values.length + 1}
          OFFSET $${values.length + 2}
        `,
        [...values, safeLimit, offset]
      ),
      client.query(
        `
          SELECT COUNT(*)::int AS total
          FROM fiscal.mdfe m
          LEFT JOIN fiscal.mdfe_veiculo v
            ON v.mdfe_veiculo_id = m.veiculo_tracao_id
           AND v.tenant_id = m.tenant_id
          ${where}
        `,
        values
      ),
    ]);

    const total = countResult.rows[0]?.total || 0;
    return {
      data: listResult.rows,
      page: safePage,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  static async buscarManifestoPorId(client, id) {
    const { rows } = await client.query(
      `
        SELECT
          m.*,
          v.placa AS veiculo_placa
        FROM fiscal.mdfe m
        LEFT JOIN fiscal.mdfe_veiculo v
          ON v.mdfe_veiculo_id = m.veiculo_tracao_id
         AND v.tenant_id = m.tenant_id
        WHERE m.mdfe_id = $1
          AND m.tenant_id = ${TENANT_CONTEXT_SQL}
          AND m.excluido = FALSE
      `,
      [id]
    );

    const manifesto = rows[0];
    if (!manifesto) return null;

    const [condutores, reboques, percurso, descargas, documentos, seguros, ciot] = await Promise.all([
      client.query(
        `
          SELECT c.*, mot.nome, mot.cpf
          FROM fiscal.mdfe_condutor c
          JOIN fiscal.mdfe_motorista mot
            ON mot.mdfe_motorista_id = c.motorista_id
           AND mot.tenant_id = c.tenant_id
          WHERE c.tenant_id = ${TENANT_CONTEXT_SQL}
            AND c.mdfe_id = $1
          ORDER BY c.ordem, c.mdfe_condutor_id
        `,
        [id]
      ),
      client.query(
        `
          SELECT r.*, v.placa, v.uf
          FROM fiscal.mdfe_reboque r
          JOIN fiscal.mdfe_veiculo v
            ON v.mdfe_veiculo_id = r.veiculo_id
           AND v.tenant_id = r.tenant_id
          WHERE r.tenant_id = ${TENANT_CONTEXT_SQL}
            AND r.mdfe_id = $1
          ORDER BY r.ordem, r.mdfe_reboque_id
        `,
        [id]
      ),
      client.query(
        `
          SELECT *
          FROM fiscal.mdfe_percurso
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND mdfe_id = $1
          ORDER BY ordem, mdfe_percurso_id
        `,
        [id]
      ),
      client.query(
        `
          SELECT *
          FROM fiscal.mdfe_descarga
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND mdfe_id = $1
          ORDER BY mdfe_descarga_id
        `,
        [id]
      ),
      client.query(
        `
          SELECT
            d.*,
            n.serie AS nfe_serie,
            n.numero AS nfe_numero,
            n.finalidade AS nfe_finalidade,
            n.tipo_operacao AS nfe_tipo_operacao,
            n.valor_total AS nfe_valor_total,
            n.data_autorizacao AS nfe_data_autorizacao,
            dest.pessoa_nome_razao AS nfe_destinatario_nome_razao,
            dest.pessoa_cpf_cnpj AS nfe_destinatario_cpf_cnpj,
            dest_end.cidade AS nfe_municipio_descarga_nome,
            dest_end.uf AS nfe_municipio_descarga_uf,
            dest_end.codigo_ibge AS nfe_municipio_descarga_codigo
          FROM fiscal.mdfe_documento d
          LEFT JOIN fiscal.nfe n
            ON n.nfe_id = d.nfe_id
           AND n.tenant_id = d.tenant_id
          LEFT JOIN pessoa dest
            ON dest.pessoa_id = n.destinatario_pessoa_id
          LEFT JOIN LATERAL (
            SELECT cidade, uf, codigo_ibge
            FROM pessoa_endereco
            WHERE pessoa_id = n.destinatario_pessoa_id
              AND tenant_id = n.tenant_id
              AND endereco_tipo = 'principal'
            ORDER BY atualizado_em DESC, criado_em DESC
            LIMIT 1
          ) dest_end ON TRUE
          WHERE d.tenant_id = ${TENANT_CONTEXT_SQL}
            AND d.mdfe_id = $1
          ORDER BY mdfe_documento_id
        `,
        [id]
      ),
      client.query(
        `
          SELECT
            s.*,
            seg.nome AS seguradora_nome,
            seg.cnpj AS seguradora_cnpj,
            COALESCE(
              jsonb_agg(a.numero_averbacao ORDER BY a.mdfe_seguro_averbacao_id)
                FILTER (WHERE a.mdfe_seguro_averbacao_id IS NOT NULL),
              '[]'::jsonb
            ) AS averbacoes
          FROM fiscal.mdfe_seguro s
          JOIN fiscal.mdfe_seguradora seg
            ON seg.mdfe_seguradora_id = s.seguradora_id
           AND seg.tenant_id = s.tenant_id
          LEFT JOIN fiscal.mdfe_seguro_averbacao a
            ON a.mdfe_seguro_id = s.mdfe_seguro_id
           AND a.tenant_id = s.tenant_id
          WHERE s.tenant_id = ${TENANT_CONTEXT_SQL}
            AND s.mdfe_id = $1
          GROUP BY s.mdfe_seguro_id, seg.nome, seg.cnpj
          ORDER BY s.mdfe_seguro_id
        `,
        [id]
      ),
      client.query(
        `
          SELECT *
          FROM fiscal.mdfe_ciot
          WHERE tenant_id = ${TENANT_CONTEXT_SQL}
            AND mdfe_id = $1
          ORDER BY mdfe_ciot_id
        `,
        [id]
      ),
    ]);

    return {
      ...manifesto,
      condutores: condutores.rows,
      reboques: reboques.rows,
      percurso: percurso.rows,
      descargas: descargas.rows,
      documentos: documentos.rows,
      seguros: seguros.rows,
      ciot: ciot.rows,
    };
  }

  static async salvarManifesto(client, { id = null, payload = {}, usuarioId = null } = {}) {
    const configuracaoMdfe = await this.buscarConfiguracaoMdfe(client);
    let manifestoAtual = null;

    if (id) {
      const { rows } = await client.query(
        `
          SELECT serie, numero, ambiente
          FROM fiscal.mdfe
          WHERE mdfe_id = $1
            AND tenant_id = ${TENANT_CONTEXT_SQL}
            AND excluido = FALSE
          LIMIT 1
        `,
        [id]
      );
      manifestoAtual = rows[0] || null;
    }

    const data = normalizeManifestoPayload(payload, {
      ...configuracaoMdfe,
      serie_mdfe_padrao: manifestoAtual?.serie ?? configuracaoMdfe.serie_mdfe_padrao,
      ambiente_mdfe: manifestoAtual?.ambiente ?? configuracaoMdfe.ambiente_mdfe,
      numero: manifestoAtual?.numero ?? null,
    });
    await this.validarVinculosManifesto(client, data);
    const valorTotalCarga = data.documentos.reduce(
      (total, item) => total + Number(item.valor_documento || 0),
      0
    );
    const pesoBrutoKg = data.documentos.reduce((total, item) => total + Number(item.peso_kg || 0), 0);

    await client.query("BEGIN");
    try {
      let manifesto;

      if (id) {
        const statusResult = await client.query(
          `
            SELECT status
            FROM fiscal.mdfe
            WHERE mdfe_id = $1
              AND tenant_id = ${TENANT_CONTEXT_SQL}
              AND excluido = FALSE
          `,
          [id]
        );

        const status = statusResult.rows[0]?.status;
        if (!status) throw new Error("MDF-e não encontrado.");
        if (!["rascunho", "rejeitado"].includes(status)) {
          throw new Error("Somente MDF-e em rascunho ou rejeitado pode ser alterado.");
        }

        const { rows } = await client.query(
          `
            UPDATE fiscal.mdfe
            SET
              emitente_pessoa_id = $1,
              veiculo_tracao_id = $2,
              serie = $3,
              numero = $4,
              ambiente = $5,
              tipo_emitente = $6,
              modal = $7,
              tipo_transportador = $8,
              uf_inicio = $9,
              uf_fim = $10,
              municipio_carregamento_codigo = $11,
              municipio_carregamento_nome = $12,
              valor_total_carga = $13,
              peso_bruto_kg = $14,
              quantidade_documentos = $15,
              observacao = $16
            WHERE mdfe_id = $17
              AND tenant_id = ${TENANT_CONTEXT_SQL}
              AND excluido = FALSE
            RETURNING *
          `,
          [
            data.emitente_pessoa_id,
            data.veiculo_tracao_id,
            data.serie,
            data.numero,
            data.ambiente,
            data.tipo_emitente,
            data.modal,
            data.tipo_transportador,
            data.uf_inicio,
            data.uf_fim,
            data.municipio_carregamento_codigo,
            data.municipio_carregamento_nome,
            valorTotalCarga,
            pesoBrutoKg,
            data.documentos.length,
            data.observacao,
            id,
          ]
        );
        manifesto = rows[0];

        await client.query(
          `DELETE FROM fiscal.mdfe_documento WHERE tenant_id = ${TENANT_CONTEXT_SQL} AND mdfe_id = $1`,
          [id]
        );
        await client.query(
          `DELETE FROM fiscal.mdfe_condutor WHERE tenant_id = ${TENANT_CONTEXT_SQL} AND mdfe_id = $1`,
          [id]
        );
        await client.query(
          `DELETE FROM fiscal.mdfe_reboque WHERE tenant_id = ${TENANT_CONTEXT_SQL} AND mdfe_id = $1`,
          [id]
        );
        await client.query(
          `DELETE FROM fiscal.mdfe_percurso WHERE tenant_id = ${TENANT_CONTEXT_SQL} AND mdfe_id = $1`,
          [id]
        );
        await client.query(
          `DELETE FROM fiscal.mdfe_descarga WHERE tenant_id = ${TENANT_CONTEXT_SQL} AND mdfe_id = $1`,
          [id]
        );
        await client.query(
          `DELETE FROM fiscal.mdfe_seguro WHERE tenant_id = ${TENANT_CONTEXT_SQL} AND mdfe_id = $1`,
          [id]
        );
        await client.query(
          `DELETE FROM fiscal.mdfe_ciot WHERE tenant_id = ${TENANT_CONTEXT_SQL} AND mdfe_id = $1`,
          [id]
        );
      } else {
        const { rows } = await client.query(
          `
            INSERT INTO fiscal.mdfe (
              tenant_id, usuario_id, emitente_pessoa_id, veiculo_tracao_id, serie, numero,
              ambiente, tipo_emitente, modal, tipo_transportador, uf_inicio, uf_fim,
              municipio_carregamento_codigo, municipio_carregamento_nome,
              valor_total_carga, peso_bruto_kg, quantidade_documentos, observacao
            )
            VALUES (
              ${TENANT_CONTEXT_SQL}, $1, $2, $3, $4, $5, $6, $7, $8, $9,
              $10, $11, $12, $13, $14, $15, $16, $17
            )
            RETURNING *
          `,
          [
            usuarioId,
            data.emitente_pessoa_id,
            data.veiculo_tracao_id,
            data.serie,
            data.numero,
            data.ambiente,
            data.tipo_emitente,
            data.modal,
            data.tipo_transportador,
            data.uf_inicio,
            data.uf_fim,
            data.municipio_carregamento_codigo,
            data.municipio_carregamento_nome,
            valorTotalCarga,
            pesoBrutoKg,
            data.documentos.length,
            data.observacao,
          ]
        );
        manifesto = rows[0];
      }

      const manifestoId = manifesto.mdfe_id;

      for (const [index, condutor] of data.condutores.entries()) {
        await client.query(
          `
            INSERT INTO fiscal.mdfe_condutor (
              tenant_id, mdfe_id, motorista_id, principal, ordem
            )
            VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3, $4)
          `,
          [manifestoId, condutor.motorista_id, index === 0 || condutor.principal, condutor.ordem]
        );
      }

      for (const reboque of data.reboques) {
        await client.query(
          `
            INSERT INTO fiscal.mdfe_reboque (tenant_id, mdfe_id, veiculo_id, ordem)
            VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3)
          `,
          [manifestoId, reboque.veiculo_id, reboque.ordem]
        );
      }

      for (const item of data.percurso) {
        await client.query(
          `
            INSERT INTO fiscal.mdfe_percurso (tenant_id, mdfe_id, uf, ordem)
            VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3)
          `,
          [manifestoId, item.uf, item.ordem]
        );
      }

      for (const descarga of data.descargas) {
        await client.query(
          `
            INSERT INTO fiscal.mdfe_descarga (
              tenant_id, mdfe_id, municipio_codigo, municipio_nome, uf
            )
            VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3, $4)
          `,
          [
            manifestoId,
            descarga.municipio_codigo,
            descarga.municipio_nome,
            descarga.uf,
          ]
        );
      }

      for (const documento of data.documentos) {
        await client.query(
          `
            INSERT INTO fiscal.mdfe_documento (
              tenant_id, mdfe_id, nfe_id, tipo_documento, chave_acesso,
              valor_documento, peso_kg, municipio_descarga_codigo, municipio_descarga_nome
            )
            VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            manifestoId,
            documento.nfe_id,
            documento.tipo_documento,
            documento.chave_acesso,
            documento.valor_documento,
            documento.peso_kg,
            documento.municipio_descarga_codigo,
            documento.municipio_descarga_nome,
          ]
        );
      }

      for (const seguro of data.seguros) {
        const { rows } = await client.query(
          `
            INSERT INTO fiscal.mdfe_seguro (
              tenant_id, mdfe_id, seguradora_id, responsavel_seguro,
              cnpj_responsavel, cpf_responsavel, numero_apolice
            )
            VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3, $4, $5, $6)
            RETURNING mdfe_seguro_id
          `,
          [
            manifestoId,
            seguro.seguradora_id,
            seguro.responsavel_seguro,
            seguro.cnpj_responsavel,
            seguro.cpf_responsavel,
            seguro.numero_apolice,
          ]
        );

        const seguroId = rows[0].mdfe_seguro_id;
        for (const numeroAverbacao of seguro.averbacoes) {
          await client.query(
            `
              INSERT INTO fiscal.mdfe_seguro_averbacao (
                tenant_id, mdfe_seguro_id, numero_averbacao
              )
              VALUES (${TENANT_CONTEXT_SQL}, $1, $2)
            `,
            [seguroId, numeroAverbacao]
          );
        }
      }

      for (const item of data.ciot) {
        await client.query(
          `
            INSERT INTO fiscal.mdfe_ciot (
              tenant_id, mdfe_id, ciot, cpf_cnpj_responsavel
            )
            VALUES (${TENANT_CONTEXT_SQL}, $1, $2, $3)
          `,
          [manifestoId, item.ciot, item.cpf_cnpj_responsavel]
        );
      }

      await client.query("COMMIT");
      return this.buscarManifestoPorId(client, manifestoId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async excluirManifesto(client, id) {
    const { rows } = await client.query(
      `
        UPDATE fiscal.mdfe
        SET excluido = TRUE
        WHERE mdfe_id = $1
          AND tenant_id = ${TENANT_CONTEXT_SQL}
          AND excluido = FALSE
          AND status IN ('rascunho', 'rejeitado')
        RETURNING *
      `,
      [id]
    );

    if (!rows[0]) {
      throw new Error("MDF-e não encontrado ou não pode ser excluído.");
    }

    return rows[0];
  }
}

export default MdfeDAO;
