import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

class TenantDAO {
  static async getById(client, tenantId) {
    const sql = `
      SELECT tenant_id, tenant_nome, tenant_slug, tenant_documento, tenant_ativo
      FROM tenant
      WHERE tenant_id = $1
      LIMIT 1
    `;

    const { rows } = await client.query(sql, [tenantId]);
    return rows[0] || null;
  }

  static async getCurrent(client) {
    const sql = `
      SELECT tenant_id, tenant_nome, tenant_slug, tenant_documento, tenant_ativo
      FROM tenant
      WHERE tenant_id = ${TENANT_CONTEXT_SQL}
      LIMIT 1
    `;

    const { rows } = await client.query(sql);
    return rows[0] || null;
  }
}

export default TenantDAO;
