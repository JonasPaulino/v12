import { useEffect, useMemo, useState } from "react";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseCurrency(value) {
  const normalized = String(value ?? "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getFormaFallback(formasPagamento = []) {
  return formasPagamento.find((item) => item.padrao) || formasPagamento[0] || {
    codigo: "dinheiro",
    descricao: "Dinheiro",
  };
}

export function VendaPagamentoModal({
  open,
  total,
  formasPagamento = [],
  clienteResumo,
  supportLoading,
  onClose,
  onReceive,
}) {
  const formaPadrao = useMemo(() => getFormaFallback(formasPagamento), [formasPagamento]);
  const [linhas, setLinhas] = useState([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!open) return;

    setErro("");
    setLinhas([
      {
        id: `${Date.now()}-0`,
        forma: formaPadrao.codigo || "dinheiro",
        valor: formatCurrency(total),
      },
    ]);
  }, [open, formaPadrao.codigo, total]);

  const totalInformado = linhas.reduce((acc, item) => acc + parseCurrency(item.valor), 0);
  const diferenca = Number((Number(total || 0) - totalInformado).toFixed(2));

  function atualizarLinha(id, campo, valor) {
    setLinhas((current) =>
      current.map((linha) => (linha.id === id ? { ...linha, [campo]: valor } : linha)),
    );
  }

  function adicionarLinha() {
    setLinhas((current) => [
      ...current,
      {
        id: `${Date.now()}-${current.length + 1}`,
        forma: formaPadrao.codigo || "dinheiro",
        valor: "0,00",
      },
    ]);
  }

  function removerLinha(id) {
    setLinhas((current) => (current.length > 1 ? current.filter((linha) => linha.id !== id) : current));
  }

  function confirmarRecebimento() {
    const pagamentos = linhas.map((linha) => ({
      forma: linha.forma || formaPadrao.codigo || "dinheiro",
      valor: parseCurrency(linha.valor),
    }));

    if (pagamentos.some((item) => item.valor <= 0)) {
      setErro("Informe um valor maior que zero em cada forma de pagamento.");
      return;
    }

    if (Math.abs(diferenca) > 0.01) {
      setErro("A soma das formas de pagamento precisa fechar exatamente o total da venda.");
      return;
    }

    onReceive(pagamentos);
  }

  if (!open) return null;

  return (
    <div className="payment-modal-backdrop" onClick={onClose}>
      <div className="payment-modal" onClick={(event) => event.stopPropagation()}>
        <div className="payment-modal-header">
          <div>
            <strong>Pagamento da venda</strong>
            <p>{clienteResumo || "Venda sem cliente identificado"} • finalize com uma ou mais formas.</p>
          </div>
          <button type="button" className="payment-modal-close" onClick={onClose} aria-label="Fechar">
            <FiX />
          </button>
        </div>

        <div className="payment-summary">
          <div>
            <small>Total da venda</small>
            <strong>R$ {formatCurrency(total)}</strong>
          </div>
          <div>
            <small>Informado</small>
            <strong>R$ {formatCurrency(totalInformado)}</strong>
          </div>
          <div>
            <small>Diferença</small>
            <strong className={Math.abs(diferenca) <= 0.01 ? "ok" : "warn"}>
              R$ {formatCurrency(diferenca)}
            </strong>
          </div>
        </div>

        <div className="payment-lines">
          {linhas.map((linha, index) => (
            <div className="payment-line" key={linha.id}>
              <label>
                Forma
                <select
                  value={linha.forma}
                  onChange={(event) => atualizarLinha(linha.id, "forma", event.target.value)}
                  disabled={supportLoading}
                >
                  {formasPagamento.map((forma) => (
                    <option key={forma.codigo || forma.financeiro_forma_pagamento_id} value={forma.codigo}>
                      {forma.descricao}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Valor
                <input
                  value={linha.valor}
                  onChange={(event) => atualizarLinha(linha.id, "valor", event.target.value)}
                  inputMode="decimal"
                />
              </label>

              <button
                type="button"
                className="payment-line-remove"
                onClick={() => removerLinha(linha.id)}
                disabled={linhas.length === 1}
                aria-label={`Remover forma ${index + 1}`}
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
        </div>

        {erro ? <p className="payment-error">{erro}</p> : null}

        <div className="payment-actions">
          <button type="button" className="secondary-action" onClick={adicionarLinha} disabled={supportLoading}>
            <FiPlus />
            Adicionar forma
          </button>
          <div className="payment-actions-right">
            <button type="button" className="secondary-action" onClick={onClose} disabled={supportLoading}>
              Cancelar
            </button>
            <button type="button" onClick={confirmarRecebimento} disabled={supportLoading}>
              Receber
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
