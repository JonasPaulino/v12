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
  const printerConfig = await api.obterConfiguracaoImpressora().catch(() => null);

  if (pdfPath) {
    if (!window.v12Desktop?.printPdfFile) {
      throw new Error("A impressão do DANFCe funciona somente no app Electron.");
    }

    await window.v12Desktop.printPdfFile(pdfPath, printerConfig);
    return;
  }

  throw new Error("A NFC-e foi autorizada, mas o PDF do DANFCe não foi gerado.");
}

export async function sendDanfceHtmlToPrint(payload) {
  const printerConfig = await api.obterConfiguracaoImpressora().catch(() => null);

  if (payload?.pdfPath) {
    try {
      await sendDanfceToPrint(payload.pdfPath);
      return;
    } catch (error) {
      if (!payload?.fiscal) {
        throw error;
      }
    }
  }

  if (!payload?.fiscal) {
    throw new Error("Dados fiscais do DANFCe não informados para impressão.");
  }

  if (window.v12Desktop?.printDanfce) {
    await window.v12Desktop.printDanfce(payload, printerConfig);
    return;
  }

  throw new Error("A impressão do DANFCe exige reiniciar o app Electron para carregar o módulo fiscal.");
}
