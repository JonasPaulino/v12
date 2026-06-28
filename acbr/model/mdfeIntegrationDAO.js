import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");
const parseInteger = (value, { label = "Campo", min = 1 } = {}) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`${label} inválido.`);
  }
  return parsed;
};

const buildSetClause = (payload = {}) => {
  const values = [];
  const setClause = Object.entries(payload)
    .filter(([, value]) => value !== undefined)
    .map(([column, value]) => {
      values.push(value);
      return `${column} = $${values.length}`;
    })
    .join(", ");

  return { setClause, values };
};

const hasValidIbgeCode = (value) => /^\d{7}$/.test(onlyDigits(value));

const sha256 = async (value) => {
  const crypto = await import("crypto");
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
};

class MdfeIntegrationDAO {
  static async carregarContextoStatus(client) {
    const { rows } = await client.query(
      `
        SELECT
          t.tenant_id,
          COALESCE(p.pessoa_cpf_cnpj, t.tenant_documento) AS documento,
          pe.uf,
          cfg.ambiente_nfe,
          cert.conteudo_pfx,
          cert.senha_criptografada
        FROM tenant t
        LEFT JOIN pessoa p ON p.pessoa_id = t.pessoa_id
        LEFT JOIN LATERAL (
          SELECT uf
          FROM pessoa_endereco
          WHERE pessoa_id = t.pessoa_id
            AND tenant_id = t.tenant_id
            AND endereco_tipo = 'principal'
          ORDER BY atualizado_em DESC, criado_em DESC
          LIMIT 1
        ) pe ON TRUE
        LEFT JOIN tenant_configuracao_fiscal cfg ON cfg.tenant_id = t.tenant_id
        LEFT JOIN tenant_certificado_a1 cert ON cert.tenant_id = t.tenant_id
        WHERE t.tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `
    );

    const row = rows[0];
    if (!row) {
      throw new Error("Filial não encontrada para consultar o status do MDF-e.");
    }

    const cnpjCpf = onlyDigits(row.documento);
    if (!cnpjCpf) {
      throw new Error("CNPJ/CPF da filial não configurado para consulta do MDF-e.");
    }

    if (!row.uf) {
      throw new Error("UF da filial não configurada para consulta do MDF-e.");
    }

    if (!row.conteudo_pfx || !row.senha_criptografada) {
      throw new Error("Certificado A1 da filial não configurado para consulta do MDF-e.");
    }

    return {
      tenantId: row.tenant_id,
      cnpjCpf,
      uf: String(row.uf || "").trim().toUpperCase(),
      ambiente: row.ambiente_nfe || "2",
      certificado: {
        conteudo_pfx: row.conteudo_pfx,
        senha_criptografada: row.senha_criptografada,
      },
    };
  }

  static async reservarNumero(client, mdfeId) {
    const safeMdfeId = parseInteger(mdfeId, { label: "MDF-e" });

    const mdfeResult = await client.query(
      `
        SELECT mdfe_id, numero
        FROM fiscal.mdfe
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND mdfe_id = $1
          AND excluido = FALSE
        FOR UPDATE
      `,
      [safeMdfeId]
    );

    const mdfeRow = mdfeResult.rows[0];
    if (!mdfeRow) {
      throw new Error("MDF-e não encontrado.");
    }

    if (mdfeRow.numero) {
      return Number(mdfeRow.numero);
    }

    const configResult = await client.query(
      `
        SELECT tenant_id, COALESCE(proximo_numero_mdfe, 1) AS proximo_numero_mdfe
        FROM tenant_configuracao_fiscal
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        FOR UPDATE
      `
    );

    const configRow = configResult.rows[0];
    if (!configRow) {
      throw new Error("Configuração fiscal da filial não encontrada.");
    }

    const numero = Number(configRow.proximo_numero_mdfe || 1);

    await client.query(
      `
        UPDATE fiscal.mdfe
        SET numero = $2
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND mdfe_id = $1
      `,
      [safeMdfeId, numero]
    );

    await client.query(
      `
        UPDATE tenant_configuracao_fiscal
        SET proximo_numero_mdfe = $1 + 1
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
      `,
      [numero]
    );

    return numero;
  }

