import { hashPassword } from "../utils/password.js";

const ALLOWED_PROFILES = new Set(["admin", "suporte", "financeiro", "vendedor"]);

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

  static async criar(client, payload = {}) {
    const usuarioNome = String(payload.usuario_nome || "").trim();
    const usuarioEmail = String(payload.usuario_email || "").trim().toLowerCase();
    const usuarioUsername = usuarioEmail;
    const usuarioSenha = String(payload.usuario_senha || "");
    const perfil = ALLOWED_PROFILES.has(String(payload.perfil || "").trim())
      ? String(payload.perfil).trim()
      : "suporte";
    const usuarioAtivo = payload.usuario_ativo !== false;

    if (!usuarioNome || !usuarioEmail || !usuarioSenha) {
      throw new Error("Preencha nome, e-mail e senha.");
    }

    if (usuarioSenha.length < 6) {
      throw new Error("A senha inicial precisa ter pelo menos 6 caracteres.");
    }

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

      const tenantResult = await client.query(
        `
          SELECT tenant_id
          FROM tenant
          WHERE tenant_ativo = TRUE
          ORDER BY tenant_id
          LIMIT 1
        `
      );
      const tenantIdDefault = tenantResult.rows[0]?.tenant_id || null;

      if (!tenantIdDefault) {
        throw new Error("Nenhuma filial ativa encontrada para concluir o vínculo de login.");
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
            usuario_master,
            usuario_excluido
          )
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, FALSE)
          RETURNING
            usuario_id,
            usuario_nome,
            usuario_email,
            usuario_username,
            usuario_ativo,
            usuario_primeiro_login,
            usuario_master,
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

      await client.query(
        `
          INSERT INTO usuario_tenant (tenant_id, usuario_id, perfil, ativo)
          VALUES ($1, $2, 'admin', TRUE)
          ON CONFLICT (tenant_id, usuario_id)
          DO UPDATE SET perfil = 'admin', ativo = TRUE
        `,
        [tenantIdDefault, usuario.usuario_id]
      );

      await client.query(
        `
          INSERT INTO gestao.usuario_interno (usuario_id, perfil, ativo)
          VALUES ($1, $2, $3)
          ON CONFLICT (usuario_id)
          DO UPDATE SET
            perfil = EXCLUDED.perfil,
            ativo = EXCLUDED.ativo,
            atualizado_em = NOW()
        `,
        [usuario.usuario_id, perfil, usuarioAtivo]
      );

      await client.query("COMMIT");

      return {
        ...usuario,
        perfil,
        acesso_gestao_ativo: usuarioAtivo,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  static async buscarPorId(client, usuarioId) {
    const { rows } = await client.query(
      `
        SELECT
          u.usuario_id,
          u.usuario_nome,
          u.usuario_email,
          u.usuario_username,
          u.usuario_ativo,
          u.usuario_master,
          u.usuario_primeiro_login,
          COALESCE(gi.perfil, CASE WHEN u.usuario_master THEN 'admin' ELSE 'suporte' END) AS perfil,
          COALESCE(gi.ativo, u.usuario_ativo) AS acesso_gestao_ativo,
          gi.usuario_interno_id
        FROM usuario u
        LEFT JOIN gestao.usuario_interno gi
          ON gi.usuario_id = u.usuario_id
        WHERE u.usuario_excluido = FALSE
          AND (
            u.usuario_master = TRUE
            OR gi.usuario_interno_id IS NOT NULL
          )
          AND u.usuario_id = $1
        LIMIT 1
      `,
      [Number(usuarioId)]
    );

    return rows[0] || null;
  }

  static async atualizar(client, { actorUserId, usuarioId, payload = {} }) {
    const targetUserId = Number(usuarioId);
    const actorId = Number(actorUserId || 0);
    const existing = await this.buscarPorId(client, targetUserId);

    if (!existing) {
      throw new Error("Usuário interno não encontrado.");
    }

    const usuarioNome = String(payload.usuario_nome || "").trim();
    const usuarioEmail = String(payload.usuario_email || "").trim().toLowerCase();
    const usuarioUsername = usuarioEmail;
    const usuarioSenha = String(payload.usuario_senha || "");
    const perfil = ALLOWED_PROFILES.has(String(payload.perfil || "").trim())
      ? String(payload.perfil).trim()
      : existing.perfil || "suporte";
    const usuarioAtivo = payload.usuario_ativo !== false;

    if (!usuarioNome || !usuarioEmail) {
      throw new Error("Preencha nome e e-mail.");
    }

    if (usuarioSenha && usuarioSenha.length < 6) {
      throw new Error("A nova senha precisa ter pelo menos 6 caracteres.");
    }

    if (actorId === targetUserId && !usuarioAtivo) {
      throw new Error("Não é permitido desativar o próprio usuário.");
    }

    await client.query("BEGIN");

    try {
      const duplicateUser = await client.query(
        `
          SELECT usuario_id
          FROM usuario
          WHERE usuario_excluido = FALSE
            AND usuario_id <> $2
            AND LOWER(usuario_email) = LOWER($1)
          LIMIT 1
        `,
        [usuarioEmail, targetUserId]
      );

      if (duplicateUser.rowCount > 0) {
        throw new Error("Já existe um usuário com este e-mail.");
      }

      const passwordHash = usuarioSenha ? hashPassword(usuarioSenha) : null;
      const forceFirstLogin = passwordHash && actorId !== targetUserId;
      const passwordSql = passwordHash
        ? `, usuario_senha = $4, usuario_primeiro_login = ${forceFirstLogin ? "TRUE" : "FALSE"}`
        : "";
      const userParams = passwordHash
        ? [usuarioNome, usuarioEmail, usuarioUsername, passwordHash, usuarioAtivo, targetUserId]
        : [usuarioNome, usuarioEmail, usuarioUsername, usuarioAtivo, targetUserId];
      const ativoIndex = passwordHash ? 5 : 4;
      const usuarioIdIndex = passwordHash ? 6 : 5;

      const updateResult = await client.query(
        `
          UPDATE usuario
          SET
            usuario_nome = $1,
            usuario_email = $2,
            usuario_username = $3
            ${passwordSql},
            usuario_ativo = $${ativoIndex},
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
            usuario_master
        `,
        userParams
      );

      const usuario = updateResult.rows[0];
      if (!usuario) {
        throw new Error("Usuário interno não encontrado.");
      }

      await client.query(
        `
          INSERT INTO gestao.usuario_interno (usuario_id, perfil, ativo)
          VALUES ($1, $2, $3)
          ON CONFLICT (usuario_id)
          DO UPDATE SET
            perfil = EXCLUDED.perfil,
            ativo = EXCLUDED.ativo,
            atualizado_em = NOW()
        `,
        [targetUserId, perfil, usuarioAtivo]
      );

      await client.query("COMMIT");

      return {
        ...usuario,
        perfil,
        acesso_gestao_ativo: usuarioAtivo,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default GestaoUsuarioDAO;
