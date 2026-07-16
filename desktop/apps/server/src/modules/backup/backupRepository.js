import { getDb } from "../../db/connection.js";

export function createBackupExecution({ tenantErpId, tipo, status = "processando" }) {
  const result = getDb()
    .prepare(
      `INSERT INTO backup_execucao (tenant_erp_id, tipo, status)
       VALUES (?, ?, ?)`,
    )
    .run(tenantErpId, tipo, status);

  return Number(result.lastInsertRowid);
}

export function updateBackupExecution(backupId, payload = {}) {
  getDb()
    .prepare(
      `UPDATE backup_execucao
       SET status = COALESCE(?, status),
           arquivo_nome = COALESCE(?, arquivo_nome),
           arquivo_local = COALESCE(?, arquivo_local),
           arquivo_sha256 = COALESCE(?, arquivo_sha256),
           tamanho_bytes = COALESCE(?, tamanho_bytes),
           retaguarda_backup_id = COALESCE(?, retaguarda_backup_id),
           retaguarda_status = COALESCE(?, retaguarda_status),
           retaguarda_link = COALESCE(?, retaguarda_link),
           manifest_json = COALESCE(?, manifest_json),
           concluido_em = COALESCE(?, concluido_em),
           erro = ?
       WHERE backup_id = ?`,
    )
    .run(
      payload.status || null,
      payload.arquivo_nome || null,
      payload.arquivo_local || null,
      payload.arquivo_sha256 || null,
      Number.isFinite(Number(payload.tamanho_bytes)) ? Number(payload.tamanho_bytes) : null,
      payload.retaguarda_backup_id || null,
      payload.retaguarda_status || null,
      payload.retaguarda_link || null,
      payload.manifest_json ? JSON.stringify(payload.manifest_json) : null,
      payload.concluido_em || null,
      payload.erro || null,
      backupId,
    );
}

export function hasBackupItemHash({ tenantErpId, origemTipo, origemChave, sha256 }) {
  const row = getDb()
    .prepare(
      `SELECT backup_item_id
       FROM backup_item
       WHERE tenant_erp_id = ?
         AND origem_tipo = ?
         AND origem_chave = ?
         AND sha256 = ?
         AND enviado_em IS NOT NULL
       LIMIT 1`,
    )
    .get(tenantErpId, origemTipo, origemChave, sha256);

  return !!row;
}

export function insertBackupItems({ tenantErpId, backupId, items = [], enviadoEm }) {
  if (!items.length) return 0;

  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO backup_item (
       tenant_erp_id,
       backup_id,
       origem_tipo,
       origem_chave,
       source_path,
       source_mtime_ms,
       source_size,
       sha256,
       enviado_em
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const tx = db.transaction(() => {
    for (const item of items) {
      insert.run(
        tenantErpId,
        backupId,
        item.origemTipo,
        item.origemChave,
        item.sourcePath || null,
        item.sourceMtimeMs || null,
        Number(item.sourceSize || 0),
        item.sha256,
        enviadoEm,
      );
    }
  });

  tx();
  return items.length;
}

export function getLastBackupExecutions(limit = 20) {
  return getDb()
    .prepare(
      `SELECT
         backup_id,
         tenant_erp_id,
         tipo,
         status,
         arquivo_nome,
         arquivo_sha256,
         tamanho_bytes,
         retaguarda_backup_id,
         retaguarda_status,
         retaguarda_link,
         iniciado_em,
         concluido_em,
         erro
       FROM backup_execucao
       ORDER BY iniciado_em DESC
       LIMIT ?`,
    )
    .all(Number(limit || 20));
}
