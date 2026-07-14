import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import {
  FALLBACK_FINANCEIRO_SUPPORT_DATA,
  LIMITE_IDENTIFICACAO_CLIENTE,
} from "../constants/pdv.js";
import { AppContext } from "../context/AppContext.jsx";
import { useSweetAlert } from "../context/SweetAlertContext.jsx";

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
  const [financeiroSupportData, setFinanceiroSupportData] = useState(null);
  const productSearchRef = useRef(null);
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();

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
  const formasPagamento = financeiroSupportData?.formasPagamento?.length
    ? financeiroSupportData.formasPagamento
    : FALLBACK_FINANCEIRO_SUPPORT_DATA.formasPagamento;
  const clienteResumo = clienteIdentificado
    ? `${clienteIdentificado.tipoDocumento}: ${clienteIdentificado.documento} - ${clienteIdentificado.nome}`
    : null;

  function resetVendaState() {
    setCart([]);
    setClienteIdentificado(null);
    setClienteModalAberto(false);
    setPagamentoModalAberto(false);
    setPagamentosConfirmados(null);
    setDescontoEntrada("");
    setDescontoTipo("valor");
  }

  function addProduto(produto, quantidade = 1) {
    if (pagamentosConfirmados?.length) {
      showAlert({
        title: "Recebimento já informado",
        text: "Cancele os pagamentos antes de adicionar ou alterar itens da venda.",
        icon: "warning",
      });
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.produto_id === produto.produto_id);
      const quantidadeAdicionar = Math.max(1, Number(quantidade) || 1);
      const estoqueDisponivel = Math.max(0, Number(produto.estoque_atual || 0));

      if (quantidadeAdicionar > estoqueDisponivel) {
        showAlert({
          title: "Estoque insuficiente",
          text: `Disponível para ${produto.descricao}: ${estoqueDisponivel}.`,
          icon: "warning",
        });
        return current;
      }

      if (existing) {
        const proximaQuantidade = Number(existing.quantidade) + quantidadeAdicionar;
        if (proximaQuantidade > estoqueDisponivel) {
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

      if (quantidade > estoqueDisponivel) {
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

  async function carregarFinanceiroSupportData({ silent = false, refresh = false } = {}) {
    try {
      if (!silent) {
        showLoading("Carregando formas de pagamento...");
      }

      const result = refresh
        ? await api.sincronizarFinanceiroSupportData({ tipo: "receber", refresh: true })
        : await api.financeiroSupportData({ tipo: "receber" });
      const supportData = result || FALLBACK_FINANCEIRO_SUPPORT_DATA;
      const nextFormasPagamento = Array.isArray(supportData.formasPagamento)
        ? supportData.formasPagamento.filter(Boolean)
        : [];

      setFinanceiroSupportData({
        ...FALLBACK_FINANCEIRO_SUPPORT_DATA,
        ...supportData,
        formasPagamento: nextFormasPagamento.length
          ? nextFormasPagamento
          : FALLBACK_FINANCEIRO_SUPPORT_DATA.formasPagamento,
        formaPagamentoPadrao:
          supportData.formaPagamentoPadrao ||
          nextFormasPagamento.find((item) => item.padrao) ||
          FALLBACK_FINANCEIRO_SUPPORT_DATA.formaPagamentoPadrao,
      });

      return {
        success: true,
      };
    } catch (error) {
      if (refresh) {
        try {
          const cachedResult = await api.financeiroSupportData({ tipo: "receber" });
          const cachedSupportData = cachedResult || FALLBACK_FINANCEIRO_SUPPORT_DATA;
          const nextFormasPagamento = Array.isArray(cachedSupportData.formasPagamento)
            ? cachedSupportData.formasPagamento.filter(Boolean)
            : [];

          setFinanceiroSupportData({
            ...FALLBACK_FINANCEIRO_SUPPORT_DATA,
            ...cachedSupportData,
            formasPagamento: nextFormasPagamento.length
              ? nextFormasPagamento
              : FALLBACK_FINANCEIRO_SUPPORT_DATA.formasPagamento,
            formaPagamentoPadrao:
              cachedSupportData.formaPagamentoPadrao ||
              nextFormasPagamento.find((item) => item.padrao) ||
              FALLBACK_FINANCEIRO_SUPPORT_DATA.formaPagamentoPadrao,
          });

          return {
            success: true,
            cached: true,
          };
        } catch {
          // fallback local padrao
        }
      }

      setFinanceiroSupportData(FALLBACK_FINANCEIRO_SUPPORT_DATA);
      return {
        success: false,
        message: String(error?.message || "").trim(),
      };
    } finally {
      if (!silent) {
        hideLoading();
      }
    }
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

  function buildBudgetPayloadFromVenda(vendaSalva) {
    return {
      items: Array.isArray(vendaSalva?.itens)
        ? vendaSalva.itens.map((item) => ({
            produto_id: item.produto_id,
            codigo_produto: item.codigo_produto,
            descricao: item.descricao,
            quantidade: Number(item.quantidade || 0),
            valor_unitario: Number(item.valor_unitario || 0),
            unidade: item.unidade || "UN",
          }))
        : cart.map((item) => ({ ...item })),
      subtotal: Number(vendaSalva?.total_produtos ?? subtotal ?? 0),
      desconto: Number(vendaSalva?.total_desconto ?? descontoCalculado ?? 0),
      total: Number(vendaSalva?.total_liquido ?? total ?? 0),
      pagamentos: Array.isArray(vendaSalva?.pagamentos)
        ? vendaSalva.pagamentos.map((item) => {
            const forma = formasPagamento.find((formaPagamento) => formaPagamento.codigo === item.forma);
            return {
              ...item,
              descricao: forma?.descricao || item.forma,
            };
          })
        : buildBudgetPayload().pagamentos,
      cliente: vendaSalva?.cliente_nome || clienteResumo || "Consumidor não identificado",
      operador: vendaSalva?.operador_nome || operador?.nome || caixa?.operador_nome || "Operador",
      data: vendaSalva?.concluida_em || vendaSalva?.criada_em || new Date().toLocaleString("pt-BR"),
      terminal: vendaSalva?.terminal_codigo || config?.terminal_codigo || config?.terminal_nome || "PDV",
      emitente: {
        nome: config?.tenant_nome || "V12 ERP",
        documento: config?.tenant_documento || "",
        endereco: config?.tenant_endereco || "",
        inscricaoEstadual: config?.tenant_inscricao_estadual || "",
        inscricaoMunicipal: config?.tenant_inscricao_municipal || "",
      },
      numeroDocumento: `ORC-${String(vendaSalva?.venda_id || Date.now()).padStart(6, "0")}`,
    };
  }

  function buildBudgetPayload(itemsOverride = cart.map((item) => ({ ...item }))) {
    return {
      items: itemsOverride,
      subtotal,
      desconto: descontoCalculado,
      total,
      pagamentos: Array.isArray(pagamentosConfirmados)
        ? pagamentosConfirmados.map((item) => {
            const forma = formasPagamento.find((formaPagamento) => formaPagamento.codigo === item.forma);
            return {
              ...item,
              descricao: forma?.descricao || item.forma,
            };
          })
        : [],
      cliente: clienteResumo || "Consumidor não identificado",
      operador: operador?.nome || caixa?.operador_nome || "Operador",
      data: new Date().toLocaleString("pt-BR"),
      terminal: config?.terminal_codigo || config?.terminal_nome || "PDV",
      emitente: {
        nome: config?.tenant_nome || "V12 ERP",
        documento: config?.tenant_documento || "",
        endereco: config?.tenant_endereco || "",
        inscricaoEstadual: config?.tenant_inscricao_estadual || "",
        inscricaoMunicipal: config?.tenant_inscricao_municipal || "",
      },
      numeroDocumento: `ORC-${Date.now()}`,
    };
  }

  async function sendBudgetToPrint(payloadBase = null) {
    const payload = payloadBase || buildBudgetPayload();
    const printerConfig = await api.obterConfiguracaoImpressora().catch(() => null);

    if (window.v12Desktop?.printBudget) {
      await window.v12Desktop.printBudget(payload, printerConfig);
      return;
    }

    const popup = window.open("", "_blank", "width=900,height=900");
    if (!popup) {
      throw new Error("Não foi possível abrir a janela de impressão.");
    }

    popup.document.write(`<pre>${JSON.stringify(payload, null, 2)}</pre>`);
    popup.document.close();
    popup.focus();
    popup.onafterprint = () => popup.close();
    popup.print();
  }

  async function sendDanfceToPrint(pdfPath) {
    if (!pdfPath) {
      throw new Error("A NFC-e foi autorizada, mas o PDF do DANFCe não foi gerado.");
    }

    const printerConfig = await api.obterConfiguracaoImpressora().catch(() => null);

    if (!window.v12Desktop?.printPdfFile) {
      throw new Error("A impressão do DANFCe funciona somente no app Electron.");
    }

    await window.v12Desktop.printPdfFile(pdfPath, printerConfig);
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

      resetVendaState();

      let avisoImpressao = "";
      if (modoFinalizacao === "orcamento") {
        try {
          await sendBudgetToPrint(buildBudgetPayloadFromVenda(result.venda));
        } catch (printError) {
          avisoImpressao = ` O orçamento foi registrado, mas não foi possível imprimir: ${printError.message}`;
        }
      }

      if (
        modoFinalizacao === "cupom" &&
        (result.fiscal?.success || result.fiscal?.status === "contingencia")
      ) {
        try {
          await sendDanfceToPrint(result.fiscal?.pdfPath);
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
    } catch (error) {
      if (modoFinalizacao === "cupom" && error?.code === "NFCE_CONTINGENCIA_DISPONIVEL") {
        try {
          const vendaId = Number(error?.data?.vendaId || 0);
          if (vendaId > 0) {
            showLoading("Emitindo NFC-e em contingência offline...");
            const result = await api.emitirVendaEmContingencia(vendaId, {
              contingenciaJustificativa: error?.message,
            });
            resetVendaState();

            let avisoImpressao = "";
            try {
              await sendDanfceToPrint(result.fiscal?.pdfPath);
            } catch (printError) {
              avisoImpressao = ` DANFCe de contingência emitido, mas não foi possível imprimir: ${printError.message}`;
            }

            showAlert({
              title: "Cupom emitido em contingência",
              text: `${result.fiscal?.message || "NFC-e emitida em contingência offline."}${avisoImpressao}`.trim(),
              icon: "warning",
            });
            return;
          }
        } catch (fallbackError) {
          showAlert({
            title: "Falha na contingência",
            text: fallbackError.message,
            icon: "error",
          });
          return;
        } finally {
          hideLoading();
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

  async function imprimirOrcamento(payloadBase = null) {
    try {
      await sendBudgetToPrint(payloadBase);
    } catch (error) {
      showAlert({
        title: "Falha ao imprimir orçamento",
        text: error.message,
        icon: "error",
      });
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
