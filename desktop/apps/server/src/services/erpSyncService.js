import { env } from "../config/env.js";
import { syncEventTypes } from "@v12-desktop/shared";
import { getTerminalConfig } from "../modules/configuracao/localConfigRepository.js";
import { getVendaDetalhe } from "../modules/vendas/vendaRepository.js";
import { listPendingSync, markSyncError, markSyncSuccess, updateSyncPayload } from "./syncQueueService.js";

function vendaPayloadIncompleto(payload) {
  return !Array.isArray(payload?.itens) || !Array.isArray(payload?.pagamentos);
}

function hydrateLegacySyncPayload(event) {
  if (
    event?.tipo_evento !== syncEventTypes.VENDA_CRIADA &&
    event?.tipo_evento !== syncEventTypes.VENDA_CANCELADA
  ) {
    return event;
  }

  if (!vendaPayloadIncompleto(event.payload)) {
    return event;
  }

  const vendaId = Number(event.payload?.venda_id);
  if (!Number.isInteger(vendaId) || vendaId <= 0) {
    return event;
  }

  const vendaCompleta = getVendaDetalhe(vendaId);
  const hydratedPayload = { ...vendaCompleta };
  updateSyncPayload(event.sync_id, hydratedPayload);

  console.info("[desktop-sync] Pendencia antiga reidratada com dados completos", {
    syncId: event.sync_id,
    tipoEvento: event.tipo_evento,
    vendaId,
    itens: Array.isArray(hydratedPayload.itens) ? hydratedPayload.itens.length : 0,
    pagamentos: Array.isArray(hydratedPayload.pagamentos) ? hydratedPayload.pagamentos.length : 0,
  });

  return {
    ...event,
    payload: hydratedPayload,
  };
}

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
  const errors = [];

  for (const event of pending) {
    try {
      const normalizedEvent = hydrateLegacySyncPayload(event);

      console.info("[desktop-sync] Processando pendencia local", {
        syncId: normalizedEvent.sync_id,
        tipoEvento: normalizedEvent.tipo_evento,
        tentativas: normalizedEvent.tentativas,
      });

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
          eventType: normalizedEvent.tipo_evento,
          payload: normalizedEvent.payload,
          localSyncId: normalizedEvent.sync_id,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || `ERP respondeu ${response.status}`);
      }

      markSyncSuccess(normalizedEvent.sync_id);
      console.info("[desktop-sync] Pendencia sincronizada", {
        syncId: normalizedEvent.sync_id,
        tipoEvento: normalizedEvent.tipo_evento,
      });
      processed += 1;
    } catch (error) {
      markSyncError(event.sync_id, error);
      const errorInfo = {
        syncId: event.sync_id,
        tipoEvento: event.tipo_evento,
        message: String(error?.message || error),
      };
      console.error("[desktop-sync] Falha ao enviar pendencia local", errorInfo);
      errors.push(errorInfo);
      failed += 1;
    }
  }

  return {
    success: failed === 0,
    processed,
    failed,
    pending: pending.length,
    errors,
  };
}
