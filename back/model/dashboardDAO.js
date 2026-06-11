import tenantDAO from "./tenantDAO.js";

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

    const { rows } = await client.query(sql, [usuarioId]);

    return {
      tenant,
      usuario: rows[0] || null,
      indicadores: {
        clientes: 0,
        pedidos: 0,
        contasReceber: 0,
      },
    };
  }
}

export default DashboardDAO;
