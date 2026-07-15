const parseBooleanFlag = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "yes", "t"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no", "f"].includes(normalized)) return false;
  return defaultValue;
};

class DesktopSyncDAO {
  static async validarTenantAtivo(client, tenantId) {
    const { rows } = await client.query(
      `
        SELECT tenant_id
        FROM tenant
        WHERE tenant_id = $1
          AND tenant_ativo = TRUE
          AND COALESCE(tenant_usa_pdv, FALSE) = TRUE
          AND COALESCE(tenant_acesso_bloqueado, FALSE) = FALSE
        LIMIT 1
      `,
      [tenantId],
    );

    return !!rows[0];
  }

  static async listarProdutos(client, { tenantId, since = null, limit = 1000 }) {
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 5000) : 1000;
    const values = [tenantId];
    let sinceWhere = "";
    const syncTimestampSql = `
      GREATEST(
        COALESCE(p.atualizado_em, p.criado_em),
        COALESCE(pf.atualizado_em, p.criado_em),
        COALESCE(pu.atualizado_em, p.criado_em),
        COALESCE(pp.atualizado_em, p.criado_em),
        COALESCE(pe.atualizado_em, p.criado_em),
        COALESCE(rt.atualizado_em, p.criado_em)
      )
    `;

    if (since) {
      values.push(since);
      sinceWhere = `AND ${syncTimestampSql} > $${values.length}`;
    }

    values.push(safeLimit);

    const { rows } = await client.query(
      `
        SELECT
          p.produto_id AS erp_id,
          COALESCE(NULLIF(p.codigo_interno, ''), p.produto_id::varchar(60)) AS codigo,
          p.descricao,
          p.descricao_fiscal,
          p.gtin,
          COALESCE(um.sigla, 'UN') AS unidade,
          pf.ncm,
          pf.cest,
          COALESCE(NULLIF(pf.origem_mercadoria, ''), rt.origem_mercadoria) AS origem_mercadoria,
          pf.regra_tributaria_id,
          rt.descricao AS regra_fiscal_descricao,
          rt.crt_emitente,
          rt.cbenef,
          rt.cfop_venda_interna,
          rt.cfop_venda_interestadual,
          icms.cst AS icms_cst,
          icms.csosn AS icms_csosn,
          icms.aliquota_icms AS icms_aliquota,
          icms.reducao_base AS icms_reducao_base,
          icms.aliquota_fcp AS icms_aliquota_fcp,
          icms.modalidade_bc AS icms_modalidade_bc,
          pis.cst AS pis_cst,
          pis.aliquota AS pis_aliquota,
          cofins.cst AS cofins_cst,
          cofins.aliquota AS cofins_aliquota,
          ipi.cst AS ipi_cst,
          ipi.enquadramento_ipi AS ipi_enquadramento,
          ipi.aliquota AS ipi_aliquota,
          COALESCE(pp.preco_venda, 0) AS preco_venda,
          COALESCE(pe.estoque_atual, 0) AS estoque_atual,
          COALESCE(p.controla_estoque, TRUE) AS controla_estoque,
          p.ativo,
          ${syncTimestampSql} AS sincronizacao_atualizada_em
        FROM produto p
        LEFT JOIN produto_fiscal pf ON pf.produto_id = p.produto_id
        LEFT JOIN regra_tributaria rt
          ON rt.regra_tributaria_id = pf.regra_tributaria_id
         AND rt.tenant_id = p.tenant_id
         AND rt.excluido = FALSE
        LEFT JOIN regra_tributaria_icms icms
          ON icms.regra_tributaria_id = rt.regra_tributaria_id
        LEFT JOIN regra_tributaria_pis pis
          ON pis.regra_tributaria_id = rt.regra_tributaria_id
        LEFT JOIN regra_tributaria_cofins cofins
          ON cofins.regra_tributaria_id = rt.regra_tributaria_id
        LEFT JOIN regra_tributaria_ipi ipi
          ON ipi.regra_tributaria_id = rt.regra_tributaria_id
        LEFT JOIN produto_unidade pu ON pu.produto_id = p.produto_id
        LEFT JOIN unidade_medida um ON um.unidade_medida_id = pu.unidade_comercial_id
        LEFT JOIN tabela_preco tp
          ON tp.tenant_id = p.tenant_id
         AND tp.padrao = TRUE
         AND tp.excluido = FALSE
        LEFT JOIN produto_preco pp
          ON pp.produto_id = p.produto_id
         AND pp.tabela_preco_id = tp.tabela_preco_id
         AND pp.ativo = TRUE
         AND (pp.data_fim IS NULL OR pp.data_fim >= CURRENT_DATE)
        LEFT JOIN deposito d
          ON d.tenant_id = p.tenant_id
         AND d.padrao = TRUE
         AND d.excluido = FALSE
        LEFT JOIN produto_estoque pe
          ON pe.produto_id = p.produto_id
         AND pe.deposito_id = d.deposito_id
         AND pe.tenant_id = p.tenant_id
        WHERE p.tenant_id = $1
          AND p.excluido = FALSE
          ${sinceWhere}
        ORDER BY ${syncTimestampSql} ASC, p.produto_id ASC
        LIMIT $${values.length}
      `,
      values,
    );

