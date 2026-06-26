import crypto from "crypto";
import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const parseInteger = (value, { label = "Campo", min = 1 } = {}) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`${label} inválido.`);
  }
  return parsed;
};

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const hasValidIbgeCode = (value) => /^\d{7}$/.test(onlyDigits(value));

const sha256 = (value) =>
  crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");

const buildSetClause = (payload = {}) => {
  const values = [];
  const setClause = Object.entries(payload)
    .filter(([, value]) => value !== undefined)
    .map(([column, value]) => {
      values.push(value);
      return `${column} = $${values.length}`;
    })
    .join(", ");

  return {
    setClause,
    values,
  };
};

class AcbrNfeIntegrationDAO {
  static async reservarNumero(client, nfeId) {
    const safeNfeId = parseInteger(nfeId, { label: "NF-e" });

    const nfeResult = await client.query(
      `
        SELECT nfe_id, numero
        FROM fiscal.nfe
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND nfe_id = $1
        FOR UPDATE
      `,
      [safeNfeId]
    );

    const nfeRow = nfeResult.rows[0];
    if (!nfeRow) {
      throw new Error("NF-e não encontrada.");
    }

    if (nfeRow.numero) {
      return Number(nfeRow.numero);
    }

    const configResult = await client.query(
      `
        SELECT tenant_id, COALESCE(proximo_numero_nfe, 1) AS proximo_numero_nfe
        FROM tenant_configuracao_fiscal
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        FOR UPDATE
      `
    );

    const configRow = configResult.rows[0];
    if (!configRow) {
      throw new Error("Configuração fiscal da filial não encontrada.");
    }

    const numero = Number(configRow.proximo_numero_nfe || 1);

    await client.query(
      `
        UPDATE fiscal.nfe
        SET numero = $2
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND nfe_id = $1
      `,
      [safeNfeId, numero]
    );

    await client.query(
      `
        UPDATE tenant_configuracao_fiscal
        SET proximo_numero_nfe = $1 + 1
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
      `,
      [numero]
    );

    return numero;
  }

