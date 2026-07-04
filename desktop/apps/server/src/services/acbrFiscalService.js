import { nfceStatus } from "@v12-desktop/shared";

export async function emitirNfce(venda) {
  return {
    success: false,
    status: nfceStatus.PENDENTE,
    message: "Emissao NFC-e ainda nao integrada ao ACBr.",
    vendaId: venda.venda_id,
  };
}

export async function consultarStatusFiscal() {
  return {
    success: true,
    mode: "stub",
    message: "Adaptador fiscal aguardando configuracao ACBrMonitor/ACBrLib.",
  };
}
