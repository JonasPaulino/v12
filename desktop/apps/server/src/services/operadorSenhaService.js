import { env } from "../config/env.js";
import { getTerminalConfig } from "../modules/configuracao/localConfigRepository.js";
import { atualizarSenhaOperadorLocal } from "../modules/operadores/operadorRepository.js";

export async function trocarSenhaPrimeiroAcesso({ operador, novaSenha }) {
  if (!operador?.erp_usuario_id || !operador?.operador_id) {
    throw new Error("Operador local não possui vínculo com usuário do ERP.");
  }

  if (!novaSenha || String(novaSenha).trim().length < 6) {
    throw new Error("A nova senha precisa ter pelo menos 6 caracteres.");
  }

  const config = getTerminalConfig();
  if (!config?.tenant_erp_id) {
    throw new Error("PDV local ainda nao pareado com uma filial do ERP.");
  }

  if (!env.erpApiUrl || !env.erpSyncToken) {
    throw new Error("Sincronização com ERP não configurada.");
  }

  const baseUrl = env.erpApiUrl.replace(/\/$/, "");
  const response = await fetch(
    `${baseUrl}/desktop/sync/usuarios/${operador.erp_usuario_id}/senha`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.erpSyncToken}`,
      },
      body: JSON.stringify({
        tenant_id: config.tenant_erp_id,
        senha: String(novaSenha).trim(),
      }),
    },
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok || result.success === false) {
    throw new Error(result.message || `ERP respondeu ${response.status}`);
  }

  if (!result.data?.senha_hash) {
    throw new Error("ERP não retornou a senha atualizada do operador.");
  }

  return atualizarSenhaOperadorLocal({
    operadorId: operador.operador_id,
    senhaHash: result.data?.senha_hash,
  });
}
