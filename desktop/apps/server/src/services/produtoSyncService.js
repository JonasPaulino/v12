import { env } from "../config/env.js";
import { upsertProdutos } from "../modules/produtos/produtoRepository.js";
import { getConfigValue, setConfigValue } from "./configLocalService.js";

const LAST_PRODUCT_SYNC_KEY = "produtos.last_sync_at";

export async function syncProdutosFromErp({ full = false } = {}) {
  if (!env.erpApiUrl || !env.erpSyncToken || !env.lojaId) {
    return {
      success: false,
      message: "Sincronização de produtos não configurada.",
      imported: 0,
    };
  }

  const baseUrl = env.erpApiUrl.replace(/\/$/, "");
  const lastSync = full ? null : getConfigValue(LAST_PRODUCT_SYNC_KEY);
  const params = new URLSearchParams({
    tenant_id: String(env.lojaId),
    limit: "5000",
  });

  if (lastSync) {
    params.set("since", lastSync);
  }

  const response = await fetch(`${baseUrl}/desktop/sync/produtos?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${env.erpSyncToken}`,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || `ERP respondeu ${response.status}`);
  }

  const imported = upsertProdutos(result.data || []);
  setConfigValue(LAST_PRODUCT_SYNC_KEY, result.syncedAt || new Date().toISOString());

  return {
    success: true,
    imported,
    full,
    lastSync,
    syncedAt: result.syncedAt,
  };
}
