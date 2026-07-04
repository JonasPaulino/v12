import { getDb } from "../db/connection.js";

export function getConfigValue(chave, fallback = null) {
  const db = getDb();
  const row = db.prepare("SELECT valor FROM config_local WHERE chave = ?").get(chave);
  return row?.valor ?? fallback;
}

export function setConfigValue(chave, valor) {
  const db = getDb();
  db.prepare(
    `INSERT INTO config_local (chave, valor, atualizado_em)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(chave) DO UPDATE SET
       valor = excluded.valor,
       atualizado_em = CURRENT_TIMESTAMP`,
  ).run(chave, valor);
}
