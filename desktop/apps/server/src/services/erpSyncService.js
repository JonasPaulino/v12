import { env } from "../config/env.js";
import { getTerminalConfig } from "../modules/configuracao/localConfigRepository.js";
import { listPendingSync, markSyncError, markSyncSuccess } from "./syncQueueService.js";

export async function processSyncQueue() {
  if (!env.erpApiUrl || !env.erpSyncToken) {
    return {
      success: false,
      message: "Sincronizacao nao configurada.",
      processed: 0,
    };
  }

  const pending = listPendingSync(25);
  const config = getTerminalConfig();

  if (!config?.tenant_erp_id) {
    return {
      success: false,
      message: "PDV local ainda nao pareado com uma filial do ERP.",
      processed: 0,
      failed: pending.length,
    };
  }

  let processed = 0;
  let failed = 0;

  for (const event of pending) {
    try {
      const response = await fetch(`${env.erpApiUrl.replace(/\/$/, "")}/desktop/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.erpSyncToken}`,
        },
        body: JSON.stringify({
          tenantId: Number(config.tenant_erp_id),
          terminalCodigo: config.terminal_codigo || null,
          terminalNome: config.terminal_nome || null,
          eventType: event.tipo_evento,
          payload: event.payload,
          localSyncId: event.sync_id,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || `ERP respondeu ${response.status}`);
      }

      markSyncSuccess(event.sync_id);
      processed += 1;
    } catch (error) {
      markSyncError(event.sync_id, error);
      failed += 1;
    }
  }

  return {
    success: failed === 0,
    processed,
    failed,
    pending: pending.length,
  };
}
