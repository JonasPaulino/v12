import { api } from "../../api.js";

export async function sendBudgetToPrint(payload) {
  const printerConfig = await api.obterConfiguracaoImpressora().catch(() => null);

  if (window.v12Desktop?.printBudget) {
    await window.v12Desktop.printBudget(payload, printerConfig);
    return;
  }

  const popup = window.open("", "_blank", "width=900,height=900");
  if (!popup) {
    throw new Error("Não foi possível abrir a janela de impressão.");
  }

  popup.document.write(`<pre>${JSON.stringify(payload, null, 2)}</pre>`);
  popup.document.close();
  popup.focus();
  popup.onafterprint = () => popup.close();
  popup.print();
}

export async function sendDanfceToPrint(pdfPath) {
  if (!pdfPath) {
    throw new Error("A NFC-e foi autorizada, mas o PDF do DANFCe não foi gerado.");
  }

  const printerConfig = await api.obterConfiguracaoImpressora().catch(() => null);

  if (!window.v12Desktop?.printPdfFile) {
    throw new Error("A impressão do DANFCe funciona somente no app Electron.");
  }

  await window.v12Desktop.printPdfFile(pdfPath, printerConfig);
}
