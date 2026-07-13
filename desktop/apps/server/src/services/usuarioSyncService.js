import { env } from "../config/env.js";
import { getTerminalConfig } from "../modules/configuracao/localConfigRepository.js";
import { sincronizarOperadoresErp } from "../modules/operadores/operadorRepository.js";

export async function syncUsuariosFromErp() {
  const config = getTerminalConfig();
  if (!config?.tenant_erp_id) {
    return {
      success: false,
      message: "PDV local ainda nao pareado com uma filial do ERP.",
      imported: 0,
    };
  }

  if (!env.erpApiUrl || !env.erpSyncToken) {
    return {
      success: false,
      message: "Sincronização de usuários não configurada.",
      imported: 0,
    };
  }

  const baseUrl = env.erpApiUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    tenant_id: String(config.tenant_erp_id),
  });

  const response = await fetch(`${baseUrl}/desktop/sync/usuarios?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${env.erpSyncToken}`,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    console.error("[desktop-sync] Falha ao sincronizar operadores", {
      tenantId: config.tenant_erp_id,
      status: response.status,
      response: result,
    });
    throw new Error(result.message || `ERP respondeu ${response.status}`);
  }

  const imported = sincronizarOperadoresErp(result.data || []);

  return {
    success: true,
    imported,
    syncedAt: result.syncedAt,
  };
}
