import { FiRefreshCcw, FiSearch } from "react-icons/fi";

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
                <strong>Venda #{String(venda.venda_id).padStart(6, "0")}</strong>
                <span className={`sales-status-badge is-${venda.status}`}>{venda.status}</span>
              </div>
              <div className="sales-history-row-middle">
                <span>{venda.cliente_nome || "Consumidor não identificado"}</span>
                <b>
                  {Number(venda.total_liquido || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </b>
              </div>
              <div className="sales-history-row-bottom">
                <small>{venda.criada_em || venda.concluida_em || "-"}</small>
                <small>NFC-e: {venda.nfce_status || "pendente"}</small>
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
