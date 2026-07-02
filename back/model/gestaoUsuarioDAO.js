class GestaoUsuarioDAO {
  static async listar(client, { page = 1, limit = 20, search = "" }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const searchTerm = String(search || "").trim();
    const params = [];

    let searchSql = "";
    if (searchTerm) {
      params.push(searchTerm);
      searchSql = `
        AND (
          LOWER(u.usuario_nome) LIKE LOWER('%' || $1 || '%')
          OR LOWER(u.usuario_email) LIKE LOWER('%' || $1 || '%')
          OR LOWER(u.usuario_username) LIKE LOWER('%' || $1 || '%')
          OR LOWER(COALESCE(gi.perfil, '')) LIKE LOWER('%' || $1 || '%')
        )
      `;
    }

    const listParams = [...params, safeLimit, offset];
    const limitIndex = listParams.length - 1;
    const offsetIndex = listParams.length;

    const baseSql = `
      FROM usuario u
      LEFT JOIN gestao.usuario_interno gi
        ON gi.usuario_id = u.usuario_id
      WHERE u.usuario_excluido = FALSE
        AND (
          u.usuario_master = TRUE
          OR gi.usuario_interno_id IS NOT NULL
        )
        ${searchSql}
    `;

    const listResult = await client.query(
      `
        SELECT
          u.usuario_id,
          u.usuario_nome,
          u.usuario_email,
          u.usuario_username,
          u.usuario_ativo,
          u.usuario_master,
          COALESCE(gi.perfil, CASE WHEN u.usuario_master THEN 'admin' ELSE 'suporte' END) AS perfil,
          COALESCE(gi.ativo, u.usuario_ativo) AS acesso_gestao_ativo,
          gi.usuario_interno_id,
          gi.criado_em AS acesso_criado_em
        ${baseSql}
        ORDER BY u.usuario_master DESC, u.usuario_nome ASC, u.usuario_id ASC
        LIMIT $${limitIndex} OFFSET $${offsetIndex}
      `,
      listParams
    );

    const totalResult = await client.query(
      `
        SELECT COUNT(*)::int AS total
        ${baseSql}
      `,
      params
    );

    const total = totalResult.rows[0]?.total || 0;

    return {
      data: listResult.rows,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      total,
      page: safePage,
    };
  }
}

export default GestaoUsuarioDAO;
