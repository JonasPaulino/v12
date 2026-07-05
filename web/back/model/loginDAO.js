import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

class LoginDAO {
  static async buscarUsuarioPorEmail(client, email) {
    const sql = `
      SELECT
        usuario_id,
        tenant_id_default,
        usuario_nome,
        usuario_email,
        usuario_username,
        usuario_senha,
        usuario_ativo,
        usuario_primeiro_login,
        usuario_master
      FROM usuario
      WHERE
        usuario_excluido = FALSE
        AND LOWER(TRIM(usuario_email)) = LOWER(TRIM($1))
      LIMIT 1
    `;

    const { rows } = await client.query(sql, [email]);
    return rows[0] || null;
  }

  static async buscarUsuarioPorId(client, usuarioId) {
    const sql = `
      SELECT
        usuario_id,
        tenant_id_default,
        usuario_nome,
        usuario_email,
        usuario_username,
        usuario_ativo,
        usuario_primeiro_login,
        usuario_master
      FROM usuario
      WHERE usuario_id = $1
        AND usuario_excluido = FALSE
      LIMIT 1
    `;

    const { rows } = await client.query(sql, [usuarioId]);
    return rows[0] || null;
  }

  static async listarTenantsDoUsuario(client, usuarioId) {
    const sql = `
      SELECT
        t.tenant_id,
        t.tenant_nome,
        t.tenant_slug,
        t.tenant_documento,
        t.tenant_ativo,
        COALESCE(t.tenant_acesso_bloqueado, FALSE) AS tenant_acesso_bloqueado,
        t.tenant_bloqueio_motivo,
        ut.perfil,
        ut.ativo
      FROM usuario_tenant ut
      JOIN tenant t ON t.tenant_id = ut.tenant_id
      WHERE ut.usuario_id = $1
        AND ut.ativo = TRUE
      ORDER BY t.tenant_nome
    `;

    const { rows } = await client.query(sql, [usuarioId]);
    return rows;
  }

  static async listarTenantIdsComPerfil(client, usuarioId, perfil) {
    const { rows } = await client.query(
      `
        SELECT DISTINCT tenant_id
        FROM usuario_tenant_perfil
        WHERE usuario_id = $1
          AND perfil = $2
          AND ativo = TRUE
      `,
      [usuarioId, perfil]
    );

    return rows.map((row) => Number(row.tenant_id));
  }

  static async usuarioPossuiTenant(client, usuarioId, tenantId) {
    const sql = `
      SELECT 1
      FROM usuario_tenant
      WHERE usuario_id = $1
        AND tenant_id = $2
        AND ativo = TRUE
      LIMIT 1
    `;

    const { rows } = await client.query(sql, [usuarioId, tenantId]);
    return !!rows[0];
  }

  static async atualizarUltimoAcessoTenant(client, usuarioId, tenantId) {
    const sql = `
      UPDATE usuario_tenant
      SET ultimo_acesso_em = NOW()
      WHERE usuario_id = $1
        AND tenant_id = $2
    `;

    await client.query(sql, [usuarioId, tenantId]);
  }

  static async salvarSessaoUsuario(client, usuarioId, tenantId, token, dispositivo, ip) {
    const sql = `
      INSERT INTO usuario_sessao (usuario_id, tenant_id, token, dispositivo, ip)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING usuario_sessao_id
    `;

    const { rows } = await client.query(sql, [usuarioId, tenantId, token, dispositivo, ip]);
    return rows[0]?.usuario_sessao_id || null;
  }

  static async obterUltimaSessao(client, usuarioId) {
    const sql = `
      SELECT usuario_sessao_id, tenant_id, token, criado_em
      FROM usuario_sessao
      WHERE usuario_id = $1
      ORDER BY criado_em DESC, usuario_sessao_id DESC
      LIMIT 1
    `;

    const { rows } = await client.query(sql, [usuarioId]);
    return rows[0] || null;
  }

  static async buscarTenantAtual(client, usuarioId) {
    const sql = `
      SELECT
        t.tenant_id,
        t.tenant_nome,
        t.tenant_slug,
        t.tenant_documento,
        t.tenant_ativo,
        COALESCE(t.tenant_acesso_bloqueado, FALSE) AS tenant_acesso_bloqueado,
        t.tenant_bloqueio_motivo,
        ut.perfil
      FROM usuario_tenant ut
      JOIN tenant t ON t.tenant_id = ut.tenant_id
      WHERE ut.usuario_id = $1
        AND ut.tenant_id = ${TENANT_CONTEXT_SQL}
        AND ut.ativo = TRUE
      LIMIT 1
    `;

    const { rows } = await client.query(sql, [usuarioId]);
    return rows[0] || null;
  }

  static async atualizarSenhaPrimeiroLogin(client, usuarioId, senhaHash) {
    const sql = `
      UPDATE usuario
      SET
        usuario_senha = $2,
        usuario_primeiro_login = FALSE,
        atualizado_em = NOW()
      WHERE usuario_id = $1
        AND usuario_excluido = FALSE
      RETURNING
        usuario_id,
        tenant_id_default,
        usuario_nome,
        usuario_email,
        usuario_username,
        usuario_ativo,
        usuario_primeiro_login,
        usuario_master
    `;

    const { rows } = await client.query(sql, [usuarioId, senhaHash]);
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
