import { useEffect } from "react";

export function usePdvShortcuts({
  activeModule,
  caixa,
  caixaPendenteDiaAnterior,
  cartLength,
  clienteModalAberto,
  pagamentoModalAberto,
  vendaProntaParaConclusao,
  openModule,
  abrirReimpressao,
  abrirModalCliente,
  focarConsultaProduto,
  abrirPagamentoVenda,
  imprimirOrcamento,
}) {
  useEffect(() => {
    const handleKeyboardShortcut = (event) => {
      const targetTag = String(event.target?.tagName || "").toUpperCase();
      const key = String(event.key || "").toUpperCase();
      const isFunctionKey = /^F\d+$/.test(key);
      const isMetaShortcut = event.ctrlKey || event.metaKey;

      if (
        (["INPUT", "TEXTAREA", "SELECT"].includes(targetTag) || event.target?.isContentEditable) &&
        !isFunctionKey &&
        !isMetaShortcut
      ) {
        return;
      }

      if (isMetaShortcut && String(event.key || "").toLowerCase() === "f") {
        event.preventDefault();
        abrirPagamentoVenda();
        return;
      }

      if (event.shiftKey && String(event.key || "").toLowerCase() === "p") {
        if (!caixa || caixaPendenteDiaAnterior || activeModule !== "venda" || !cartLength) return;
        if (clienteModalAberto || pagamentoModalAberto) return;

        event.preventDefault();
        imprimirOrcamento();
        return;
      }

      if (key === "F3") {
        event.preventDefault();
        openModule("venda");
        return;
      }

      if (key === "F4") {
        if (!caixa || caixaPendenteDiaAnterior) return;
        if (clienteModalAberto || pagamentoModalAberto || activeModule !== "venda") return;

        event.preventDefault();
        abrirModalCliente();
        return;
      }

      if (key === "F5") {
        event.preventDefault();
        openModule("fechamento");
        return;
      }

      if (key === "F6") {
        event.preventDefault();
        openModule("sangria");
        return;
      }

      if (key === "F7") {
        event.preventDefault();
        openModule("suprimento");
        return;
      }

      if (key === "F8") {
        event.preventDefault();
        if (typeof abrirReimpressao === "function") {
          abrirReimpressao();
          return;
        }

        openModule("historico_vendas");
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [
    activeModule,
    abrirReimpressao,
    abrirModalCliente,
    abrirPagamentoVenda,
    caixa,
    caixaPendenteDiaAnterior,
    cartLength,
    clienteModalAberto,
    focarConsultaProduto,
    imprimirOrcamento,
    openModule,
    pagamentoModalAberto,
    vendaProntaParaConclusao,
  ]);
}
