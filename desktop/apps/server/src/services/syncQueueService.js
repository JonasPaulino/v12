import { syncStatus } from "@v12-desktop/shared";
import { getDb } from "../db/connection.js";
import { getTerminalTenantErpId } from "../modules/configuracao/localConfigRepository.js";

export function enqueueSyncEvent(tipoEvento, payload) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  if (!tenantErpId) {
    throw new Error("PDV local ainda não pareado com uma filial do ERP.");
  }
  const result = db
    .prepare(
      `INSERT INTO sync_queue (tenant_erp_id, tipo_evento, payload_json, status)
       VALUES (?, ?, ?, ?)`,
    )
    .run(tenantErpId, tipoEvento, JSON.stringify(payload), syncStatus.PENDENTE);

  return result.lastInsertRowid;
}

export function listPendingSync(limit = 50) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  if (!tenantErpId) {
    return [];
  }
  return db
    .prepare(
      `SELECT sync_id, tenant_erp_id, tipo_evento, payload_json, status, tentativas, ultimo_erro, criado_em, enviado_em
       FROM sync_queue
       WHERE tenant_erp_id = ?
         AND status IN (?, ?)
       ORDER BY criado_em ASC
       LIMIT ?`,
    )
    .all(tenantErpId, syncStatus.PENDENTE, syncStatus.ERRO, limit)
    .map((row) => ({ ...row, payload: JSON.parse(row.payload_json) }));
}

export function markSyncSuccess(syncId) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  if (!tenantErpId) {
    return;
  }
  db.prepare(
    `UPDATE sync_queue
     SET status = ?, enviado_em = CURRENT_TIMESTAMP, ultimo_erro = NULL
     WHERE tenant_erp_id = ?
       AND sync_id = ?`,
  ).run(syncStatus.SUCESSO, tenantErpId, syncId);
}

export function markSyncError(syncId, error) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  if (!tenantErpId) {
    return;
  }
  db.prepare(
    `UPDATE sync_queue
     SET status = ?, tentativas = tentativas + 1, ultimo_erro = ?
     WHERE tenant_erp_id = ?
       AND sync_id = ?`,
  ).run(syncStatus.ERRO, String(error?.message || error), tenantErpId, syncId);
}

export function updateSyncPayload(syncId, payload) {
  const db = getDb();
  const tenantErpId = getTerminalTenantErpId();
  if (!tenantErpId) {
    return;
  }
  db.prepare(
    `UPDATE sync_queue
     SET payload_json = ?
     WHERE tenant_erp_id = ?
       AND sync_id = ?`,
  ).run(JSON.stringify(payload || {}), tenantErpId, syncId);
}
