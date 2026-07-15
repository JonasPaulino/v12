import { useContext, useState } from "react";
import { api } from "../api.js";
import { AppContext } from "../context/AppContext.jsx";
import { useSweetAlert } from "../context/SweetAlertContext.jsx";
import { sendDanfceHtmlToPrint } from "./venda/vendaPrintService.js";

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
    const numeroDocumento =
      venda?.nfce_numero && venda?.nfce_serie
        ? `NFC-E ${String(venda.nfce_serie).padStart(3, "0")}/${String(venda.nfce_numero).padStart(6, "0")}`
        : `ORC-${String(venda?.venda_id || "").padStart(6, "0")}`;

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
      cliente: venda?.cliente_nome || "Consumidor não identificado",
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
      numeroDocumento,
    };
  }

  async function imprimirDanfceHistorico(venda) {
    await sendDanfceHtmlToPrint({
      fiscal: {
        status: venda?.nfce_status,
        chave_acesso: venda?.chave_acesso,
        protocolo: venda?.protocolo,
        numero: venda?.nfce_numero,
        serie: venda?.nfce_serie,
        cstat: venda?.nfce_cstat,
        xMotivo: venda?.nfce_motivo,
        xml: venda?.nfce_xml_assinado || venda?.nfce_xml || null,
      },
      sale: buildBudgetPayloadFromVenda(venda),
      pdfPath: venda?.nfce_pdf_path || null,
    });
  }

  async function reimprimirVendaHistorico() {
    if (!historicoVendaDetalhe) return;

    if (["autorizada", "contingencia"].includes(historicoVendaDetalhe.nfce_status)) {
      try {
        showLoading("Reimprimindo DANFCe...");
        await imprimirDanfceHistorico(historicoVendaDetalhe);
      } catch (error) {
        showAlert({
          title: "Falha ao reimprimir DANFCe",
          text: error.message,
          icon: "error",
        });
      } finally {
        hideLoading();
      }
      return;
    }

    await onPrintBudget(buildBudgetPayloadFromVenda(historicoVendaDetalhe));
  }

  async function transmitirContingenciaHistorico() {
    if (!historicoVendaDetalhe || historicoVendaDetalhe.nfce_status !== "contingencia") return;

    try {
      showLoading("Transmitindo NFC-e em contingência...");
      const data = await api.transmitirVendaContingencia(historicoVendaDetalhe.venda_id);
      setHistoricoVendaDetalhe(data?.venda || null);
      await carregarHistoricoVendas({ keepSelection: true });

      showAlert({
        title: data?.fiscal?.success ? "NFC-e autorizada" : "Contingência processada",
        text:
          data?.fiscal?.message ||
          "A NFC-e em contingência foi processada novamente com a SEFAZ.",
        icon: data?.fiscal?.success ? "success" : "info",
      });
    } catch (error) {
      showAlert({
        title: "Falha ao transmitir",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  async function emitirCupomHistorico() {
    if (!historicoVendaDetalhe) return;

    try {
      showLoading("Emitindo cupom fiscal...");
      const data = await api.emitirCupomFiscalVenda(historicoVendaDetalhe.venda_id, {
        permitirContingenciaAutomatica: true,
      });
      setHistoricoVendaDetalhe(data?.venda || null);
      await carregarHistoricoVendas({ keepSelection: true });

      let avisoImpressao = "";
      if (data?.fiscal?.success || data?.fiscal?.status === "contingencia") {
        try {
          await sendDanfceHtmlToPrint({
            fiscal: data.fiscal,
            sale: buildBudgetPayloadFromVenda(data?.venda || historicoVendaDetalhe),
            pdfPath: data?.fiscal?.pdfPath || null,
          });
        } catch (printError) {
          avisoImpressao = ` A NFC-e foi emitida, mas o DANFCe não foi impresso: ${printError.message}`;
        }
      }

      showAlert({
        title:
          data?.fiscal?.status === "contingencia"
            ? "Cupom emitido em contingência"
            : data?.fiscal?.success
              ? "NFC-e emitida"
              : "Emissão processada",
        text: `${data?.fiscal?.message || "A venda foi convertida em cupom fiscal."}${avisoImpressao}`.trim(),
        icon: data?.fiscal?.status === "contingencia" || avisoImpressao ? "warning" : "success",
      });
    } catch (error) {
      showAlert({
        title: "Falha ao emitir cupom",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  async function cancelarVendaHistorico() {
    if (!historicoVendaDetalhe) return;

    const isNfceAutorizada = historicoVendaDetalhe.nfce_status === "autorizada";
    const cancelPolicy = historicoVendaDetalhe.nfce_cancel_policy || null;

    if (isNfceAutorizada && cancelPolicy?.canCancelFiscal === false) {
      showAlert({
        title: "Cancelamento indisponível",
        text: cancelPolicy.message || "O prazo de cancelamento da NFC-e expirou.",
        icon: "warning",
      });
      return;
    }

    const confirmed = await askYesNoQuestion(
      isNfceAutorizada ? "Cancelar NFC-e" : "Cancelar venda",
      isNfceAutorizada
        ? `Deseja enviar o cancelamento fiscal da NFC-e #${String(historicoVendaDetalhe.nfce_numero || "").padStart(6, "0")} para a SEFAZ?`
        : `Deseja cancelar a venda #${String(historicoVendaDetalhe.venda_id).padStart(6, "0")}? O estoque será devolvido.`,
    );

    if (!confirmed) return;

    try {
      showLoading(isNfceAutorizada ? "Cancelando NFC-e..." : "Cancelando venda...");
      const data = isNfceAutorizada
        ? await api.cancelarNfceVenda(historicoVendaDetalhe.venda_id, {
            motivo: "Cancelamento solicitado pelo operador do PDV.",
          })
        : await api.cancelarVenda(historicoVendaDetalhe.venda_id, {
            motivo: "Cancelamento manual no PDV.",
          });

      if (data?.venda) {
        setHistoricoVendaDetalhe(data.venda);
      }
      await carregarHistoricoVendas({ keepSelection: true });
      showAlert({
        title: isNfceAutorizada ? "NFC-e cancelada" : "Venda cancelada",
        text: isNfceAutorizada
          ? data?.fiscal?.message || "Cancelamento fiscal homologado pela SEFAZ."
          : "A venda foi cancelada e o estoque foi devolvido ao terminal.",
        icon: "success",
      });
    } catch (error) {
      showAlert({
        title: isNfceAutorizada ? "Falha ao cancelar NFC-e" : "Falha ao cancelar venda",
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
    emitirCupomHistorico,
    transmitirContingenciaHistorico,
    cancelarVendaHistorico,
  };
}
