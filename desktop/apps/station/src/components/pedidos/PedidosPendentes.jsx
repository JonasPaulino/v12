import { useContext, useEffect, useState } from "react";
import { FiDownload, FiRefreshCcw, FiSearch, FiTrash2 } from "react-icons/fi";
import { api } from "../../api.js";
import { AppContext } from "../../context/AppContext.jsx";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function PedidosPendentes({ onImportPedido, onBackToSale }) {
  const [search, setSearch] = useState("");
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();

  async function carregarPedidos() {
    try {
      setLoading(true);
      const data = await api.pedidos({ status: "enviado", search, limit: 80 });
      setPedidos(Array.isArray(data) ? data : []);
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

  async function importarPedido(pedidoId) {
    try {
      showLoading("Importando pedido...");
      const detalhe = await api.pedidoDetalhe(pedidoId);
      const ok = await onImportPedido(detalhe);
      if (!ok) return;

      await api.importarPedido(pedidoId);
      await carregarPedidos();
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
      `Deseja cancelar o pedido ${pedido.referencia_formatada || pedido.referencia || `#${pedido.pedido_id}`}?`,
    );

    if (!confirmed) return;

    try {
      showLoading("Cancelando pedido...");
      await api.cancelarPedido(pedido.pedido_id);
      await carregarPedidos();
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
    }, 220);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="orders-compact">
      <div className="orders-compact-toolbar">
        <div className="orders-search compact">
          <FiSearch />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Referência, cliente ou operador"
          />
        </div>
        <button type="button" className="ghost-action compact" onClick={() => carregarPedidos()} title="Atualizar pedidos">
          <FiRefreshCcw />
        </button>
      </div>

      <div className="orders-list-header compact">
        <strong>Pedidos pendentes</strong>
        <span>{loading ? "Carregando..." : `${pedidos.length} pedido(s)`}</span>
      </div>

      <div className="orders-list compact">
        {pedidos.length ? (
          pedidos.map((pedido) => (
            <article className="order-card-compact" key={pedido.pedido_id}>
              <div className="order-card-compact-top">
                <div>
                  <strong>{pedido.referencia_formatada || pedido.referencia}</strong>
                  <small>{pedido.cliente_nome || "Cliente não informado"}</small>
                </div>
                <strong>{formatCurrency(pedido.total_liquido)}</strong>
              </div>

              <div className="order-card-compact-meta">
                <span>{pedido.operador_nome || "Sem operador"}</span>
                <span>{pedido.total_itens} item(ns)</span>
              </div>

              <div className="order-card-compact-actions">
                <button type="button" className="secondary-action compact" onClick={() => importarPedido(pedido.pedido_id)}>
                  <FiDownload /> Importar
                </button>
                <button type="button" className="ghost-action compact danger" onClick={() => cancelarPedido(pedido)}>
                  <FiTrash2 /> Cancelar
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="orders-empty compact">
            Nenhum pedido pendente encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
