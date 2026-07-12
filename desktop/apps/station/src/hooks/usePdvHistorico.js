import { useContext, useState } from "react";
import { api } from "../api.js";
import { AppContext } from "../context/AppContext.jsx";
import { useSweetAlert } from "../context/SweetAlertContext.jsx";

export function usePdvHistorico({ config, operador, caixa, onPrintBudget }) {
  const [historicoBusca, setHistoricoBusca] = useState("");
  const [historicoStatus, setHistoricoStatus] = useState("");
  const [historicoVendas, setHistoricoVendas] = useState([]);
  const [historicoVendaSelecionadaId, setHistoricoVendaSelecionadaId] = useState(null);
  const [historicoVendaDetalhe, setHistoricoVendaDetalhe] = useState(null);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();

  async function carregarHistoricoVendas({ keepSelection = true } = {}) {
    try {
      setHistoricoLoading(true);
      const data = await api.vendas({
        search: historicoBusca,
        status: historicoStatus,
        limit: 100,
      });
      setHistoricoVendas(Array.isArray(data) ? data : []);

      const nextSelectedId =
        keepSelection && historicoVendaSelecionadaId
          ? historicoVendaSelecionadaId
          : data?.[0]?.venda_id || null;

      setHistoricoVendaSelecionadaId(nextSelectedId);
      if (nextSelectedId) {
        await carregarHistoricoVendaDetalhe(nextSelectedId);
      } else {
        setHistoricoVendaDetalhe(null);
      }
    } catch (error) {
      showAlert({
        title: "Falha ao carregar vendas",
        text: error.message,
        icon: "error",
      });
    } finally {
      setHistoricoLoading(false);
    }
  }

  async function carregarHistoricoVendaDetalhe(vendaId) {
    try {
      setHistoricoLoading(true);
      const data = await api.vendaDetalhe(vendaId);
      setHistoricoVendaSelecionadaId(Number(vendaId));
      setHistoricoVendaDetalhe(data);
      return data;
    } catch (error) {
      showAlert({
        title: "Falha ao carregar venda",
        text: error.message,
        icon: "error",
      });
      return null;
    } finally {
      setHistoricoLoading(false);
    }
  }

  function buildBudgetPayloadFromVenda(venda) {
    return {
      items: Array.isArray(venda?.itens)
        ? venda.itens.map((item) => ({
            codigo_produto: item.codigo_produto,
            descricao: item.descricao,
            quantidade: Number(item.quantidade || 0),
            valor_unitario: Number(item.valor_unitario || 0),
            unidade: item.unidade || "UN",
          }))
        : [],
      subtotal: Number(venda?.total_produtos || 0),
      desconto: Number(venda?.total_desconto || 0),
      total: Number(venda?.total_liquido || 0),
      pagamentos: Array.isArray(venda?.pagamentos)
        ? venda.pagamentos.map((pagamento) => ({
            forma: pagamento.forma,
            descricao: pagamento.forma,
            valor: Number(pagamento.valor || 0),
          }))
        : [],
      cliente: venda?.cliente_nome || "Consumidor nao identificado",
      operador: venda?.operador_nome || operador?.nome || caixa?.operador_nome || "Operador",
      data: venda?.concluida_em || venda?.criada_em || new Date().toLocaleString("pt-BR"),
      terminal: venda?.terminal_codigo || config?.terminal_codigo || config?.terminal_nome || "PDV",
      emitente: {
        nome: config?.tenant_nome || "V12 ERP",
        documento: config?.tenant_documento || "",
        endereco: config?.tenant_endereco || "",
        inscricaoEstadual: config?.tenant_inscricao_estadual || "",
        inscricaoMunicipal: config?.tenant_inscricao_municipal || "",
      },
      numeroDocumento: `VENDA-${String(venda?.venda_id || "").padStart(6, "0")}`,
    };
  }

  async function reimprimirVendaHistorico() {
    if (!historicoVendaDetalhe) return;
    await onPrintBudget(buildBudgetPayloadFromVenda(historicoVendaDetalhe));
  }

  async function cancelarVendaHistorico() {
    if (!historicoVendaDetalhe) return;

    const confirmed = await askYesNoQuestion(
      "Cancelar venda",
      `Deseja cancelar a venda #${String(historicoVendaDetalhe.venda_id).padStart(6, "0")}? O estoque sera devolvido.`,
    );

    if (!confirmed) return;

    try {
      showLoading("Cancelando venda...");
      await api.cancelarVenda(historicoVendaDetalhe.venda_id, {
        motivo: "Cancelamento manual no PDV.",
      });
      await carregarHistoricoVendas({ keepSelection: true });
      showAlert({
        title: "Venda cancelada",
        text: "A venda foi cancelada e o estoque foi devolvido ao terminal.",
        icon: "success",
      });
    } catch (error) {
      showAlert({
        title: "Falha ao cancelar venda",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  return {
    historicoBusca,
    historicoStatus,
    historicoVendas,
    historicoVendaSelecionadaId,
    historicoVendaDetalhe,
    historicoLoading,
    setHistoricoBusca,
    setHistoricoStatus,
    carregarHistoricoVendas,
    carregarHistoricoVendaDetalhe,
    reimprimirVendaHistorico,
    cancelarVendaHistorico,
  };
}
