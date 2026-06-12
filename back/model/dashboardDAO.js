import tenantDAO from "./tenantDAO.js";
import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

class DashboardDAO {
  static async getResumo(client, usuarioId) {
    const tenant = await tenantDAO.getCurrent(client);

    const sql = `
      SELECT
        usuario_id,
        usuario_nome,
        usuario_email,
        usuario_username
      FROM usuario
      WHERE usuario_id = $1
      LIMIT 1
    `;

    const [usuarioResult, indicadoresResult] = await Promise.all([
      client.query(sql, [usuarioId]),
      client.query(
        `
          SELECT
            (SELECT COUNT(*)
             FROM pessoa p
             JOIN pessoa_tenant pt
               ON pt.pessoa_id = p.pessoa_id
              AND pt.tenant_id = ${TENANT_CONTEXT_SQL}
              AND pt.ativo = TRUE
             WHERE p.pessoa_excluido = FALSE
               AND p.pessoa_ativo = TRUE) AS clientes,
            (SELECT COUNT(*)
             FROM pedido_venda
             WHERE tenant_id = ${TENANT_CONTEXT_SQL}
               AND excluido = FALSE
               AND status <> 'cancelado') AS pedidos,
            (SELECT COUNT(*)
             FROM financeiro_titulo
             WHERE tenant_id = ${TENANT_CONTEXT_SQL}
               AND excluido = FALSE
               AND tipo = 'receber'
               AND status IN ('aberto', 'parcial', 'vencido')) AS contas_receber
        `
      ),
    ]);

    const indicadores = indicadoresResult.rows[0] || {};

    return {
      tenant,
      usuario: usuarioResult.rows[0] || null,
      indicadores: {
        clientes: Number(indicadores.clientes || 0),
        pedidos: Number(indicadores.pedidos || 0),
        contasReceber: Number(indicadores.contas_receber || 0),
      },
    };
  }
}

export default DashboardDAO;
