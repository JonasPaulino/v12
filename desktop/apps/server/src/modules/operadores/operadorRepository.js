import { getDb } from "../../db/connection.js";
import { hashPassword, verifyPassword } from "../../utils/password.js";

export const OPERADOR_PERFIS = Object.freeze({
  PDV_OPERADOR: "pdv_operador",
  PDV_SUPERVISOR: "pdv_supervisor",
  ADMIN_LOCAL: "admin_local",
});

export function salvarOperadorLocal(payload = {}) {
  const nome = String(payload.nome || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const senha = String(payload.senha || "");
  const perfis = Array.isArray(payload.perfis) && payload.perfis.length
    ? payload.perfis
    : [OPERADOR_PERFIS.PDV_OPERADOR];

  if (!nome || !email || !senha) {
    throw new Error("Informe nome, e-mail e senha do operador local.");
  }

  if (senha.length < 6) {
    throw new Error("A senha do operador precisa ter pelo menos 6 caracteres.");
  }

  const db = getDb();
  const save = db.transaction(() => {
    const existing = db
      .prepare("SELECT operador_id FROM operador_local WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))")
      .get(email);

    let operadorId = existing?.operador_id;
    const senhaHash = hashPassword(senha);

    if (operadorId) {
      db.prepare(
        `UPDATE operador_local
         SET nome = ?, senha_hash = ?, ativo = 1, atualizado_em = CURRENT_TIMESTAMP
         WHERE operador_id = ?`,
      ).run(nome, senhaHash, operadorId);
    } else {
      const result = db.prepare(
        `INSERT INTO operador_local (erp_usuario_id, nome, email, senha_hash, ativo)
         VALUES (?, ?, ?, ?, 1)`,
      ).run(payload.erp_usuario_id || null, nome, email, senhaHash);
      operadorId = result.lastInsertRowid;
    }

    const insertPerfil = db.prepare(
      `INSERT INTO operador_perfil (operador_id, perfil, ativo)
       VALUES (?, ?, 1)
       ON CONFLICT(operador_id, perfil) DO UPDATE SET ativo = 1`,
    );

    for (const perfil of perfis) {
      insertPerfil.run(operadorId, perfil);
    }

    return getOperadorById(operadorId);
  });

  return save();
}

export function getOperadorById(operadorId) {
  const db = getDb();
  const operador = db
    .prepare(
      `SELECT operador_id, erp_usuario_id, nome, email, ativo, primeiro_acesso, sincronizado_em, criado_em, atualizado_em
       FROM operador_local
       WHERE operador_id = ?`,
    )
    .get(operadorId);

  if (!operador) return null;

  operador.perfis = db
    .prepare("SELECT perfil FROM operador_perfil WHERE operador_id = ? AND ativo = 1 ORDER BY perfil")
    .all(operadorId)
    .map((row) => row.perfil);

  return operador;
}

export function autenticarOperador({ email, senha }) {
  const db = getDb();
  const operador = db
    .prepare(
      `SELECT operador_id, senha_hash, ativo
       FROM operador_local
       WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))
       LIMIT 1`,
    )
    .get(String(email || "").trim());

  if (!operador || !Number(operador.ativo) || !verifyPassword(senha, operador.senha_hash)) {
    throw new Error("Operador ou senha invalida.");
  }

  return getOperadorById(operador.operador_id);
}

export function operadorTemPerfil(operadorId, perfis = []) {
  if (!operadorId) return false;

  const perfilList = Array.isArray(perfis) ? perfis : [perfis];
  if (!perfilList.length) return false;

  const placeholders = perfilList.map(() => "?").join(",");
  const row = getDb()
    .prepare(
      `SELECT 1
       FROM operador_perfil
       WHERE operador_id = ?
         AND ativo = 1
         AND perfil IN (${placeholders})
       LIMIT 1`,
    )
    .get(operadorId, ...perfilList);

  return !!row;
}
