import { getDb } from "../../db/connection.js";
import { getTerminalTenantErpId } from "../configuracao/localConfigRepository.js";

export function listPessoas({ search = "", limit = 50 } = {}) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  const like = `%${search}%`;
  return db
    .prepare(
      `SELECT pessoa_id, erp_id, nome, documento, telefone, email, ativo
       FROM pessoa
       WHERE tenant_erp_id = ?
         AND ativo = 1
         AND (? = '' OR nome LIKE ? OR documento LIKE ? OR telefone LIKE ?)
       ORDER BY nome
       LIMIT ?`,
    )
    .all(tenantErpId, search, like, like, like, limit);
}

export function createPessoa(pessoa) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  if (!tenantErpId) {
    throw new Error("PDV local ainda não pareado com uma filial do ERP.");
  }

  const result = db
    .prepare(
      `INSERT INTO pessoa (tenant_erp_id, nome, documento, telefone, email)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      tenantErpId,
      pessoa.nome,
      pessoa.documento || null,
      pessoa.telefone || null,
      pessoa.email || null,
    );

  return result.lastInsertRowid;
}
