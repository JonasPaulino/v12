import { getDb } from "../../db/connection.js";
import { verifyPassword } from "../../utils/password.js";
import { assertTerminalConfigurado, getTerminalTenantErpId } from "../configuracao/localConfigRepository.js";

export const OPERADOR_PERFIS = Object.freeze({
  PDV_OPERADOR: "pdv_operador",
  PDV_SUPERVISOR: "pdv_supervisor",
  GERENTE: "gerente",
  ADMIN_LOCAL: "admin_local",
});

export function sincronizarOperadoresErp(usuarios = []) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  if (!tenantErpId) {
    throw new Error("PDV local ainda não pareado com uma filial do ERP.");
  }
  const sync = db.transaction((items) => {
    db.prepare(
      `UPDATE operador_local
       SET ativo = 0, atualizado_em = CURRENT_TIMESTAMP
       WHERE tenant_erp_id = ?
         AND erp_usuario_id IS NOT NULL`,
    ).run(tenantErpId);

    const upsertOperador = db.prepare(
      `INSERT INTO operador_local (
        tenant_erp_id,
        erp_usuario_id,
        nome,
        email,
        senha_hash,
        ativo,
        primeiro_acesso,
        sincronizado_em
      )
      VALUES (@tenant_erp_id, @erp_usuario_id, @nome, @email, @senha_hash, @ativo, @primeiro_acesso, CURRENT_TIMESTAMP)
      ON CONFLICT(erp_usuario_id) WHERE erp_usuario_id IS NOT NULL DO UPDATE SET
        tenant_erp_id = excluded.tenant_erp_id,
        nome = excluded.nome,
        email = excluded.email,
        senha_hash = excluded.senha_hash,
        ativo = excluded.ativo,
        primeiro_acesso = excluded.primeiro_acesso,
        sincronizado_em = CURRENT_TIMESTAMP,
        atualizado_em = CURRENT_TIMESTAMP`,
    );

    const findOperador = db.prepare(
      "SELECT operador_id FROM operador_local WHERE tenant_erp_id = ? AND erp_usuario_id = ?",
    );
    const disablePerfis = db.prepare(
      `UPDATE operador_perfil
       SET ativo = 0
       WHERE tenant_erp_id = ?
         AND operador_id = ?`,
    );
    const upsertPerfil = db.prepare(
      `INSERT INTO operador_perfil (tenant_erp_id, operador_id, perfil, ativo)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(operador_id, perfil) DO UPDATE SET
         tenant_erp_id = excluded.tenant_erp_id,
         ativo = 1`,
    );

    for (const usuario of items) {
      const perfis = Array.isArray(usuario.perfis) ? usuario.perfis : [];
      upsertOperador.run({
        tenant_erp_id: tenantErpId,
        erp_usuario_id: Number(usuario.erp_usuario_id),
        nome: String(usuario.nome || "").trim(),
        email: String(usuario.email || "").trim().toLowerCase(),
        senha_hash: usuario.senha_hash,
        ativo: usuario.ativo === false ? 0 : 1,
        primeiro_acesso: usuario.primeiro_acesso ? 1 : 0,
      });

      const operador = findOperador.get(tenantErpId, Number(usuario.erp_usuario_id));
      if (!operador) continue;

      disablePerfis.run(tenantErpId, operador.operador_id);
      for (const perfil of perfis) {
        if (Object.values(OPERADOR_PERFIS).includes(perfil)) {
          upsertPerfil.run(tenantErpId, operador.operador_id, perfil);
        }
      }
    }
  });

  sync(usuarios);
  return usuarios.length;
}

export function getOperadorById(operadorId) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const operador = db
    .prepare(
      `SELECT operador_id, erp_usuario_id, nome, email, ativo, primeiro_acesso, sincronizado_em, criado_em, atualizado_em
       FROM operador_local
       WHERE tenant_erp_id = ?
         AND operador_id = ?`,
    )
    .get(tenantErpId, operadorId);

  if (!operador) return null;

  operador.perfis = db
    .prepare(
      "SELECT perfil FROM operador_perfil WHERE tenant_erp_id = ? AND operador_id = ? AND ativo = 1 ORDER BY perfil",
    )
    .all(tenantErpId, operadorId)
    .map((row) => row.perfil);

  return operador;
}

export function autenticarOperador({ email, senha }) {
  assertTerminalConfigurado();
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const operador = db
    .prepare(
      `SELECT operador_id, senha_hash, ativo
       FROM operador_local
       WHERE tenant_erp_id = ?
         AND LOWER(TRIM(email)) = LOWER(TRIM(?))
       LIMIT 1`,
    )
    .get(tenantErpId, String(email || "").trim());

  if (!operador || !Number(operador.ativo) || !verifyPassword(senha, operador.senha_hash)) {
    throw new Error("Operador ou senha invalida.");
  }

  return getOperadorById(operador.operador_id);
}

export function atualizarSenhaOperadorLocal({ operadorId, senhaHash }) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  db.prepare(
    `UPDATE operador_local
     SET
       senha_hash = ?,
       primeiro_acesso = 0,
       sincronizado_em = CURRENT_TIMESTAMP,
       atualizado_em = CURRENT_TIMESTAMP
     WHERE tenant_erp_id = ?
       AND operador_id = ?`,
  ).run(senhaHash, tenantErpId, operadorId);

  return getOperadorById(operadorId);
}

export function operadorTemPerfil(operadorId, perfis = []) {
  if (!operadorId) return false;
  const tenantErpId = getTerminalTenantErpId();

  const perfilList = Array.isArray(perfis) ? perfis : [perfis];
  if (!perfilList.length) return false;

  const placeholders = perfilList.map(() => "?").join(",");
  const row = getDb()
    .prepare(
      `SELECT 1
       FROM operador_perfil
       WHERE tenant_erp_id = ?
         AND operador_id = ?
         AND ativo = 1
         AND perfil IN (${placeholders})
       LIMIT 1`,
    )
    .get(tenantErpId, operadorId, ...perfilList);

  return !!row;
}
