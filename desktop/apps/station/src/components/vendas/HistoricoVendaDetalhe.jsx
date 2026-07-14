import { FiPrinter, FiRefreshCcw, FiRotateCw, FiSlash } from "react-icons/fi";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value) {
  if (!value) return "-";
  const normalized = String(value).replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDocument(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return value || "-";
}

function formatQuantity(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatNfceStatus(value) {
  return value ? `NFC-e ${String(value).replace(/_/g, " ")}` : "NFC-e não emitida";
}

export function HistoricoVendaDetalhe({
  venda,
  loading,
  config,
  onRefresh,
  onReprint,
  onCancel,
  onTransmitContingencia,
}) {
  if (!venda) {
    return (
      <div className="sales-detail-empty">
        <strong>Selecione uma venda</strong>
        <span>Escolha uma venda na lista para visualizar o cupom e as ações disponíveis.</span>
      </div>
    );
  }

  const clienteNome = venda.cliente_nome || "Consumidor não identificado";
  const clienteDocumento = venda.cliente_documento ? formatDocument(venda.cliente_documento) : "Não informado";
  const clienteEmail = venda.cliente_email || "Não informado";
  const numeroVenda = String(venda.venda_id).padStart(6, "0");
  const statusNfce = venda.nfce_status || "";
  const isCancelada = venda.status === "cancelada";
  const isContingencia = statusNfce === "contingencia";

  return (
    <div className="sales-detail-panel">
      <div className="sales-detail-header-area">
        <div className="sales-detail-topbar">
          <div className="sales-detail-topbar-main">
            <strong>Venda #{numeroVenda}</strong>
            <span>{clienteNome}</span>
          </div>
          <div className="sales-detail-badge-row">
            <span className={`sales-status-badge is-${venda.status}`}>{venda.status}</span>
            <span className={`sales-status-badge ${statusNfce ? `is-${statusNfce.replace(/_/g, "-")}` : ""}`}>
              {formatNfceStatus(statusNfce)}
            </span>
          </div>
        </div>
      </div>

      <div className="sales-detail-body-area">
        {isContingencia ? (
          <div className="sales-detail-warning">
            <strong>NFC-e emitida em contingência offline</strong>
            <span>
              Emissão em: {formatDateTime(venda.nfce_contingencia_em || venda.emitida_em || venda.concluida_em)}
            </span>
            <span>
              {venda.nfce_contingencia_justificativa ||
                "A NFC-e foi impressa em contingência e ainda precisa ser transmitida para a SEFAZ."}
            </span>
          </div>
        ) : null}

        <div className="sales-receipt-stage">
          <article className="sales-receipt-preview">
            <header className="sales-receipt-header">
              <strong>{config?.tenant_nome || "V12 PDV"}</strong>
              <span>{formatDocument(config?.tenant_documento)}</span>
              <span>{config?.tenant_endereco || "Endereço da filial não informado"}</span>
              <span>
                IE: {config?.tenant_inscricao_estadual || "Não informada"}
                {"  "} IM: {config?.tenant_inscricao_municipal || "Não informada"}
              </span>
            </header>

            <div className="sales-receipt-divider" />

            <section className="sales-receipt-section">
              <div className="sales-receipt-line is-centered">
                <strong>COMPROVANTE DE VENDA</strong>
              </div>
              <div className="sales-receipt-line">
                <span>Venda</span>
                <strong>#{numeroVenda}</strong>
              </div>
              <div className="sales-receipt-line">
                <span>Data</span>
                <strong>{formatDateTime(venda.concluida_em || venda.criada_em)}</strong>
              </div>
              <div className="sales-receipt-line">
                <span>Operador</span>
                <strong>{venda.operador_nome || "Não informado"}</strong>
              </div>
              <div className="sales-receipt-line">
                <span>Terminal</span>
                <strong>{venda.terminal_codigo || config?.terminal_codigo || "PDV"}</strong>
              </div>
            </section>

            <div className="sales-receipt-divider" />

            <section className="sales-receipt-section">
              <div className="sales-receipt-caption">CLIENTE</div>
              <div className="sales-receipt-block">
                <strong>{clienteNome}</strong>
                <span>{clienteDocumento}</span>
                <span>{clienteEmail}</span>
              </div>
            </section>

            <div className="sales-receipt-divider" />

            <section className="sales-receipt-section">
              <div className="sales-receipt-caption">ITENS</div>
              <div className="sales-receipt-items">
                {venda.itens?.map((item, index) => (
                  <div key={item.venda_item_id || `${item.produto_id}-${index}`} className="sales-receipt-item">
                    <div className="sales-receipt-item-head">
                      <span>{String(item.codigo_produto || "").toUpperCase()}</span>
                      <strong>{formatCurrency(item.valor_total)}</strong>
                    </div>
                    <strong className="sales-receipt-item-description">
                      {String(item.descricao || "").toUpperCase()}
                    </strong>
                    <div className="sales-receipt-item-meta">
                      <span>
                        {formatQuantity(item.quantidade)} {String(item.unidade || "UN").toUpperCase()}
                      </span>
                      <span>x</span>
                      <span>{formatCurrency(item.valor_unitario)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="sales-receipt-divider" />

            <section className="sales-receipt-section">
              <div className="sales-receipt-caption">PAGAMENTOS</div>
              <div className="sales-receipt-list">
                {venda.pagamentos?.length ? (
                  venda.pagamentos.map((pagamento) => (
                    <div key={pagamento.pagamento_id} className="sales-receipt-line">
                      <span>{String(pagamento.forma || "outros").replace(/_/g, " ").toUpperCase()}</span>
                      <strong>{formatCurrency(pagamento.valor)}</strong>
                    </div>
                  ))
                ) : (
                  <div className="sales-receipt-line">
                    <span>SEM PAGAMENTOS REGISTRADOS</span>
                    <strong>{formatCurrency(0)}</strong>
                  </div>
                )}
              </div>
            </section>

            <div className="sales-receipt-divider" />

            <section className="sales-receipt-section">
              <div className="sales-receipt-line">
                <span>Subtotal</span>
                <strong>{formatCurrency(venda.total_produtos)}</strong>
              </div>
              <div className="sales-receipt-line">
                <span>Desconto</span>
                <strong>{formatCurrency(venda.total_desconto)}</strong>
              </div>
              <div className="sales-receipt-line is-total">
                <span>Total líquido</span>
                <strong>{formatCurrency(venda.total_liquido)}</strong>
              </div>
            </section>

            <div className="sales-receipt-divider" />

            <footer className="sales-receipt-footer">
              <strong>{isCancelada ? "VENDA CANCELADA" : "DOCUMENTO INTERNO DE CONSULTA"}</strong>
              <span>Reimpressão e cancelamento de vendas do PDV</span>
            </footer>
          </article>
        </div>
      </div>

      <div className="sales-detail-footer-area">
        <div className="sales-detail-footer-actions">
          <button type="button" className="secondary-action" onClick={onRefresh} disabled={loading}>
            <FiRefreshCcw />
            Atualizar
          </button>
          {isContingencia ? (
            <button
              type="button"
              className="secondary-action"
              onClick={onTransmitContingencia}
              disabled={loading}
            >
              <FiRotateCw />
              Transmitir contingência
            </button>
          ) : null}
          <button type="button" className="secondary-action" onClick={onReprint} disabled={loading}>
            <FiPrinter />
            Reimprimir
          </button>
          <button
            type="button"
            className="danger-action"
            onClick={onCancel}
            disabled={loading || isCancelada}
          >
            <FiSlash />
            Cancelar venda
          </button>
        </div>
      </div>
    </div>
  );
}
