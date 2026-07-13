import { hashPassword } from "../utils/password.js";

const SORT_COLUMNS = {
  usuario_id: "u.usuario_id",
  usuario_nome: "u.usuario_nome",
  usuario_email: "u.usuario_email",
  usuario_username: "u.usuario_username",
  usuario_ativo: "u.usuario_ativo",
  tenant_nome_default: "td.tenant_nome",
};

const normalizeIds = (values = []) =>
  [...new Set((Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0))];

const ALLOWED_PROFILES = new Set([
  "usuario",
  "vendedor",
  "pdv_operador",
  "pdv_supervisor",
  "gerente",
]);

const normalizeProfiles = (values = []) => {
  const profiles = [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter((value) => ALLOWED_PROFILES.has(value)))];

  return profiles.length ? profiles : ["usuario"];
};

const buildOrderBy = (sort = {}) => {
  const entries = Object.entries(sort)
    .map(([column, direction]) => {
      if (!SORT_COLUMNS[column]) return null;
      const normalizedDirection = String(direction).toUpperCase() === "DESC" ? "DESC" : "ASC";
      return `${SORT_COLUMNS[column]} ${normalizedDirection}`;
    })
    .filter(Boolean);

  return entries.length ? entries.join(", ") : "u.usuario_id DESC";
};

