import { getDb } from "../../db/connection.js";

export function listPessoas({ search = "", limit = 50 } = {}) {
  const db = getDb();
  const like = `%${search}%`;
  return db
    .prepare(
      `SELECT pessoa_id, erp_id, nome, documento, telefone, email, ativo
       FROM pessoa
       WHERE ativo = 1
         AND (? = '' OR nome LIKE ? OR documento LIKE ? OR telefone LIKE ?)
       ORDER BY nome
       LIMIT ?`,
    )
    .all(search, like, like, like, limit);
}

export function createPessoa(pessoa) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO pessoa (nome, documento, telefone, email)
       VALUES (?, ?, ?, ?)`,
    )
    .run(pessoa.nome, pessoa.documento || null, pessoa.telefone || null, pessoa.email || null);

  return result.lastInsertRowid;
}
