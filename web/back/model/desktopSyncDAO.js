class DesktopSyncDAO {
  static async validarTenantAtivo(client, tenantId) {
    const { rows } = await client.query(
      `
        SELECT tenant_id
        FROM tenant
        WHERE tenant_id = $1
          AND tenant_ativo = TRUE
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
        COALESCE(pe.atualizado_em, p.criado_em)
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
          COALESCE(um.sigla, 'UN') AS unidade,
          pf.ncm,
          pf.cest,
          COALESCE(pp.preco_venda, 0) AS preco_venda,
          COALESCE(pe.estoque_atual, 0) AS estoque_atual,
          p.ativo,
          ${syncTimestampSql} AS sincronizacao_atualizada_em
        FROM produto p
        LEFT JOIN produto_fiscal pf ON pf.produto_id = p.produto_id
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
      preco_venda: Number(row.preco_venda || 0),
      estoque_atual: Number(row.estoque_atual || 0),
      ativo: !!row.ativo,
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
          AND utp.perfil IN ('pdv_operador', 'pdv_supervisor', 'gerente')
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
      ativo: !!row.ativo,
      primeiro_acesso: !!row.primeiro_acesso,
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
              AND p.perfil IN ('pdv_operador', 'pdv_supervisor', 'gerente')
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
}

export default DesktopSyncDAO;