class UsuarioDAO {
  static async listar(client, { page = 1, limit = 20, search = "", sort = {}, tenantId }) {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeLimit = Number(limit) > 0 ? Math.min(Number(limit), 100) : 20;
    const offset = (safePage - 1) * safeLimit;
    const params = [tenantId];
    const searchTerm = String(search || "").trim();

    let searchSql = "";
    if (searchTerm) {
      params.push(searchTerm);
      searchSql = `
        AND (
          LOWER(u.usuario_nome) LIKE LOWER('%' || $2 || '%')
          OR LOWER(u.usuario_email) LIKE LOWER('%' || $2 || '%')
          OR LOWER(u.usuario_username) LIKE LOWER('%' || $2 || '%')
        )
      `;
    }

    const orderBy = buildOrderBy(sort);
    const listParams = [...params, safeLimit, offset];
    const limitIndex = listParams.length - 1;
    const offsetIndex = listParams.length;

    const sql = `
      SELECT
        u.usuario_id,
        u.usuario_nome,
        u.usuario_email,
        u.usuario_username,
        u.usuario_ativo,
        u.usuario_primeiro_login,
        u.tenant_id_default,
        td.tenant_nome AS tenant_nome_default
      FROM usuario u
      JOIN usuario_tenant utc
        ON utc.usuario_id = u.usuario_id
       AND utc.tenant_id = $1
       AND utc.ativo = TRUE
      LEFT JOIN tenant td ON td.tenant_id = u.tenant_id_default
      WHERE u.usuario_excluido = FALSE
        AND COALESCE(u.usuario_master, FALSE) = FALSE
      ${searchSql}
      ORDER BY ${orderBy}
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const totalSql = `
      SELECT COUNT(*)::int AS total
      FROM usuario u
      JOIN usuario_tenant utc
        ON utc.usuario_id = u.usuario_id
       AND utc.tenant_id = $1
       AND utc.ativo = TRUE
      WHERE u.usuario_excluido = FALSE
        AND COALESCE(u.usuario_master, FALSE) = FALSE
      ${searchSql}
    `;

    const [listResult, totalResult] = await Promise.all([
      client.query(sql, listParams),
      client.query(totalSql, params),
    ]);

    const total = totalResult.rows[0]?.total || 0;
    return {
      data: listResult.rows,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      total,
      page: safePage,
    };
  }

  static async listarFiliaisGerenciaveis(client, actorUserId) {
    const sql = `
      SELECT
        t.tenant_id,
        t.tenant_nome,
        t.tenant_slug,
        t.tenant_documento,
        ut.perfil
      FROM usuario_tenant ut
      JOIN tenant t ON t.tenant_id = ut.tenant_id
      JOIN usuario u ON u.usuario_id = ut.usuario_id
      WHERE ut.usuario_id = $1
        AND ut.ativo = TRUE
        AND t.tenant_ativo = TRUE
        AND (
          u.usuario_master = TRUE
          OR LOWER(COALESCE(ut.perfil, '')) = 'admin'
        )
      ORDER BY t.tenant_nome
    `;

    const { rows } = await client.query(sql, [actorUserId]);
    return rows;
  }

  static async usuarioPodeAdministrarFilial(client, { actorUserId, currentTenantId }) {
    const { rows } = await client.query(
      `
        SELECT 1
        FROM usuario u
        JOIN usuario_tenant ut
          ON ut.usuario_id = u.usuario_id
         AND ut.tenant_id = $2
         AND ut.ativo = TRUE
        JOIN tenant t
          ON t.tenant_id = ut.tenant_id
         AND t.tenant_ativo = TRUE
        WHERE u.usuario_id = $1
          AND u.usuario_ativo = TRUE
          AND u.usuario_excluido = FALSE
          AND (
            u.usuario_master = TRUE
            OR LOWER(COALESCE(ut.perfil, '')) = 'admin'
          )
        LIMIT 1
      `,
      [actorUserId, currentTenantId]
    );

    return !!rows[0];
  }

  static async buscarPorId(client, { usuarioId, currentTenantId, actorUserId }) {
    const userSql = `
      SELECT
        u.usuario_id,
        u.usuario_nome,
        u.usuario_email,
        u.usuario_username,
        u.usuario_ativo,
        u.usuario_primeiro_login,
        u.tenant_id_default
      FROM usuario u
      JOIN usuario_tenant utc
        ON utc.usuario_id = u.usuario_id
       AND utc.tenant_id = $2
       AND utc.ativo = TRUE
      WHERE u.usuario_id = $1
        AND u.usuario_excluido = FALSE
        AND COALESCE(u.usuario_master, FALSE) = FALSE
      LIMIT 1
    `;

    const manageableTenants = await this.listarFiliaisGerenciaveis(client, actorUserId);
    const manageableIds = manageableTenants.map((item) => Number(item.tenant_id));

    const { rows } = await client.query(userSql, [usuarioId, currentTenantId]);
    const usuario = rows[0] || null;

    if (!usuario) return null;

    const tenantRows = await client.query(
      `
        SELECT tenant_id
        FROM usuario_tenant
        WHERE usuario_id = $1
          AND ativo = TRUE
        ORDER BY tenant_id
      `,
      [usuarioId]
    );

    const assignedIds = tenantRows.rows.map((item) => Number(item.tenant_id));
    const manageableAssignedIds = assignedIds.filter((id) => manageableIds.includes(id));
    const hiddenAssignments = assignedIds.filter((id) => !manageableIds.includes(id));
    const profileRows = await client.query(
      `
        SELECT DISTINCT perfil
        FROM usuario_tenant_perfil
        WHERE usuario_id = $1
          AND tenant_id = ANY($2::int[])
          AND ativo = TRUE
        ORDER BY perfil
      `,
      [usuarioId, manageableAssignedIds.length ? manageableAssignedIds : [0]]
    );

    return {
      usuario,
      tenantIds: manageableAssignedIds,
      perfis: profileRows.rows.map((item) => item.perfil),
      hiddenAssignmentsCount: hiddenAssignments.length,
      manageableTenants,
    };
  }

  static async criar(client, { actorUserId, currentTenantId, payload }) {
    const usuarioNome = String(payload.usuario_nome || "").trim();
    const usuarioEmail = String(payload.usuario_email || "").trim().toLowerCase();
    const usuarioUsername = usuarioEmail;
    const usuarioSenha = String(payload.usuario_senha || "");
    const usuarioAtivo = payload.usuario_ativo !== false;
    const perfis = normalizeProfiles(payload.perfis);
    const manageableTenants = await this.listarFiliaisGerenciaveis(client, actorUserId);
    const manageableIds = manageableTenants.map((item) => Number(item.tenant_id));

    if (!manageableIds.includes(Number(currentTenantId))) {
      throw new Error("Usuário atual sem acesso para cadastrar nesta filial.");
    }

    if (!usuarioNome || !usuarioEmail || !usuarioSenha) {
      throw new Error("Preencha nome, e-mail e senha.");
    }

    if (usuarioSenha.length < 6) {
      throw new Error("A senha inicial precisa ter pelo menos 6 caracteres.");
    }

    const requestedTenantIds = normalizeIds(payload.tenant_ids);
    const allowedTenantIds = normalizeIds(
      requestedTenantIds.filter((id) => manageableIds.includes(id)).concat(currentTenantId)
    );

    const tenantIdDefault = allowedTenantIds.includes(Number(payload.tenant_id_default))
      ? Number(payload.tenant_id_default)
      : Number(currentTenantId);

    await client.query("BEGIN");

    try {
      const duplicateUser = await client.query(
        `
          SELECT usuario_id
          FROM usuario
          WHERE usuario_excluido = FALSE
            AND (
              LOWER(usuario_email) = LOWER($1)
            )
          LIMIT 1
        `,
        [usuarioEmail]
      );

      if (duplicateUser.rowCount > 0) {
        throw new Error("Já existe um usuário com este e-mail.");
      }

      const passwordHash = hashPassword(usuarioSenha);
      const insertResult = await client.query(
        `
          INSERT INTO usuario (
            tenant_id_default,
            usuario_nome,
            usuario_email,
            usuario_username,
            usuario_senha,
            usuario_ativo,
            usuario_primeiro_login,
            usuario_excluido
          )
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE)
          RETURNING
            usuario_id,
            usuario_nome,
            usuario_email,
            usuario_username,
            usuario_ativo,
            usuario_primeiro_login,
            tenant_id_default
        `,
        [
          tenantIdDefault,
          usuarioNome,
          usuarioEmail,
          usuarioUsername,
          passwordHash,
          usuarioAtivo,
        ]
      );

      const usuario = insertResult.rows[0];

      for (const tenantId of allowedTenantIds) {
        await client.query(
          `
            INSERT INTO usuario_tenant (tenant_id, usuario_id, perfil, ativo)
            VALUES ($1, $2, 'usuario', TRUE)
          `,
          [tenantId, usuario.usuario_id]
        );

        for (const perfil of perfis) {
          await client.query(
            `
              INSERT INTO usuario_tenant_perfil (tenant_id, usuario_id, perfil, ativo)
              VALUES ($1, $2, $3, TRUE)
              ON CONFLICT (tenant_id, usuario_id, perfil)
              DO UPDATE SET ativo = TRUE, atualizado_em = NOW()
            `,
            [tenantId, usuario.usuario_id, perfil]
          );
        }
      }

      await client.query("COMMIT");
      return {
        ...usuario,
        tenant_ids: allowedTenantIds,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async atualizar(client, { actorUserId, currentTenantId, usuarioId, payload }) {
    const existing = await this.buscarPorId(client, {
      usuarioId,
      currentTenantId,
      actorUserId,
    });

    if (!existing) {
      throw new Error("Usuário não encontrado para esta filial.");
    }

    const usuarioNome = String(payload.usuario_nome || "").trim();
    const usuarioEmail = String(payload.usuario_email || "").trim().toLowerCase();
    const usuarioUsername = usuarioEmail;
    const usuarioSenha = String(payload.usuario_senha || "");
    const usuarioAtivo = payload.usuario_ativo !== false;
    const perfis = normalizeProfiles(payload.perfis);
    const manageableIds = existing.manageableTenants.map((item) => Number(item.tenant_id));

    if (!usuarioNome || !usuarioEmail) {
      throw new Error("Preencha nome e e-mail.");
    }

    if (actorUserId === Number(usuarioId) && !usuarioAtivo) {
      throw new Error("Não é permitido desativar o próprio usuário.");
    }

    const requestedTenantIds = normalizeIds(payload.tenant_ids);
    const allowedTenantIds = normalizeIds(
      requestedTenantIds.filter((id) => manageableIds.includes(id)).concat(currentTenantId)
    );

    const existingTenantIds = normalizeIds(existing.tenantIds);
    const hiddenTenantIds = await client.query(
      `
        SELECT tenant_id
        FROM usuario_tenant
        WHERE usuario_id = $1
          AND ativo = TRUE
          AND tenant_id <> ALL($2::int[])
      `,
      [usuarioId, manageableIds.length ? manageableIds : [0]]
    );

    const preservedTenantIds = hiddenTenantIds.rows.map((item) => Number(item.tenant_id));
    const finalTenantIds = normalizeIds([...allowedTenantIds, ...preservedTenantIds]);

    const requestedDefault = Number(payload.tenant_id_default);
    const currentDefault = Number(existing.usuario.tenant_id_default);
    const finalDefault = finalTenantIds.includes(requestedDefault)
      ? requestedDefault
      : finalTenantIds.includes(currentDefault)
      ? currentDefault
      : finalTenantIds[0] || Number(currentTenantId);

    await client.query("BEGIN");

    try {
      const duplicateUser = await client.query(
        `
          SELECT usuario_id
          FROM usuario
          WHERE usuario_id <> $2
            AND usuario_excluido = FALSE
            AND (
              LOWER(usuario_email) = LOWER($1)
            )
          LIMIT 1
        `,
        [usuarioEmail, usuarioId]
      );

      if (duplicateUser.rowCount > 0) {
        throw new Error("Já existe um usuário com este e-mail.");
      }

      const passwordHash = usuarioSenha ? hashPassword(usuarioSenha) : null;
      const passwordSql = passwordHash
        ? ", usuario_senha = $6, usuario_primeiro_login = TRUE"
        : "";
      const updateParams = passwordHash
        ? [finalDefault, usuarioNome, usuarioEmail, usuarioUsername, usuarioAtivo, passwordHash, usuarioId]
        : [finalDefault, usuarioNome, usuarioEmail, usuarioUsername, usuarioAtivo, usuarioId];
      const usuarioIdIndex = passwordHash ? 7 : 6;

      const updateResult = await client.query(
        `
          UPDATE usuario
          SET
            tenant_id_default = $1,
            usuario_nome = $2,
            usuario_email = $3,
            usuario_username = $4,
            usuario_ativo = $5
            ${passwordSql},
            atualizado_em = NOW()
          WHERE usuario_id = $${usuarioIdIndex}
            AND usuario_excluido = FALSE
          RETURNING
            usuario_id,
            usuario_nome,
            usuario_email,
            usuario_username,
            usuario_ativo,
            usuario_primeiro_login,
            tenant_id_default
        `,
        updateParams
      );

      const usuario = updateResult.rows[0];
      if (!usuario) {
        throw new Error("Usuário não encontrado.");
      }

      await client.query(
        `
          UPDATE usuario_tenant
          SET ativo = FALSE
          WHERE usuario_id = $1
            AND tenant_id = ANY($2::int[])
        `,
        [usuarioId, manageableIds]
      );

      await client.query(
        `
          UPDATE usuario_tenant_perfil
          SET ativo = FALSE, atualizado_em = NOW()
          WHERE usuario_id = $1
            AND tenant_id = ANY($2::int[])
        `,
        [usuarioId, manageableIds]
      );

      for (const tenantId of allowedTenantIds) {
        await client.query(
          `
            INSERT INTO usuario_tenant (tenant_id, usuario_id, perfil, ativo)
            VALUES ($1, $2, 'usuario', TRUE)
            ON CONFLICT (tenant_id, usuario_id)
            DO UPDATE SET ativo = TRUE
          `,
          [tenantId, usuarioId]
        );

        for (const perfil of perfis) {
          await client.query(
            `
              INSERT INTO usuario_tenant_perfil (tenant_id, usuario_id, perfil, ativo)
              VALUES ($1, $2, $3, TRUE)
              ON CONFLICT (tenant_id, usuario_id, perfil)
              DO UPDATE SET ativo = TRUE, atualizado_em = NOW()
            `,
            [tenantId, usuarioId, perfil]
          );
        }
      }

      await client.query("COMMIT");
      return {
        ...usuario,
        tenant_ids: finalTenantIds,
        previous_tenant_ids: existingTenantIds,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async excluir(client, { actorUserId, currentTenantId, usuarioId }) {
    if (Number(actorUserId) === Number(usuarioId)) {
      throw new Error("Não é permitido excluir o próprio usuário.");
    }

    const existing = await this.buscarPorId(client, {
      usuarioId,
      currentTenantId,
      actorUserId,
    });

    if (!existing) {
      throw new Error("Usuário não encontrado para esta filial.");
    }

    await client.query("BEGIN");

    try {
      await client.query(
        `
          UPDATE usuario
          SET
            usuario_ativo = FALSE,
            usuario_excluido = TRUE,
            atualizado_em = NOW()
          WHERE usuario_id = $1
        `,
        [usuarioId]
      );

      await client.query(
        `
          UPDATE usuario_tenant
          SET ativo = FALSE
          WHERE usuario_id = $1
        `,
        [usuarioId]
      );

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default UsuarioDAO;
