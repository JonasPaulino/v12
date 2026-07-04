import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const parseInteger = (value, { label = "Campo", min = 1 } = {}) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`${label} inválido.`);
  }
  return parsed;
};

class NfeReportDAO {
  static async buscarDanfe(client, nfeId) {
    const safeNfeId = parseInteger(nfeId, { label: "NF-e" });

    const { rows } = await client.query(
      `
        SELECT
          n.*,
          t.tenant_nome,
          e.pessoa_nome_razao AS emitente_nome_razao,
          e.pessoa_nome_fantasia AS emitente_nome_fantasia,
          e.pessoa_cpf_cnpj AS emitente_cpf_cnpj,
          e.pessoa_inscricao_estadual AS emitente_ie,
          e.pessoa_email AS emitente_email,
          e.pessoa_telefone AS emitente_telefone,
          ee.cep AS emitente_cep,
          ee.logradouro AS emitente_logradouro,
          ee.numero AS emitente_numero,
          ee.complemento AS emitente_complemento,
          ee.bairro AS emitente_bairro,
          ee.cidade AS emitente_cidade,
          ee.uf AS emitente_uf,
          d.pessoa_nome_razao AS destinatario_nome_razao,
          d.pessoa_cpf_cnpj AS destinatario_cpf_cnpj,
          d.pessoa_inscricao_estadual AS destinatario_ie,
          d.pessoa_email AS destinatario_email,
          d.pessoa_telefone AS destinatario_telefone,
          de.cep AS destinatario_cep,
          de.logradouro AS destinatario_logradouro,
          de.numero AS destinatario_numero,
          de.complemento AS destinatario_complemento,
          de.bairro AS destinatario_bairro,
          de.cidade AS destinatario_cidade,
          de.uf AS destinatario_uf,
          logo.nome_arquivo AS logo_nome_arquivo,
          logo.mime_type AS logo_mime_type,
          logo.conteudo AS logo_conteudo
        FROM fiscal.nfe n
        JOIN tenant t ON t.tenant_id = n.tenant_id
        LEFT JOIN pessoa e ON e.pessoa_id = n.emitente_pessoa_id
        LEFT JOIN pessoa_endereco ee
          ON ee.pessoa_id = e.pessoa_id
         AND ee.tenant_id = n.tenant_id
         AND ee.endereco_tipo = 'principal'
        LEFT JOIN pessoa d ON d.pessoa_id = n.destinatario_pessoa_id
        LEFT JOIN pessoa_endereco de
          ON de.pessoa_id = d.pessoa_id
         AND de.tenant_id = n.tenant_id
         AND de.endereco_tipo = 'principal'
        LEFT JOIN tenant_logo logo ON logo.tenant_id = n.tenant_id
        WHERE n.nfe_id = $1
          AND n.tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `,
      [safeNfeId]
    );

    const nfe = rows[0] || null;
    if (!nfe) return null;

    const itemsResult = await client.query(
      `
        SELECT *
        FROM fiscal.nfe_item
        WHERE nfe_id = $1
          AND tenant_id = ${TENANT_CONTEXT_SQL}
        ORDER BY nfe_item_id
      `,
      [safeNfeId]
    );

    const xmlResult = await client.query(
      `
        SELECT tipo_xml, chave_acesso, conteudo_xml, criado_em
        FROM fiscal.nfe_xml
        WHERE nfe_id = $1
          AND tenant_id = ${TENANT_CONTEXT_SQL}
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

    const xml = xmlResult.rows[0] || null;

    return {
      nfe: {
        ...nfe,
        xml_autorizado: nfe.xml_autorizado || xml?.conteudo_xml || null,
        chave_acesso: nfe.chave_acesso || xml?.chave_acesso || null,
        xml_tipo: xml?.tipo_xml || null,
      },
      itens: itemsResult.rows,
    };
  }
}

export default NfeReportDAO;
