class LoginDAO {
  static async obterUltimaSessao(client, usuarioId) {
    const { rows } = await client.query(
      `
        SELECT usuario_sessao_id, tenant_id, token, criado_em
        FROM usuario_sessao
        WHERE usuario_id = $1
        ORDER BY criado_em DESC, usuario_sessao_id DESC
        LIMIT 1
      `,
      [usuarioId]
    );

    return rows[0] || null;
  }

  static async usuarioPossuiTenant(client, usuarioId, tenantId) {
    const { rows } = await client.query(
      `
        SELECT 1
        FROM usuario_tenant
        WHERE usuario_id = $1
          AND tenant_id = $2
          AND ativo = TRUE
        LIMIT 1
      `,
      [usuarioId, tenantId]
    );

    return !!rows[0];
  }

  static async buscarUsuarioAtivo(client, usuarioId) {
    const { rows } = await client.query(
      `
        SELECT usuario_id
        FROM usuario
        WHERE usuario_id = $1
          AND usuario_ativo = TRUE
          AND usuario_excluido = FALSE
        LIMIT 1
      `,
      [usuarioId]
    );

    return rows[0] || null;
  }

  static async buscarTenantAtivo(client, tenantId) {
    const { rows } = await client.query(
      `
        SELECT tenant_id
        FROM tenant
        WHERE tenant_id = $1
          AND tenant_ativo = TRUE
        LIMIT 1
      `,
      [tenantId]
    );

    return rows[0] || null;
  }

  static async usuarioEhMaster(client, usuarioId) {
    const { rows } = await client.query(
      `
        SELECT usuario_master
        FROM usuario
        WHERE usuario_id = $1
          AND usuario_excluido = FALSE
        LIMIT 1
      `,
      [usuarioId]
    );

    return rows[0]?.usuario_master === true;
  }
}

export default LoginDAO;
