import { useContext, useEffect, useMemo, useState } from "react";
import { FiRefreshCcw, FiSearch, FiShoppingCart, FiXCircle } from "react-icons/fi";
import { api } from "../../api.js";
import { AppContext } from "../../context/AppContext.jsx";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value) {
  if (!value) return "Sem data";
  const date = new Date(String(value).includes("T") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PedidosPendentes({ onImportPedido, onBackToSale }) {
  const [search, setSearch] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();

  const selectedTotal = useMemo(() => {
    return (selectedPedido?.itens || []).reduce((acc, item) => acc + Number(item.valor_total || 0), 0);
  }, [selectedPedido]);

  async function carregarPedidos({ keepSelection = true } = {}) {
    try {
      setLoading(true);
      const data = await api.pedidos({ status: "enviado", search, limit: 80 });
      setPedidos(data);

      if (!keepSelection) {
        setSelectedPedido(null);
        return;
      }

      if (selectedPedido?.pedido_id) {
        const stillExists = data.some((pedido) => Number(pedido.pedido_id) === Number(selectedPedido.pedido_id));
        if (!stillExists) setSelectedPedido(null);
      }
    } catch (error) {
      showAlert({
        title: "Falha ao carregar pedidos",
        text: error.message,
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function carregarDetalhe(pedidoId) {
    try {
      showLoading("Carregando pedido...");
      const data = await api.pedidoDetalhe(pedidoId);
      setSelectedPedido(data);
    } catch (error) {
      showAlert({
        title: "Falha ao carregar pedido",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  async function importarPedido() {
    if (!selectedPedido) return;

    try {
      showLoading("Importando pedido...");
      const ok = await onImportPedido(selectedPedido);
      if (!ok) return;

      await api.importarPedido(selectedPedido.pedido_id);
      await carregarPedidos({ keepSelection: false });
      onBackToSale();
    } catch (error) {
      showAlert({
        title: "Falha ao importar pedido",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  async function cancelarPedido(pedido) {
    const confirmed = await askYesNoQuestion(
      "Cancelar pedido",
      `Deseja cancelar o pedido ${pedido.referencia || `#${pedido.pedido_id}`}?`,
    );

    if (!confirmed) return;

    try {
      showLoading("Cancelando pedido...");
      await api.cancelarPedido(pedido.pedido_id);
      await carregarPedidos({ keepSelection: false });
    } catch (error) {
      showAlert({
        title: "Falha ao cancelar pedido",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void carregarPedidos();
    }, 250);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="orders-desk">
      <div className="orders-list-panel">
        <div className="orders-toolbar">
          <label>
            Buscar pedido
            <div className="orders-search">
              <FiSearch />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Referência, cliente ou operador"
              />
            </div>
          </label>
          <button type="button" className="ghost-action" onClick={() => carregarPedidos()}>
            <FiRefreshCcw /> Atualizar
          </button>
        </div>

        <div className="orders-list-header">
          <strong>Pedidos pendentes</strong>
          <span>{loading ? "Carregando..." : `${pedidos.length} pedido(s)`}</span>
        </div>

        <div className="orders-list">
          {pedidos.length ? (
            pedidos.map((pedido) => (
              <button
                key={pedido.pedido_id}
                type="button"
                className={`order-row ${Number(selectedPedido?.pedido_id) === Number(pedido.pedido_id) ? "active" : ""}`}
                onClick={() => carregarDetalhe(pedido.pedido_id)}
              >
                <span>
                  <strong>{pedido.referencia}</strong>
                  <small>{pedido.cliente_nome || "Cliente não informado"}</small>
                </span>
                <span>
                  <strong>{formatCurrency(pedido.total_liquido)}</strong>
                  <small>{pedido.operador_nome || "Sem operador"}</small>
                </span>
              </button>
            ))
          ) : (
            <div className="orders-empty">
              Nenhum pedido pendente encontrado.
            </div>
          )}
        </div>
      </div>

      <div className="orders-detail-panel">
        {selectedPedido ? (
          <>
            <div className="orders-detail-header">
              <div>
                <strong>{selectedPedido.referencia}</strong>
                <span>{formatDate(selectedPedido.enviado_em || selectedPedido.criado_em)}</span>
              </div>
              <span className="order-status-pill">Pendente</span>
            </div>

            <div className="orders-detail-meta">
              <span>Operador: <strong>{selectedPedido.operador_nome || "Não informado"}</strong></span>
              <span>Cliente: <strong>{selectedPedido.cliente_nome || "Não informado"}</strong></span>
            </div>

            {selectedPedido.observacao ? (
              <div className="orders-note">{selectedPedido.observacao}</div>
            ) : null}

            <div className="orders-items">
              {(selectedPedido.itens || []).map((item) => (
                <div className="orders-item" key={item.pedido_item_id}>
                  <span>
                    <strong>{item.descricao}</strong>
                    <small>
                      {Number(item.quantidade || 0)} {item.unidade || "UN"} x {formatCurrency(item.valor_unitario)}
                    </small>
                    {item.observacao ? <em>{item.observacao}</em> : null}
                  </span>
                  <strong>{formatCurrency(item.valor_total)}</strong>
                </div>
              ))}
            </div>

            <div className="orders-detail-footer">
              <div>
                <span>Total do pedido</span>
                <strong>{formatCurrency(selectedTotal)}</strong>
              </div>
              <button type="button" className="secondary-action" onClick={() => cancelarPedido(selectedPedido)}>
                <FiXCircle /> Cancelar
              </button>
              <button type="button" className="primary-action" onClick={importarPedido}>
                <FiShoppingCart /> Importar para venda
              </button>
            </div>
          </>
        ) : (
          <div className="orders-detail-empty">
            Selecione um pedido para conferir os itens e importar para a venda.
          </div>
        )}
      </div>
    </div>
  );
}