    return rows.map((row) => ({
      ...row,
      regra_tributaria_id: row.regra_tributaria_id ? Number(row.regra_tributaria_id) : null,
      preco_venda: Number(row.preco_venda || 0),
      estoque_atual: Number(row.estoque_atual || 0),
      controla_estoque: parseBooleanFlag(row.controla_estoque, true),
      icms_aliquota: Number(row.icms_aliquota || 0),
      icms_reducao_base: Number(row.icms_reducao_base || 0),
      icms_aliquota_fcp: Number(row.icms_aliquota_fcp || 0),
      pis_aliquota: Number(row.pis_aliquota || 0),
      cofins_aliquota: Number(row.cofins_aliquota || 0),
      ipi_aliquota: Number(row.ipi_aliquota || 0),
      ativo: parseBooleanFlag(row.ativo, true),
    }));
  }

  static async listarUsuariosPdv(client, { tenantId }) {
    const { rows } = await client.query(
      `
        SELECT
          u.usuario_id AS erp_usuario_id,
          u.usuario_nome AS nome,
          u.usuario_email AS email,
          u.usuario_senha AS senha_hash,
          u.usuario_ativo AS ativo,
          u.usuario_primeiro_login AS primeiro_acesso,
          u.atualizado_em,
          COALESCE(
            JSON_AGG(DISTINCT utp.perfil)
              FILTER (WHERE utp.perfil IS NOT NULL),
            '[]'::json
          ) AS perfis
        FROM usuario u
        JOIN usuario_tenant ut
          ON ut.usuario_id = u.usuario_id
         AND ut.tenant_id = $1
         AND ut.ativo = TRUE
        JOIN usuario_tenant_perfil utp
          ON utp.usuario_id = u.usuario_id
         AND utp.tenant_id = ut.tenant_id
         AND utp.ativo = TRUE
        WHERE u.usuario_excluido = FALSE
          AND u.usuario_ativo = TRUE
          AND COALESCE(u.usuario_master, FALSE) = FALSE
          AND utp.perfil IN ('vendedor', 'pdv_operador', 'pdv_supervisor', 'gerente')
        GROUP BY
          u.usuario_id,
          u.usuario_nome,
          u.usuario_email,
          u.usuario_senha,
          u.usuario_ativo,
          u.usuario_primeiro_login,
          u.atualizado_em
        ORDER BY u.usuario_nome
      `,
      [tenantId],
    );

    return rows.map((row) => ({
      ...row,
      ativo: parseBooleanFlag(row.ativo, true),
      primeiro_acesso: parseBooleanFlag(row.primeiro_acesso, false),
      perfis: Array.isArray(row.perfis) ? row.perfis : [],
    }));
  }

  static async atualizarSenhaUsuarioPdv(client, { tenantId, usuarioId, senhaHash }) {
    const { rows } = await client.query(
      `
        UPDATE usuario u
        SET
          usuario_senha = $3,
          usuario_primeiro_login = FALSE,
          atualizado_em = NOW()
        FROM usuario_tenant ut
        WHERE u.usuario_id = $1
          AND u.usuario_excluido = FALSE
          AND u.usuario_ativo = TRUE
          AND COALESCE(u.usuario_master, FALSE) = FALSE
          AND ut.usuario_id = u.usuario_id
          AND ut.tenant_id = $2
          AND ut.ativo = TRUE
          AND EXISTS (
            SELECT 1
            FROM usuario_tenant_perfil p
            WHERE p.usuario_id = u.usuario_id
              AND p.tenant_id = ut.tenant_id
              AND p.ativo = TRUE
              AND p.perfil IN ('vendedor', 'pdv_operador', 'pdv_supervisor', 'gerente')
          )
        RETURNING
          u.usuario_id AS erp_usuario_id,
          u.usuario_nome AS nome,
          u.usuario_email AS email,
          u.usuario_senha AS senha_hash,
          u.usuario_ativo AS ativo,
          u.usuario_primeiro_login AS primeiro_acesso,
          u.atualizado_em
      `,
      [usuarioId, tenantId, senhaHash],
    );

    return rows[0] || null;
  }

  static async registrarEventoPdv(
    client,
    {
      tenantId,
      terminalCodigo = null,
      terminalNome = null,
      localSyncId,
      eventType,
      payload = {},
    }
  ) {
    const { rows } = await client.query(
      `
        INSERT INTO desktop_sync_evento (
          tenant_id,
          terminal_codigo,
          terminal_nome,
          local_sync_id,
          event_type,
          payload_json,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'recebido')
        ON CONFLICT (tenant_id, local_sync_id) DO UPDATE SET
          terminal_codigo = EXCLUDED.terminal_codigo,
          terminal_nome = EXCLUDED.terminal_nome,
          event_type = EXCLUDED.event_type,
          payload_json = EXCLUDED.payload_json,
          status = 'recebido'
        RETURNING
          desktop_sync_evento_id,
          tenant_id,
          terminal_codigo,
          terminal_nome,
          local_sync_id,
          event_type,
          status,
          recebido_em
      `,
      [
        tenantId,
        terminalCodigo,
        terminalNome,
        localSyncId,
        eventType,
        JSON.stringify(payload || {}),
      ]
    );

    return rows[0] || null;
  }

  static async atualizarEventoStatus(
    client,
    {
      desktopSyncEventoId,
      status,
      observacao = null,
    },
  ) {
    const atualizarProcessado = status === "processado" ? ", processado_em = NOW()" : "";
    const { rows } = await client.query(
      `
        UPDATE desktop_sync_evento
        SET
          status = $2,
          observacao = $3
          ${atualizarProcessado}
        WHERE desktop_sync_evento_id = $1
        RETURNING
          desktop_sync_evento_id,
          tenant_id,
          local_sync_id,
          event_type,
          status,
          observacao,
          recebido_em,
          processado_em
      `,
      [desktopSyncEventoId, status, observacao],
    );

    return rows[0] || null;
  }
}

export default DesktopSyncDAO;
