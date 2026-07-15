import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { LIMITE_IDENTIFICACAO_CLIENTE } from "../constants/pdv.js";
import { AppContext } from "../context/AppContext.jsx";
import { useSweetAlert } from "../context/SweetAlertContext.jsx";
import { useVendaFinanceiro } from "./venda/useVendaFinanceiro.js";
import { buildBudgetPayload, buildBudgetPayloadFromVenda } from "./venda/vendaPayloads.js";
import { sendBudgetToPrint as printBudgetDocument, sendDanfceToPrint as printDanfceDocument } from "./venda/vendaPrintService.js";

function getClienteResumo(clienteIdentificado) {
  if (!clienteIdentificado) {
    return null;
  }

  return `${clienteIdentificado.tipoDocumento}: ${clienteIdentificado.documento} - ${clienteIdentificado.nome}`;
}

export function usePdvVenda({ config, operador, caixa, activeModule, caixaPendenteDiaAnterior }) {
  const [cart, setCart] = useState([]);
  const [clienteIdentificado, setClienteIdentificado] = useState(null);
  const [clienteModalAberto, setClienteModalAberto] = useState(false);
  const [clienteForm, setClienteForm] = useState({
    tipoDocumento: "CPF",
    documento: "",
    nome: "",
    email: "",
  });
  const [pagamentoModalAberto, setPagamentoModalAberto] = useState(false);
  const [pagamentosConfirmados, setPagamentosConfirmados] = useState(null);
  const [descontoTipo, setDescontoTipo] = useState("valor");
  const [descontoEntrada, setDescontoEntrada] = useState("");
  const productSearchRef = useRef(null);
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const { financeiroSupportData, formasPagamento, carregarFinanceiroSupportData } = useVendaFinanceiro({
    showLoading,
    hideLoading,
  });

  useEffect(() => {
    if (cart.length) return;
    setDescontoEntrada("");
    setDescontoTipo("valor");
  }, [cart.length]);

  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item.quantidade) * Number(item.valor_unitario), 0);
  }, [cart]);

  const descontoCalculado = useMemo(() => {
    const raw = Number(String(descontoEntrada || "").replace(",", "."));
    const valorInformado = Number.isFinite(raw) ? raw : 0;

    if (subtotal <= 0 || valorInformado <= 0) {
      return 0;
    }

    if (descontoTipo === "percentual") {
      return Math.min(subtotal, subtotal * Math.min(valorInformado, 100) / 100);
    }

    return Math.min(subtotal, valorInformado);
  }, [descontoEntrada, descontoTipo, subtotal]);

  const total = useMemo(() => {
    return Math.max(0, Number((subtotal - descontoCalculado).toFixed(2)));
  }, [descontoCalculado, subtotal]);

  const vendaProntaParaConclusao = Array.isArray(pagamentosConfirmados) && pagamentosConfirmados.length > 0;
  const clienteResumo = getClienteResumo(clienteIdentificado);

  function resetVendaState() {
    setCart([]);
    setClienteIdentificado(null);
    setClienteModalAberto(false);
    setPagamentoModalAberto(false);
    setPagamentosConfirmados(null);
    setDescontoEntrada("");
    setDescontoTipo("valor");
  }

  function validarEdicaoComPagamento() {
    if (!pagamentosConfirmados?.length) {
      return false;
    }

    showAlert({
      title: "Recebimento já informado",
      text: "Cancele os pagamentos antes de adicionar ou alterar itens da venda.",
      icon: "warning",
    });
    return true;
  }

  function addProduto(produto, quantidade = 1) {
    if (validarEdicaoComPagamento()) {
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.produto_id === produto.produto_id);
      const quantidadeAdicionar = Math.max(1, Number(quantidade) || 1);
      const estoqueDisponivel = Math.max(0, Number(produto.estoque_atual || 0));
      const controlaEstoque = produto.controla_estoque !== false;

      if (controlaEstoque && quantidadeAdicionar > estoqueDisponivel) {
        showAlert({
          title: "Estoque insuficiente",
          text: `Disponível para ${produto.descricao}: ${estoqueDisponivel}.`,
          icon: "warning",
        });
        return current;
      }

      if (existing) {
        const proximaQuantidade = Number(existing.quantidade) + quantidadeAdicionar;
        if (controlaEstoque && proximaQuantidade > estoqueDisponivel) {
          showAlert({
            title: "Estoque insuficiente",
            text: `Disponível para ${produto.descricao}: ${estoqueDisponivel}.`,
            icon: "warning",
          });
          return current;
        }

        return current.map((item) =>
          item.produto_id === produto.produto_id
            ? { ...item, quantidade: proximaQuantidade }
            : item,
        );
      }

      return [
        ...current,
        {
          produto_id: produto.produto_id,
          codigo_produto: produto.codigo,
          descricao: produto.descricao,
          unidade: produto.unidade || "UN",
          quantidade: quantidadeAdicionar,
          estoque_atual: estoqueDisponivel,
          controla_estoque: controlaEstoque,
          valor_unitario: Number(produto.preco_venda || 0),
        },
      ];
    });
    setPagamentosConfirmados(null);
  }

  function atualizarCart(nextCart) {
    const normalizedCart = Array.isArray(nextCart) ? nextCart : [];

    for (const item of normalizedCart) {
      const quantidade = Number(item.quantidade || 0);
      const estoqueDisponivel = Math.max(0, Number(item.estoque_atual || 0));
      const controlaEstoque = item.controla_estoque !== false;

      if (controlaEstoque && quantidade > estoqueDisponivel) {
        showAlert({
          title: "Estoque insuficiente",
          text: `Disponível para ${item.descricao}: ${estoqueDisponivel}.`,
          icon: "warning",
        });
        return false;
      }
    }

    setCart(normalizedCart);
    setPagamentosConfirmados(null);
    return true;
  }

  async function iniciarFinalizacaoVenda() {
    try {
      if (total >= LIMITE_IDENTIFICACAO_CLIENTE && !clienteIdentificado) {
        const wantsToIdentify = await askYesNoQuestion(
          "Identificar cliente",
          "Esta venda está acima de R$ 10.000,00. Deseja identificar o cliente antes de finalizar?",
        );

        if (wantsToIdentify) {
          abrirModalCliente();
          return;
        }
      }

      if (!financeiroSupportData) {
        const loaded = await carregarFinanceiroSupportData();
        if (!loaded?.success) {
          showAlert({
            title: "Formas de pagamento indisponíveis",
            text: loaded?.message
              ? `${loaded.message}. O PDV seguirá com os meios locais padrão.`
              : "Não foi possível carregar o apoio financeiro do ERP. O PDV seguirá com os meios locais padrão.",
            icon: "warning",
          });
        }
      }

      setPagamentoModalAberto(true);
    } catch (error) {
      showAlert({
        title: "Falha na venda",
        text: error.message,
        icon: "error",
      });
    }
  }

  function confirmarRecebimentoVenda(pagamentos) {
    setPagamentosConfirmados(pagamentos);
    setPagamentoModalAberto(false);
    showAlert({
      title: "Pagamento informado",
      text: "Agora escolha se deseja finalizar o orçamento ou finalizar o cupom fiscal.",
      icon: "success",
    });
  }

  function montarPayloadOrcamento(vendaSalva = null) {
    if (vendaSalva) {
      return buildBudgetPayloadFromVenda({
        vendaSalva,
        cart,
        subtotal,
        descontoCalculado,
        total,
        pagamentosConfirmados,
        formasPagamento,
        clienteResumo,
        operador,
        caixa,
        config,
      });
    }

    return buildBudgetPayload({
      items: cart.map((item) => ({ ...item })),
      subtotal,
      descontoCalculado,
      total,
      pagamentosConfirmados,
      formasPagamento,
      clienteResumo,
      operador,
      caixa,
      config,
    });
  }

  async function imprimirOrcamento(payloadBase = null) {
    try {
      await printBudgetDocument(payloadBase || montarPayloadOrcamento());
    } catch (error) {
      showAlert({
        title: "Falha ao imprimir orçamento",
        text: error.message,
        icon: "error",
      });
    }
  }

  async function imprimirDanfce(pdfPath) {
    await printDanfceDocument(pdfPath);
  }

  async function concluirVendaComSucesso({ result, modoFinalizacao }) {
    resetVendaState();

    let avisoImpressao = "";
    if (modoFinalizacao === "orcamento") {
      try {
        await printBudgetDocument(montarPayloadOrcamento(result.venda));
      } catch (printError) {
        avisoImpressao = ` O orçamento foi registrado, mas não foi possível imprimir: ${printError.message}`;
      }
    }

    if (
      modoFinalizacao === "cupom" &&
      (result.fiscal?.success || result.fiscal?.status === "contingencia")
    ) {
      try {
        await imprimirDanfce(result.fiscal?.pdfPath);
      } catch (printError) {
        avisoImpressao = ` NFC-e autorizada, mas o DANFCe não foi impresso: ${printError.message}`;
      }
    }

    const vendaRegistradaSemFiscal = !result.fiscal?.success;
    const ehCupom = modoFinalizacao === "cupom";
    showAlert({
      title: ehCupom
        ? result.fiscal?.status === "contingencia"
          ? "Cupom emitido em contingência"
          : vendaRegistradaSemFiscal
            ? "Venda registrada com pendência fiscal"
            : "NFC-e emitida"
        : "Orçamento finalizado",
      text: `${result.fiscal?.message || "Venda registrada localmente."}${avisoImpressao}`.trim(),
      icon: ehCupom
        ? vendaRegistradaSemFiscal
          ? "warning"
          : avisoImpressao
            ? "warning"
            : "success"
        : avisoImpressao
          ? "warning"
          : "success",
    });
  }

  async function tratarContingenciaAutomatica(error) {
    try {
      const vendaId = Number(error?.data?.vendaId || 0);
      if (vendaId <= 0) {
        return false;
      }

      showLoading("Emitindo NFC-e em contingência offline...");
      const result = await api.emitirVendaEmContingencia(vendaId, {
        contingenciaJustificativa: error?.message,
      });

      resetVendaState();

      let avisoImpressao = "";
      try {
        await imprimirDanfce(result.fiscal?.pdfPath);
      } catch (printError) {
        avisoImpressao = ` DANFCe de contingência emitido, mas não foi possível imprimir: ${printError.message}`;
      }

      showAlert({
        title: "Cupom emitido em contingência",
        text: `${result.fiscal?.message || "NFC-e emitida em contingência offline."}${avisoImpressao}`.trim(),
        icon: "warning",
      });
      return true;
    } catch (fallbackError) {
      showAlert({
        title: "Falha na contingência",
        text: fallbackError.message,
        icon: "error",
      });
      return true;
    } finally {
      hideLoading();
    }
  }

  async function finalizarVenda(modoFinalizacao = "orcamento") {
    try {
      if (!Array.isArray(pagamentosConfirmados) || !pagamentosConfirmados.length) {
        throw new Error("Informe as formas de pagamento antes de concluir a venda.");
      }

      showLoading("Finalizando venda...");
      const result = await api.criarVenda({
        cliente: clienteIdentificado,
        items: cart,
        pagamentos: pagamentosConfirmados,
        subtotal,
        desconto: descontoCalculado,
        totalLiquido: total,
        emitirFiscal: modoFinalizacao === "cupom",
        permitirContingenciaAutomatica: modoFinalizacao === "cupom",
      });

      await concluirVendaComSucesso({ result, modoFinalizacao });
    } catch (error) {
      if (modoFinalizacao === "cupom" && error?.code === "NFCE_CONTINGENCIA_DISPONIVEL") {
        const handled = await tratarContingenciaAutomatica(error);
        if (handled) {
          return;
        }
      }

      showAlert({
        title: "Falha na venda",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  async function cancelarPagamentosConfirmados() {
    if (!Array.isArray(pagamentosConfirmados) || !pagamentosConfirmados.length) {
      return;
    }

    const confirmed = await askYesNoQuestion(
      "Cancelar recebimento",
      "Deseja cancelar os pagamentos informados e liberar a venda para edição?",
    );

    if (!confirmed) return;

    setPagamentosConfirmados(null);
    showAlert({
      title: "Pagamentos cancelados",
      text: "A venda voltou a ficar editável.",
      icon: "success",
    });
  }

  function abrirModalCliente() {
    if (pagamentosConfirmados?.length) {
      showAlert({
        title: "Recebimento já informado",
        text: "Cancele os pagamentos antes de alterar o cliente desta venda.",
        icon: "warning",
      });
      return;
    }

    setClienteForm({
      tipoDocumento: clienteIdentificado?.tipoDocumento || "CPF",
      documento: clienteIdentificado?.documento || "",
      nome: clienteIdentificado?.nome || "",
      email: clienteIdentificado?.email || "",
    });
    setClienteModalAberto(true);
  }

  function fecharModalCliente() {
    setClienteModalAberto(false);
  }

  function salvarClienteIdentificado() {
    const tipoDocumento = String(clienteForm.tipoDocumento || "CPF").toUpperCase();
    const documentoBruto = String(clienteForm.documento || "").trim();
    const documento = tipoDocumento === "ESTRANGEIRO" ? documentoBruto : documentoBruto.replace(/\D/g, "");
    const nome = String(clienteForm.nome || "").trim();
    const email = String(clienteForm.email || "").trim().toLowerCase();

    if (!documento) {
      showAlert({
        title: "Documento obrigatório",
        text: "Informe o documento do cliente para identificar a venda.",
        icon: "warning",
      });
      return;
    }

    if (!nome) {
      showAlert({
        title: "Nome obrigatório",
        text: "Informe o nome do cliente para continuar.",
        icon: "warning",
      });
      return;
    }

    if (tipoDocumento === "CPF" && documento.length !== 11) {
      showAlert({
        title: "CPF inválido",
        text: "O CPF precisa ter 11 dígitos.",
        icon: "warning",
      });
      return;
    }

    if (tipoDocumento === "CNPJ" && documento.length !== 14) {
      showAlert({
        title: "CNPJ inválido",
        text: "O CNPJ precisa ter 14 dígitos.",
        icon: "warning",
      });
      return;
    }

    setClienteIdentificado({
      tipoDocumento,
      documento,
      nome,
      email: email || null,
    });
    setPagamentosConfirmados(null);
    setClienteModalAberto(false);
    showAlert({
      title: "Cliente identificado",
      text: `${nome} foi vinculado a venda atual.`,
      icon: "success",
    });
  }

  function focarConsultaProduto() {
    if (activeModule !== "venda") {
      return;
    }

    productSearchRef.current?.focusSearch?.();
  }

  function abrirPagamentoVenda() {
    if (!caixa || caixaPendenteDiaAnterior || !cart.length) return;
    if (clienteModalAberto || pagamentoModalAberto || vendaProntaParaConclusao) return;
    iniciarFinalizacaoVenda();
  }

  return {
    cart,
    clienteIdentificado,
    clienteModalAberto,
    clienteForm,
    pagamentoModalAberto,
    pagamentosConfirmados,
    descontoTipo,
    descontoEntrada,
    descontoCalculado,
    subtotal,
    total,
    financeiroSupportData,
    productSearchRef,
    vendaProntaParaConclusao,
    formasPagamento,
    clienteResumo,
    setCart,
    atualizarCart,
    setClienteIdentificado,
    setClienteForm,
    setPagamentoModalAberto,
    setPagamentosConfirmados,
    setDescontoTipo,
    setDescontoEntrada,
    addProduto,
    resetVendaState,
    carregarFinanceiroSupportData,
    iniciarFinalizacaoVenda,
    confirmarRecebimentoVenda,
    finalizarVenda,
    imprimirOrcamento,
    cancelarPagamentosConfirmados,
    abrirModalCliente,
    fecharModalCliente,
    salvarClienteIdentificado,
    focarConsultaProduto,
    abrirPagamentoVenda,
  };
}
