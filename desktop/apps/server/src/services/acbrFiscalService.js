import { nfceStatus } from "@v12-desktop/shared";
import { env } from "../config/env.js";
import { getFiscalConfig } from "../modules/configuracao/localFiscalConfigRepository.js";

function validarProntidaoNfce() {
  const fiscal = getFiscalConfig();
  if (!fiscal) {
    return {
      ready: false,
      reason: "Configuração fiscal do NFC-e ainda não foi sincronizada para este terminal.",
      fiscal,
    };
  }

  if (!fiscal.nfce_habilitada) {
    return {
      ready: false,
      reason: "A filial não está habilitada para emissão de NFC-e.",
      fiscal,
    };
  }

  if (!fiscal.certificado_conteudo_base64 || !fiscal.certificado_senha) {
    return {
      ready: false,
      reason: "Certificado A1 da filial não foi sincronizado para o PDV.",
      fiscal,
    };
  }

  if (!fiscal.nfce_id_token_csc || !fiscal.nfce_csc) {
    return {
      ready: false,
      reason: "CSC e ID token do NFC-e não foram configurados para a filial.",
      fiscal,
    };
  }

  return {
    ready: true,
    reason: null,
    fiscal,
  };
}

export async function emitirNfce(venda) {
  const readiness = validarProntidaoNfce();

  return {
    success: false,
    status: nfceStatus.PENDENTE,
    message: readiness.ready
      ? `Emissão NFC-e ainda não integrada ao adaptador ${String(env.acbrMode || "monitor").toUpperCase()}.`
      : readiness.reason,
    vendaId: venda.venda_id,
  };
}

export async function consultarStatusFiscal() {
  const readiness = validarProntidaoNfce();

  return {
    success: true,
    mode: env.acbrMode || "monitor",
    ready: readiness.ready,
    message: readiness.ready
      ? `Terminal preparado para NFC-e. Adaptador ${String(env.acbrMode || "monitor").toUpperCase()} ainda pendente de integração final.`
      : readiness.reason,
  };
}
