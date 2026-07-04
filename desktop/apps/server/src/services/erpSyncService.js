import { env } from "../config/env.js";
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
  let processed = 0;

  for (const event of pending) {
    try {
      const response = await fetch(`${env.erpApiUrl.replace(/\/$/, "")}/desktop/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.erpSyncToken}`,
        },
        body: JSON.stringify({
          eventType: event.tipo_evento,
          payload: event.payload,
          localSyncId: event.sync_id,
        }),
      });

      if (!response.ok) {
        throw new Error(`ERP respondeu ${response.status}`);
      }

      markSyncSuccess(event.sync_id);
      processed += 1;
    } catch (error) {
      markSyncError(event.sync_id, error);
    }
  }

  return {
    success: true,
    processed,
    pending: pending.length,
  };
}