  static async carregarContexto(client, nfeId) {
    const safeNfeId = parseInteger(nfeId, { label: "NF-e" });

    const { rows } = await client.query(
      `
        SELECT
          n.nfe_id,
          n.tenant_id,
          n.pedido_venda_id,
          n.emitente_pessoa_id,
          n.destinatario_pessoa_id,
          n.usuario_id,
          n.modelo,
          n.serie,
          n.numero,
          n.chave_acesso,
          n.natureza_operacao,
          n.tipo_operacao,
          n.finalidade,
          n.status,
          n.status_sefaz,
          n.recibo,
          n.protocolo,
          n.ambiente_nfe,
          n.valor_produtos,
          n.valor_desconto,
          n.valor_acrescimo,
          n.valor_total,
          n.observacao,
          cfg.crt,
          cfg.cnae,
          cfg.nfe_habilitada,
          rt.cnpj AS responsavel_tecnico_cnpj,
          rt.nome AS responsavel_tecnico_nome,
          rt.contato AS responsavel_tecnico_contato,
          rt.email AS responsavel_tecnico_email,
          rt.telefone AS responsavel_tecnico_telefone,
          cert.nome_arquivo AS certificado_nome_arquivo,
          cert.conteudo_pfx,
          cert.senha_criptografada,
          emit.pessoa_nome_razao AS emitente_nome_razao,
          emit.pessoa_nome_fantasia AS emitente_nome_fantasia,
          emit.pessoa_cpf_cnpj AS emitente_cpf_cnpj,
          emit.pessoa_inscricao_estadual AS emitente_ie,
          emit.pessoa_inscricao_municipal AS emitente_im,
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
          ee.pais AS emitente_pais,
          dest.pessoa_nome_razao AS destinatario_nome_razao,
          dest.pessoa_nome_fantasia AS destinatario_nome_fantasia,
          dest.pessoa_cpf_cnpj AS destinatario_cpf_cnpj,
          dest.pessoa_inscricao_estadual AS destinatario_ie,
          dest.pessoa_email AS destinatario_email,
          dest.pessoa_telefone AS destinatario_telefone,
          de.cep AS destinatario_cep,
          de.logradouro AS destinatario_logradouro,
          de.numero AS destinatario_numero,
          de.complemento AS destinatario_complemento,
          de.bairro AS destinatario_bairro,
          de.cidade AS destinatario_cidade,
          de.uf AS destinatario_uf,
          de.codigo_ibge AS destinatario_codigo_ibge,
          de.pais AS destinatario_pais
        FROM fiscal.nfe n
        LEFT JOIN tenant_configuracao_fiscal cfg
          ON cfg.tenant_id = n.tenant_id
        LEFT JOIN tenant_certificado_a1 cert
          ON cert.tenant_id = n.tenant_id
        LEFT JOIN tenant_responsavel_tecnico rt
          ON rt.tenant_id = n.tenant_id
        JOIN pessoa emit
          ON emit.pessoa_id = n.emitente_pessoa_id
        LEFT JOIN pessoa_endereco ee
          ON ee.pessoa_id = emit.pessoa_id
         AND ee.tenant_id = n.tenant_id
         AND ee.endereco_tipo = 'principal'
        LEFT JOIN pessoa dest
          ON dest.pessoa_id = n.destinatario_pessoa_id
        LEFT JOIN pessoa_endereco de
          ON de.pessoa_id = dest.pessoa_id
         AND de.tenant_id = n.tenant_id
         AND de.endereco_tipo = 'principal'
        WHERE n.tenant_id = ${TENANT_CONTEXT_SQL}
          AND n.nfe_id = $1
        LIMIT 1
      `,
      [safeNfeId]
    );

    const row = rows[0];
    if (!row) {
      throw new Error("NF-e não encontrada.");
    }

    const itemsResult = await client.query(
      `
        SELECT
          ni.nfe_item_id,
          ni.produto_id,
          ni.codigo_produto,
          ni.descricao,
          ni.ncm,
          ni.cest,
          ni.cfop,
          ni.unidade_comercial,
          ni.quantidade,
          ni.valor_unitario,
          ni.valor_desconto,
          ni.valor_acrescimo,
          ni.valor_total,
          ni.origem_mercadoria,
          ni.cbenef,
          nii.icms_cst,
          nii.icms_csosn,
          nii.icms_aliquota,
          nii.icms_base,
          nii.icms_valor,
          nii.pis_cst,
          nii.pis_aliquota,
          nii.pis_valor,
          nii.cofins_cst,
          nii.cofins_aliquota,
          nii.cofins_valor,
          nii.ipi_cst,
          nii.ipi_aliquota,
          nii.ipi_valor,
          pf.ncm AS produto_ncm,
          pf.cest AS produto_cest,
          COALESCE(rt.cfop_venda_interna, pf.cfop_venda_interna) AS produto_cfop_venda_interna,
          COALESCE(rt.cfop_venda_interestadual, pf.cfop_venda_interestadual) AS produto_cfop_venda_interestadual,
          pf.cfop_compra AS produto_cfop_compra,
          COALESCE(rt.origem_mercadoria, pf.origem_mercadoria, '0') AS produto_origem_mercadoria,
          icms.cst AS regra_icms_cst,
          icms.csosn AS regra_icms_csosn,
          icms.aliquota_icms AS regra_icms_aliquota,
          icms.reducao_base AS regra_icms_reducao_base,
          pis.cst AS regra_pis_cst,
          pis.aliquota AS regra_pis_aliquota,
          cofins.cst AS regra_cofins_cst,
          cofins.aliquota AS regra_cofins_aliquota,
          ipi.cst AS regra_ipi_cst,
          ipi.aliquota AS regra_ipi_aliquota,
          um.sigla AS produto_unidade_sigla
        FROM fiscal.nfe_item ni
        LEFT JOIN fiscal.nfe_item_imposto nii
          ON nii.nfe_item_id = ni.nfe_item_id
         AND nii.tenant_id = ni.tenant_id
        LEFT JOIN produto_fiscal pf
          ON pf.produto_id = ni.produto_id
         AND pf.tenant_id = ni.tenant_id
        LEFT JOIN regra_tributaria rt
          ON rt.regra_tributaria_id = pf.regra_tributaria_id
         AND rt.tenant_id = ni.tenant_id
         AND rt.excluido = FALSE
         AND rt.ativo = TRUE
        LEFT JOIN regra_tributaria_icms icms
          ON icms.regra_tributaria_id = rt.regra_tributaria_id
        LEFT JOIN regra_tributaria_pis pis
          ON pis.regra_tributaria_id = rt.regra_tributaria_id
        LEFT JOIN regra_tributaria_cofins cofins
          ON cofins.regra_tributaria_id = rt.regra_tributaria_id
        LEFT JOIN regra_tributaria_ipi ipi
          ON ipi.regra_tributaria_id = rt.regra_tributaria_id
        LEFT JOIN produto_unidade pu
          ON pu.produto_id = ni.produto_id
         AND pu.tenant_id = ni.tenant_id
        LEFT JOIN unidade_medida um
          ON um.unidade_medida_id = pu.unidade_comercial_id
        WHERE ni.tenant_id = ${TENANT_CONTEXT_SQL}
          AND ni.nfe_id = $1
        ORDER BY ni.nfe_item_id
      `,
      [safeNfeId]
    );

    return {
      nfe: {
        nfe_id: row.nfe_id,
        tenant_id: row.tenant_id,
        pedido_venda_id: row.pedido_venda_id,
        serie: Number(row.serie || 1),
        numero: row.numero ? Number(row.numero) : null,
        modelo: row.modelo || "55",
        chave_acesso: row.chave_acesso || "",
        natureza_operacao: row.natureza_operacao,
        tipo_operacao: row.tipo_operacao,
        finalidade: row.finalidade,
        status: row.status,
        status_sefaz: row.status_sefaz,
        recibo: row.recibo,
        protocolo: row.protocolo,
        ambiente_nfe: row.ambiente_nfe || "2",
        valor_produtos: Number(row.valor_produtos || 0),
        valor_desconto: Number(row.valor_desconto || 0),
        valor_acrescimo: Number(row.valor_acrescimo || 0),
        valor_total: Number(row.valor_total || 0),
        observacao: row.observacao || "",
        codigo_numerico: Number(`${row.nfe_id}${row.serie}`.slice(-8).padStart(8, "0")),
      },
      configuracao: {
        crt: row.crt || "3",
        cnae: row.cnae || "",
        nfe_habilitada: !!row.nfe_habilitada,
      },
      certificado: {
        nome_arquivo: row.certificado_nome_arquivo || "",
        conteudo_pfx: row.conteudo_pfx || null,
        senha_criptografada: row.senha_criptografada || null,
      },
      responsavel_tecnico: {
        cnpj: row.responsavel_tecnico_cnpj || "",
        nome: row.responsavel_tecnico_nome || "",
        contato: row.responsavel_tecnico_contato || "",
        email: row.responsavel_tecnico_email || "",
        telefone: row.responsavel_tecnico_telefone || "",
      },
      emitente: {
        pessoa_id: row.emitente_pessoa_id,
        nome_razao: row.emitente_nome_razao,
        nome_fantasia: row.emitente_nome_fantasia || "",
        cpf_cnpj: row.emitente_cpf_cnpj,
        inscricao_estadual: row.emitente_ie,
        inscricao_municipal: row.emitente_im || "",
        email: row.emitente_email || "",
        telefone: row.emitente_telefone || "",
        cep: row.emitente_cep || "",
        logradouro: row.emitente_logradouro || "",
        numero: row.emitente_numero || "",
        complemento: row.emitente_complemento || "",
        bairro: row.emitente_bairro || "",
        cidade: row.emitente_cidade || "",
        uf: row.emitente_uf || "",
        codigo_ibge: row.emitente_codigo_ibge || "",
        pais: row.emitente_pais || "Brasil",
      },
      destinatario: {
        pessoa_id: row.destinatario_pessoa_id,
        nome_razao: row.destinatario_nome_razao || "",
        nome_fantasia: row.destinatario_nome_fantasia || "",
        cpf_cnpj: row.destinatario_cpf_cnpj || "",
        inscricao_estadual: row.destinatario_ie || "",
        email: row.destinatario_email || "",
        telefone: row.destinatario_telefone || "",
        cep: row.destinatario_cep || "",
        logradouro: row.destinatario_logradouro || "",
        numero: row.destinatario_numero || "",
        complemento: row.destinatario_complemento || "",
        bairro: row.destinatario_bairro || "",
        cidade: row.destinatario_cidade || "",
        uf: row.destinatario_uf || "",
        codigo_ibge: row.destinatario_codigo_ibge || "",
        pais: row.destinatario_pais || "Brasil",
      },
      itens: itemsResult.rows.map((item) => ({
        nfe_item_id: item.nfe_item_id,
        produto_id: item.produto_id,
        codigo_produto: item.codigo_produto || String(item.produto_id || item.nfe_item_id),
        descricao: item.descricao,
        ncm: item.ncm || item.produto_ncm || "",
        cest: item.cest || item.produto_cest || "",
        cfop:
          item.cfop ||
          (row.emitente_uf === row.destinatario_uf
            ? item.produto_cfop_venda_interna
            : item.produto_cfop_venda_interestadual) ||
          item.produto_cfop_venda_interna ||
          item.produto_cfop_venda_interestadual ||
          item.produto_cfop_compra ||
          "",
        unidade_comercial: item.unidade_comercial || item.produto_unidade_sigla || "UN",
        quantidade: Number(item.quantidade || 0),
        valor_unitario: Number(item.valor_unitario || 0),
        valor_desconto: Number(item.valor_desconto || 0),
        valor_acrescimo: Number(item.valor_acrescimo || 0),
        valor_total: Number(item.valor_total || 0),
        origem_mercadoria: item.origem_mercadoria || item.produto_origem_mercadoria || "0",
        cbenef: item.cbenef || "",
        imposto: {
          icms_cst: item.icms_cst || item.regra_icms_cst || "",
          icms_csosn: item.icms_csosn || item.regra_icms_csosn || "",
          icms_aliquota: Number(item.icms_aliquota || item.regra_icms_aliquota || 0),
          icms_base: Number(item.icms_base || 0),
          icms_valor: Number(item.icms_valor || 0),
          pis_cst: item.pis_cst || item.regra_pis_cst || "",
          pis_aliquota: Number(item.pis_aliquota || item.regra_pis_aliquota || 0),
          pis_valor: Number(item.pis_valor || 0),
          cofins_cst: item.cofins_cst || item.regra_cofins_cst || "",
          cofins_aliquota: Number(item.cofins_aliquota || item.regra_cofins_aliquota || 0),
          cofins_valor: Number(item.cofins_valor || 0),
          ipi_cst: item.ipi_cst || item.regra_ipi_cst || "",
          ipi_aliquota: Number(item.ipi_aliquota || item.regra_ipi_aliquota || 0),
          ipi_valor: Number(item.ipi_valor || 0),
        },
      })),
    };
  }

