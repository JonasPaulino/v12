import { syncStatus } from "@v12-desktop/shared";
import { getDb } from "../db/connection.js";

export function enqueueSyncEvent(tipoEvento, payload) {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO sync_queue (tipo_evento, payload_json, status)
       VALUES (?, ?, ?)`,
    )
    .run(tipoEvento, JSON.stringify(payload), syncStatus.PENDENTE);

  return result.lastInsertRowid;
}

export function listPendingSync(limit = 50) {
  const db = getDb();
  return db
    .prepare(
      `SELECT sync_id, tipo_evento, payload_json, status, tentativas, ultimo_erro, criado_em, enviado_em
       FROM sync_queue
       WHERE status IN (?, ?)
       ORDER BY criado_em ASC
       LIMIT ?`,
    )
    .all(syncStatus.PENDENTE, syncStatus.ERRO, limit)
    .map((row) => ({ ...row, payload: JSON.parse(row.payload_json) }));
}

export function markSyncSuccess(syncId) {
  const db = getDb();
  db.prepare(
    `UPDATE sync_queue
     SET status = ?, enviado_em = CURRENT_TIMESTAMP, ultimo_erro = NULL
     WHERE sync_id = ?`,
  ).run(syncStatus.SUCESSO, syncId);
}

export function markSyncError(syncId, error) {
  const db = getDb();
  db.prepare(
    `UPDATE sync_queue
     SET status = ?, tentativas = tentativas + 1, ultimo_erro = ?
     WHERE sync_id = ?`,
  ).run(syncStatus.ERRO, String(error?.message || error), syncId);
}
