import { FiPrinter, FiRefreshCcw, FiSlash } from "react-icons/fi";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function HistoricoVendaDetalhe({
  venda,
  loading,
  onRefresh,
  onReprint,
  onCancel,
}) {
  if (!venda) {
    return (
      <div className="sales-detail-empty">
        <strong>Selecione uma venda</strong>
        <span>Escolha uma venda na lista para ver os itens, pagamentos e ações disponíveis.</span>
      </div>
    );
  }

  return (
    <div className="sales-detail-panel">
      <div className="sales-detail-header">
        <div>
          <strong>Venda #{String(venda.venda_id).padStart(6, "0")}</strong>
          <span>{venda.cliente_nome || "Consumidor não identificado"}</span>
        </div>
        <div className="sales-detail-actions">
          <button type="button" className="secondary-action" onClick={onRefresh}>
            <FiRefreshCcw />
            Atualizar
          </button>
          <button type="button" className="secondary-action" onClick={onReprint}>
            <FiPrinter />
            Reimprimir
          </button>
          <button
            type="button"
            className="danger-action"
            disabled={venda.status === "cancelada" || venda.nfce_status === "autorizada" || loading}
            onClick={onCancel}
          >
            <FiSlash />
            Cancelar venda
          </button>
        </div>
      </div>

      <div className="sales-detail-summary">
        <div>
          <span>Status</span>
          <strong>{venda.status}</strong>
        </div>
        <div>
          <span>NFC-e</span>
          <strong>{venda.nfce_status || "pendente"}</strong>
        </div>
        <div>
          <span>Data</span>
          <strong>{venda.concluida_em || venda.criada_em || "-"}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>R$ {formatCurrency(venda.total_liquido)}</strong>
        </div>
      </div>

      {venda.cancelada_em ? (
        <div className="sales-detail-warning">
          <strong>Venda cancelada</strong>
          <span>
            {venda.cancelamento_motivo || "Cancelamento manual no PDV."}
            {" "}
            {venda.cancelada_em ? `(${venda.cancelada_em})` : ""}
          </span>
        </div>
      ) : null}

      <div className="sales-detail-section">
        <strong>Itens da venda</strong>
        <div className="sales-detail-table">
          <div className="sales-detail-row head">
            <span>Cód.</span>
            <span>Descrição</span>
            <span>Qtd</span>
            <span>Un.</span>
            <span>Unit.</span>
            <span>Total</span>
          </div>
          {venda.itens?.map((item) => (
            <div className="sales-detail-row" key={item.venda_item_id}>
              <span>{item.codigo_produto || item.produto_id}</span>
              <strong>{item.descricao}</strong>
              <span>{Number(item.quantidade || 0)}</span>
              <span>{item.unidade || "UN"}</span>
              <span>{formatCurrency(item.valor_unitario)}</span>
              <span>{formatCurrency(item.valor_total)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="sales-detail-section">
        <strong>Pagamentos</strong>
        <div className="sales-payment-list">
          {venda.pagamentos?.map((pagamento) => (
            <div className="sales-payment-row" key={pagamento.pagamento_id}>
              <span>{pagamento.forma}</span>
              <strong>R$ {formatCurrency(pagamento.valor)}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