  static async carregarContexto(client, mdfeId) {
    const safeMdfeId = parseInteger(mdfeId, { label: "MDF-e" });

    const { rows } = await client.query(
      `
        SELECT
          m.*,
          COALESCE(m.emitente_pessoa_id, t.pessoa_id) AS emitente_pessoa_id_resolvido,
          cfg.mdfe_habilitado,
          cfg.ambiente_nfe,
          cert.conteudo_pfx,
          cert.senha_criptografada,
          emit.pessoa_nome_razao AS emitente_nome_razao,
          emit.pessoa_nome_fantasia AS emitente_nome_fantasia,
          emit.pessoa_cpf_cnpj AS emitente_cpf_cnpj,
          emit.pessoa_inscricao_estadual AS emitente_ie,
          emit.pessoa_email AS emitente_email,
          emit.pessoa_telefone AS emitente_telefone,
          ee.cep AS emitente_cep,
          ee.logradouro AS emitente_logradouro,
          ee.numero AS emitente_numero,
          ee.complemento AS emitente_complemento,
          ee.bairro AS emitente_bairro,
          ee.cidade AS emitente_cidade,
          ee.uf AS emitente_uf,
          ee.codigo_ibge AS emitente_codigo_ibge,
          vt.placa AS tracao_placa,
          vt.renavam AS tracao_renavam,
          vt.uf AS tracao_uf,
          vt.tara_kg AS tracao_tara_kg,
          vt.capacidade_kg AS tracao_capacidade_kg,
          vt.capacidade_m3 AS tracao_capacidade_m3,
          vt.tipo_rodado AS tracao_tipo_rodado,
          vt.tipo_carroceria AS tracao_tipo_carroceria,
          vt.rntrc AS tracao_rntrc,
          prop.pessoa_nome_razao AS proprietario_nome_razao,
          prop.pessoa_cpf_cnpj AS proprietario_cpf_cnpj,
          prop.pessoa_inscricao_estadual AS proprietario_ie,
          prop_end.uf AS proprietario_uf,
          vt.tipo_proprietario AS proprietario_tipo,
          vt.rntrc AS proprietario_rntrc
        FROM fiscal.mdfe m
        JOIN tenant t ON t.tenant_id = m.tenant_id
        LEFT JOIN tenant_configuracao_fiscal cfg ON cfg.tenant_id = m.tenant_id
        LEFT JOIN tenant_certificado_a1 cert ON cert.tenant_id = m.tenant_id
        LEFT JOIN pessoa emit ON emit.pessoa_id = COALESCE(m.emitente_pessoa_id, t.pessoa_id)
        LEFT JOIN pessoa_endereco ee
          ON ee.pessoa_id = emit.pessoa_id
         AND ee.tenant_id = m.tenant_id
         AND ee.endereco_tipo = 'principal'
        LEFT JOIN fiscal.mdfe_veiculo vt
          ON vt.mdfe_veiculo_id = m.veiculo_tracao_id
         AND vt.tenant_id = m.tenant_id
        LEFT JOIN pessoa prop ON prop.pessoa_id = vt.proprietario_pessoa_id
        LEFT JOIN pessoa_endereco prop_end
          ON prop_end.pessoa_id = prop.pessoa_id
         AND prop_end.tenant_id = m.tenant_id
         AND prop_end.endereco_tipo = 'principal'
        WHERE m.tenant_id = ${TENANT_CONTEXT_SQL}
          AND m.mdfe_id = $1
          AND m.excluido = FALSE
        LIMIT 1
      `,
      [safeMdfeId]
    );

    const row = rows[0];
    if (!row) {
      throw new Error("MDF-e não encontrado.");
    }

    const [condutores, reboques, percurso, descargas, documentos, seguros, ciot] =
      await Promise.all([
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
          [safeMdfeId]
        ),
        client.query(
          `
            SELECT r.*, v.placa, v.renavam, v.uf, v.tara_kg, v.capacidade_kg,
                   v.capacidade_m3, v.tipo_rodado, v.tipo_carroceria
            FROM fiscal.mdfe_reboque r
            JOIN fiscal.mdfe_veiculo v
              ON v.mdfe_veiculo_id = r.veiculo_id
             AND v.tenant_id = r.tenant_id
            WHERE r.tenant_id = ${TENANT_CONTEXT_SQL}
              AND r.mdfe_id = $1
            ORDER BY r.ordem, r.mdfe_reboque_id
          `,
          [safeMdfeId]
        ),
        client.query(
          `
            SELECT *
            FROM fiscal.mdfe_percurso
            WHERE tenant_id = ${TENANT_CONTEXT_SQL}
              AND mdfe_id = $1
            ORDER BY ordem, mdfe_percurso_id
          `,
          [safeMdfeId]
        ),
        client.query(
          `
            SELECT *
            FROM fiscal.mdfe_descarga
            WHERE tenant_id = ${TENANT_CONTEXT_SQL}
              AND mdfe_id = $1
            ORDER BY mdfe_descarga_id
          `,
          [safeMdfeId]
        ),
        client.query(
          `
            SELECT *
            FROM fiscal.mdfe_documento
            WHERE tenant_id = ${TENANT_CONTEXT_SQL}
              AND mdfe_id = $1
            ORDER BY mdfe_documento_id
          `,
          [safeMdfeId]
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
            LEFT JOIN fiscal.mdfe_seguradora seg
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
          [safeMdfeId]
        ),
        client.query(
          `
            SELECT *
            FROM fiscal.mdfe_ciot
            WHERE tenant_id = ${TENANT_CONTEXT_SQL}
              AND mdfe_id = $1
            ORDER BY mdfe_ciot_id
          `,
          [safeMdfeId]
        ),
      ]);

