import { nfceStatus, syncEventTypes } from "@v12-desktop/shared";
import { enqueueSyncEvent } from "../../services/syncQueueService.js";

export function registrarVendaCriada(venda) {
  enqueueSyncEvent(syncEventTypes.VENDA_CRIADA, venda);
}

export function registrarVendaCancelada(vendaCancelada) {
  enqueueSyncEvent(syncEventTypes.VENDA_CANCELADA, vendaCancelada);
  enqueueSyncEvent(syncEventTypes.NFCE_CANCELADA, {
    venda_id: vendaCancelada.venda_id,
    motivo: vendaCancelada.cancelamento_motivo,
    status: vendaCancelada.nfce_status,
  });
}

export function registrarResultadoFiscal(fiscal) {
  if (fiscal?.success) {
    enqueueSyncEvent(syncEventTypes.NFCE_AUTORIZADA, fiscal);
    return;
  }

  if (fiscal?.status === nfceStatus.CONTINGENCIA) {
    enqueueSyncEvent(syncEventTypes.NFCE_CONTINGENCIA, fiscal);
    return;
  }

  if (fiscal?.status === nfceStatus.REJEITADA) {
    enqueueSyncEvent(syncEventTypes.NFCE_REJEITADA, fiscal);
  }
}