  static validarContexto(context) {
    if (!context.configuracao.nfe_habilitada) {
      throw new Error("A NF-e não está habilitada para esta filial.");
    }

    if (!context.certificado.conteudo_pfx) {
      throw new Error("Certificado A1 não configurado para a filial.");
    }

    if (!/^\d{14}$/.test(onlyDigits(context.responsavel_tecnico?.cnpj))) {
      throw new Error("Configure o CNPJ do responsável técnico antes de emitir a NF-e.");
    }

    if (!String(context.responsavel_tecnico?.contato || "").trim()) {
      throw new Error("Configure o contato do responsável técnico antes de emitir a NF-e.");
    }

    if (!String(context.responsavel_tecnico?.email || "").includes("@")) {
      throw new Error("Configure o e-mail do responsável técnico antes de emitir a NF-e.");
    }

    if (onlyDigits(context.responsavel_tecnico?.telefone).length < 10) {
      throw new Error("Configure o telefone do responsável técnico antes de emitir a NF-e.");
    }

    if (!onlyDigits(context.emitente.cpf_cnpj)) {
      throw new Error("Emitente sem CNPJ válido.");
    }

    const emitenteRequired = [
      ["nome_razao", "nome/razão social do emitente"],
      ["inscricao_estadual", "inscrição estadual do emitente"],
      ["logradouro", "logradouro do emitente"],
      ["numero", "número do emitente"],
      ["bairro", "bairro do emitente"],
      ["cidade", "cidade do emitente"],
      ["uf", "UF do emitente"],
      ["codigo_ibge", "código IBGE do emitente"],
      ["cep", "CEP do emitente"],
    ];

    const missingEmitente = emitenteRequired.find(([field]) => !String(context.emitente[field] || "").trim());
    if (missingEmitente) {
      throw new Error(`Preencha ${missingEmitente[1]} antes de emitir a NF-e.`);
    }

    if (!hasValidIbgeCode(context.emitente.codigo_ibge)) {
      throw new Error("Código IBGE do emitente precisa ter 7 dígitos.");
    }

    if (!context.destinatario?.nome_razao) {
      throw new Error("Destinatário não encontrado na NF-e.");
    }

    if (!onlyDigits(context.destinatario.cpf_cnpj)) {
      throw new Error("Destinatário sem CPF/CNPJ válido.");
    }

    const destinatarioRequired = [
      ["logradouro", "logradouro do destinatário"],
      ["numero", "número do destinatário"],
      ["bairro", "bairro do destinatário"],
      ["cidade", "cidade do destinatário"],
      ["uf", "UF do destinatário"],
      ["codigo_ibge", "código IBGE do destinatário"],
      ["cep", "CEP do destinatário"],
    ];

    const missingDestinatario = destinatarioRequired.find(
      ([field]) => !String(context.destinatario[field] || "").trim()
    );
    if (missingDestinatario) {
      throw new Error(`Preencha ${missingDestinatario[1]} antes de emitir a NF-e.`);
    }

    if (!hasValidIbgeCode(context.destinatario.codigo_ibge)) {
      throw new Error("Código IBGE do destinatário precisa ter 7 dígitos.");
    }

    if (!context.itens.length) {
      throw new Error("A NF-e precisa ter itens para emissão.");
    }

    const itemComErro = context.itens.find(
      (item) => !item.ncm || !item.cfop || !item.unidade_comercial || Number(item.quantidade || 0) <= 0
    );

    if (itemComErro) {
      throw new Error(
        `Item ${itemComErro.codigo_produto} precisa ter NCM, CFOP, unidade e quantidade válidos.`
      );
    }
  }