    return {
      mdfe: {
        mdfe_id: row.mdfe_id,
        tenant_id: row.tenant_id,
        usuario_id: row.usuario_id,
        emitente_pessoa_id: row.emitente_pessoa_id_resolvido,
        veiculo_tracao_id: row.veiculo_tracao_id,
        serie: Number(row.serie || 1),
        numero: row.numero ? Number(row.numero) : null,
        ambiente: row.ambiente || row.ambiente_nfe || "2",
        tipo_emitente: row.tipo_emitente || "2",
        modal: row.modal || "1",
        tipo_transportador: row.tipo_transportador || "",
        uf_inicio: row.uf_inicio,
        uf_fim: row.uf_fim,
        municipio_carregamento_codigo: row.municipio_carregamento_codigo,
        municipio_carregamento_nome: row.municipio_carregamento_nome,
        status: row.status,
        chave_acesso: row.chave_acesso || "",
        protocolo: row.protocolo || "",
        recibo: row.recibo || "",
        valor_total_carga: Number(row.valor_total_carga || 0),
        peso_bruto_kg: Number(row.peso_bruto_kg || 0),
        quantidade_documentos: Number(row.quantidade_documentos || 0),
        observacao: row.observacao || "",
        codigo_numerico: Number(`${row.mdfe_id}${row.serie}`.slice(-8).padStart(8, "0")),
      },
      configuracao: {
        mdfe_habilitado: row.mdfe_habilitado !== false,
      },
      certificado: {
        conteudo_pfx: row.conteudo_pfx || null,
        senha_criptografada: row.senha_criptografada || null,
      },
      emitente: {
        pessoa_id: row.emitente_pessoa_id_resolvido,
        nome_razao: row.emitente_nome_razao || "",
        nome_fantasia: row.emitente_nome_fantasia || "",
        cpf_cnpj: row.emitente_cpf_cnpj || "",
        inscricao_estadual: row.emitente_ie || "",
        email: row.emitente_email || "",
        telefone: row.emitente_telefone || "",
        cep: row.emitente_cep || "",
        logradouro: row.emitente_logradouro || "",
        numero: row.emitente_numero || "",
        complemento: row.emitente_complemento || "",
        bairro: row.emitente_bairro || "",
        cidade: row.emitente_cidade || "",
        uf: row.emitente_uf || row.uf_inicio || "",
        codigo_ibge: row.emitente_codigo_ibge || "",
      },
      veiculoTracao: {
        placa: row.tracao_placa || "",
        renavam: row.tracao_renavam || "",
        uf: row.tracao_uf || "",
        tara_kg: Number(row.tracao_tara_kg || 0),
        capacidade_kg: Number(row.tracao_capacidade_kg || 0),
        capacidade_m3: Number(row.tracao_capacidade_m3 || 0),
        tipo_rodado: row.tracao_tipo_rodado || "01",
        tipo_carroceria: row.tracao_tipo_carroceria || "00",
        rntrc: row.tracao_rntrc || "",
        proprietario: {
          nome_razao: row.proprietario_nome_razao || "",
          cpf_cnpj: row.proprietario_cpf_cnpj || "",
          inscricao_estadual: row.proprietario_ie || "",
          uf: row.proprietario_uf || "",
          tipo_proprietario: row.proprietario_tipo || "",
          rntrc: row.proprietario_rntrc || "",
        },
      },
      condutores: condutores.rows.map((item) => ({
        nome: item.nome || "",
        cpf: item.cpf || "",
        principal: !!item.principal,
        ordem: Number(item.ordem || 1),
      })),
      reboques: reboques.rows.map((item) => ({
        placa: item.placa || "",
        renavam: item.renavam || "",
        uf: item.uf || "",
        tara_kg: Number(item.tara_kg || 0),
        capacidade_kg: Number(item.capacidade_kg || 0),
        capacidade_m3: Number(item.capacidade_m3 || 0),
        tipo_rodado: item.tipo_rodado || "01",
        tipo_carroceria: item.tipo_carroceria || "00",
      })),
      percurso: percurso.rows.map((item) => ({
        uf: item.uf,
        ordem: Number(item.ordem || 1),
      })),
      descargas: descargas.rows.map((item) => ({
        municipio_codigo: item.municipio_codigo,
        municipio_nome: item.municipio_nome,
        uf: item.uf || "",
      })),
      documentos: documentos.rows.map((item) => ({
        tipo_documento: item.tipo_documento || "nfe",
        chave_acesso: item.chave_acesso || "",
        valor_documento: Number(item.valor_documento || 0),
        peso_kg: Number(item.peso_kg || 0),
        municipio_descarga_codigo: item.municipio_descarga_codigo || "",
        municipio_descarga_nome: item.municipio_descarga_nome || "",
      })),
      seguros: seguros.rows.map((item) => ({
        responsavel_seguro: item.responsavel_seguro || "",
        cnpj_responsavel: item.cnpj_responsavel || "",
        cpf_responsavel: item.cpf_responsavel || "",
        numero_apolice: item.numero_apolice || "",
        seguradora_nome: item.seguradora_nome || "",
        seguradora_cnpj: item.seguradora_cnpj || "",
        averbacoes: Array.isArray(item.averbacoes) ? item.averbacoes : [],
      })),
      ciot: ciot.rows.map((item) => ({
        ciot: item.ciot || "",
        cpf_cnpj_responsavel: item.cpf_cnpj_responsavel || "",
      })),
    };
  }

  static validarContexto(context) {
    if (!["rascunho", "rejeitado", "validado"].includes(context.mdfe.status)) {
      throw new Error("Somente MDF-e em rascunho, rejeitado ou validado pode ser processado.");
    }

    if (!context.configuracao.mdfe_habilitado) {
      throw new Error("O MDF-e não está habilitado para esta filial.");
    }

    if (!context.certificado.conteudo_pfx || !context.certificado.senha_criptografada) {
      throw new Error("Certificado A1 da filial não configurado para emissão do MDF-e.");
    }

    if (!onlyDigits(context.emitente.cpf_cnpj)) {
      throw new Error("Emitente sem CNPJ válido para emissão do MDF-e.");
    }

    const emitenteRequired = [
      ["nome_razao", "nome/razão social do emitente"],
      ["inscricao_estadual", "inscrição estadual do emitente"],
      ["cidade", "cidade do emitente"],
      ["uf", "UF do emitente"],
      ["codigo_ibge", "código IBGE do emitente"],
    ];

    const missingEmitente = emitenteRequired.find(([field]) => !String(context.emitente[field] || "").trim());
    if (missingEmitente) {
      throw new Error(`Preencha ${missingEmitente[1]} antes de emitir o MDF-e.`);
    }

    if (!hasValidIbgeCode(context.emitente.codigo_ibge)) {
      throw new Error("Código IBGE do emitente precisa ter 7 dígitos.");
    }

    if (!context.veiculoTracao.placa) {
      throw new Error("Informe o veículo de tração do MDF-e.");
    }

    if (!context.veiculoTracao.renavam) {
      throw new Error("Informe o RENAVAM do veículo de tração antes de emitir o MDF-e.");
    }

    if (!context.veiculoTracao.uf) {
      throw new Error("Informe a UF do veículo de tração antes de emitir o MDF-e.");
    }

    if (!context.condutores.length) {
      throw new Error("Informe ao menos um motorista para emitir o MDF-e.");
    }

    const condutorSemCpf = context.condutores.find((item) => onlyDigits(item.cpf).length !== 11);
    if (condutorSemCpf) {
      throw new Error(`Motorista ${condutorSemCpf.nome || ""} sem CPF válido.`);
    }

    if (!context.descargas.length) {
      throw new Error("Informe ao menos um município de descarga para emitir o MDF-e.");
    }

    const descargaInvalida = context.descargas.find((item) => !hasValidIbgeCode(item.municipio_codigo));
    if (descargaInvalida) {
      throw new Error("Município de descarga precisa ter código IBGE com 7 dígitos.");
    }

    if (!context.documentos.length) {
      throw new Error("Informe ao menos uma NF-e ou CT-e vinculada ao MDF-e.");
    }

    const documentoInvalido = context.documentos.find(
      (item) => onlyDigits(item.chave_acesso).length !== 44
    );
    if (documentoInvalido) {
      throw new Error("Todos os documentos vinculados precisam ter chave de acesso com 44 dígitos.");
    }
  }

  static async atualizarMdfe(client, mdfeId, payload = {}) {
    const safeMdfeId = parseInteger(mdfeId, { label: "MDF-e" });
    const { setClause, values } = buildSetClause(payload);
    if (!setClause) return;

    values.push(safeMdfeId);

    await client.query(
      `
        UPDATE fiscal.mdfe
        SET ${setClause}
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND mdfe_id = $${values.length}
      `,
      values
    );
  }

  static async registrarEvento(client, {
    mdfeId = null,
    usuarioId = null,
    tipoEvento,
    status = "pendente",
    mensagem = null,
    payloadJson = null,
    respostaJson = null,
  }) {
    await client.query(
      `
        INSERT INTO fiscal.mdfe_evento (
          tenant_id,
          mdfe_id,
          usuario_id,
          tipo_evento,
          status,
          mensagem,
          payload_json,
          resposta_json
        )
        VALUES (
          ${TENANT_CONTEXT_SQL},
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::jsonb,
          $7::jsonb
        )
      `,
      [
        mdfeId,
        usuarioId,
        tipoEvento,
        status,
        mensagem,
        payloadJson ? JSON.stringify(payloadJson) : null,
        respostaJson ? JSON.stringify(respostaJson) : null,
      ]
    );
  }

  static async salvarXml(client, { mdfeId, tipoXml, conteudoXml }) {
    const safeMdfeId = parseInteger(mdfeId, { label: "MDF-e" });
    if (!conteudoXml) return;

    await client.query(
      `
        INSERT INTO fiscal.mdfe_xml (
          tenant_id,
          mdfe_id,
          tipo_xml,
          conteudo_xml,
          hash_sha256
        )
        VALUES (
          ${TENANT_CONTEXT_SQL},
          $1,
          $2,
          $3,
          $4
        )
      `,
      [safeMdfeId, tipoXml, conteudoXml, await sha256(conteudoXml)]
    );
  }
}

export default MdfeIntegrationDAO;
