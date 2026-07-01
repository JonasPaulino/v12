const TENANT_CONTEXT_SQL = "current_setting('app.tenant_id')::INTEGER";

class NotificacaoDAO {
  static async listar(client, { usuarioId = null, limit = 8 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 30);

    const itemsResult = await client.query(
      `
        SELECT
          notificacao_id,
          tipo,
          titulo,
          mensagem,
          rota,
          payload_json,
          lida,
          lida_em,
          criado_em
        FROM notificacao
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND (usuario_id IS NULL OR usuario_id = $1)
        ORDER BY lida ASC, criado_em DESC
        LIMIT $2
      `,
      [usuarioId || null, safeLimit]
    );

    const countResult = await client.query(
      `
        SELECT COUNT(*)::INTEGER AS total
        FROM notificacao
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND (usuario_id IS NULL OR usuario_id = $1)
          AND lida = FALSE
      `,
      [usuarioId || null]
    );

    return {
      data: itemsResult.rows,
      unread: countResult.rows[0]?.total || 0,
    };
  }

  static async marcarComoLida(client, id, { usuarioId = null } = {}) {
    const { rows } = await client.query(
      `
        UPDATE notificacao
        SET lida = TRUE,
            lida_em = COALESCE(lida_em, NOW())
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
          AND notificacao_id = $1
          AND (usuario_id IS NULL OR usuario_id = $2)
        RETURNING
          notificacao_id,
          tipo,
          titulo,
          mensagem,
          rota,
          payload_json,
          lida,
          lida_em,
          criado_em
      `,
      [id, usuarioId || null]
    );

    if (!rows[0]) throw new Error("Notificação não encontrada.");
    return rows[0];
  }
}

export default NotificacaoDAO;