  static async atualizarNfe(client, nfeId, payload = {}) {
    const safeNfeId = parseInteger(nfeId, { label: "NF-e" });
    const { setClause, values } = buildSetClause(payload);
    if (!setClause) return;

    values.push(safeNfeId);

    await client.query(
      `
        UPDATE fiscal.nfe
        SET ${setClause}
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND nfe_id = $${values.length}
      `,
      values
    );
  }

  static async registrarEvento(client, { nfeId, usuarioId = null, tipoEvento, status, mensagem, payloadJson = null, respostaJson = null }) {
    const safeNfeId = parseInteger(nfeId, { label: "NF-e" });

    await client.query(
      `
        INSERT INTO fiscal.nfe_evento (
          tenant_id,
          nfe_id,
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
        safeNfeId,
        usuarioId,
        tipoEvento,
        status,
        mensagem,
        payloadJson ? JSON.stringify(payloadJson) : null,
        respostaJson ? JSON.stringify(respostaJson) : null,
      ]
    );
  }

  static async salvarXml(client, { nfeId, tipoXml, chaveAcesso = null, conteudoXml }) {
    const safeNfeId = parseInteger(nfeId, { label: "NF-e" });

    if (!conteudoXml) return;

    await client.query(
      `
        INSERT INTO fiscal.nfe_xml (
          tenant_id,
          nfe_id,
          tipo_xml,
          chave_acesso,
          conteudo_xml,
          hash_sha256
        )
        VALUES (
          ${TENANT_CONTEXT_SQL},
          $1,
          $2,
          $3,
          $4,
          $5
        )
      `,
      [safeNfeId, tipoXml, chaveAcesso, conteudoXml, sha256(conteudoXml)]
    );
  }

  static async carregarDanfeAssets(client, nfeId) {
    const safeNfeId = parseInteger(nfeId, { label: "NF-e" });

    const xmlResult = await client.query(
      `
        SELECT tipo_xml, chave_acesso, conteudo_xml, criado_em
        FROM fiscal.nfe_xml
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND nfe_id = $1
          AND tipo_xml IN ('autorizado', 'retorno_autorizacao', 'importado')
        ORDER BY
          CASE tipo_xml
            WHEN 'autorizado' THEN 1
            WHEN 'retorno_autorizacao' THEN 2
            ELSE 3
          END,
          criado_em DESC,
          nfe_xml_id DESC
        LIMIT 1
      `,
      [safeNfeId]
    );

    const logoResult = await client.query(
      `
        SELECT nome_arquivo, mime_type, conteudo
        FROM tenant_logo
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `
    );

    return {
      xml: xmlResult.rows[0] || null,
      logo: logoResult.rows[0] || null,
    };
  }
}

export default AcbrNfeIntegrationDAO;
