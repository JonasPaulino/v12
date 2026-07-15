import { FiRefreshCcw, FiSearch } from "react-icons/fi";

function formatDateTime(value) {
  if (!value) return "-";
  const raw = String(value).trim();
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const hasExplicitTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const date = new Date(hasExplicitTimezone ? normalized : `${normalized}Z`);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatNfceStatus(value) {
  return value ? `NFC-e ${String(value).replace(/_/g, " ")}` : "Orçamento";
}

export function HistoricoVendas({
  search,
  status,
  vendas,
  loading,
  selectedVendaId,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onSelect,
}) {
  return (
    <div className="sales-history-module">
      <div className="sales-history-head">
        <div>
          <strong>Reimpressão e cancelamento</strong>
          <span>Consulte vendas já registradas, visualize o cupom e execute ações administrativas.</span>
        </div>
      </div>

      <div className="sales-history-toolbar">
        <label>
          Buscar venda
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onRefresh();
              }
            }}
            placeholder="Venda, cliente, documento ou valor"
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
            <option value="">Todos</option>
            <option value="concluida">Concluídas</option>
            <option value="cancelada">Canceladas</option>
          </select>
        </label>
        <button type="button" className="sales-history-refresh" onClick={onRefresh}>
          <FiRefreshCcw />
          Atualizar
        </button>
      </div>

      <div className="sales-history-headline">
        <strong>Vendas registradas</strong>
        <span>{loading ? "Carregando histórico..." : `${vendas.length} venda(s) encontrada(s)`}</span>
      </div>

      <div className="sales-history-list">
        {vendas.length ? (
          vendas.map((venda) => (
            <button
              key={venda.venda_id}
              type="button"
              className={`sales-history-row ${selectedVendaId === venda.venda_id ? "is-active" : ""}`}
              onClick={() => onSelect(venda.venda_id)}
            >
              <div className="sales-history-row-top">
                <div className="sales-history-row-title">
                  <strong>Venda #{String(venda.venda_id).padStart(6, "0")}</strong>
                  <small>{formatDateTime(venda.concluida_em || venda.criada_em)}</small>
                </div>
                <div className="sales-history-row-tags">
                  <span className={`sales-status-badge is-${venda.status}`}>{venda.status}</span>
                  <span className="sales-history-nfce-status">{formatNfceStatus(venda.nfce_status)}</span>
                </div>
              </div>
              <div className="sales-history-row-middle">
                <span>{venda.cliente_nome || "Consumidor não identificado"}</span>
                <b className="sales-history-row-total">{formatCurrency(venda.total_liquido)}</b>
              </div>
            </button>
          ))
        ) : (
          <div className="sales-history-empty">
            <FiSearch />
            <span>Nenhuma venda encontrada para os filtros informados.</span>
          </div>
        )}
      </div>
    </div>
  );
}
