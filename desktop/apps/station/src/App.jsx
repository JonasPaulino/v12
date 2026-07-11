import { useContext, useEffect, useMemo, useState } from "react";
import {
  FiChevronDown,
  FiFileText,
  FiMaximize2,
  FiMenu,
  FiPower,
  FiRefreshCcw,
  FiSettings,
  FiUser,
  FiShoppingCart,
  FiX,
  FiWifi,
} from "react-icons/fi";
import { api } from "./api.js";
import { AberturaCaixa } from "./components/caixa/AberturaCaixa.jsx";
import { FechamentoCaixa } from "./components/caixa/FechamentoCaixa.jsx";
import { MovimentoCaixa } from "./components/caixa/MovimentoCaixa.jsx";
import { ConfiguracaoLocal } from "./components/configuracao/ConfiguracaoLocal.jsx";
import { ProdutoSearch } from "./components/ProdutoSearch.jsx";
import { LoginOperador } from "./components/setup/LoginOperador.jsx";
import { SetupLocal } from "./components/setup/SetupLocal.jsx";
import { VendaPagamentoModal } from "./components/pagamento/VendaPagamentoModal.jsx";
import { VendaResumo } from "./components/VendaResumo.jsx";
import { AppContext } from "./context/AppContext.jsx";
import { useSweetAlert } from "./context/SweetAlertContext.jsx";
import logoPdvWhite from "./assets/logo_pdv_branca.png";

function getModuleForCaixa(caixaData) {
  if (caixaData?.caixa_pendente_dia_anterior) return "fechamento";
  return caixaData ? "venda" : "abertura";
}

const LIMITE_IDENTIFICACAO_CLIENTE = 10000;
const FALLBACK_FINANCEIRO_SUPPORT_DATA = {
  condicoesPagamento: [],
  condicaoPagamentoPadrao: null,
  formasPagamento: [
    { codigo: "dinheiro", descricao: "Dinheiro", padrao: true },
    { codigo: "pix", descricao: "Pix", padrao: false },
    { codigo: "debito", descricao: "Cartão de débito", padrao: false },
    { codigo: "credito", descricao: "Cartão de crédito", padrao: false },
    { codigo: "outros", descricao: "Outros", padrao: false },
  ],
  formaPagamentoPadrao: { codigo: "dinheiro", descricao: "Dinheiro", padrao: true },
};

export default function App() {
  const [health, setHealth] = useState(null);
  const [configStatus, setConfigStatus] = useState(null);
  const [operador, setOperador] = useState(null);
  const [caixa, setCaixa] = useState(null);
  const [activeModule, setActiveModule] = useState("abertura");
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
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();

  async function loadInitialData({ silent = false } = {}) {
    try {
      if (!silent) showLoading("Atualizando PDV...");
      const [healthData, statusData, caixaData] = await Promise.all([
        api.health(),
        api.configuracaoStatus(),
        api.caixaAtual(),
      ]);
      setHealth(healthData);
      setConfigStatus(statusData);
      setCaixa(caixaData);
      setActiveModule(getModuleForCaixa(caixaData));
      if (!silent) {
        showAlert({
          title: "PDV atualizado",
          text: "Dados locais atualizados com sucesso.",
          icon: "success",
        });
      }
    } catch (error) {
      showAlert({
        title: "Falha ao atualizar",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  useEffect(() => {
    loadInitialData({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!operador) return;
    setActiveModule(getModuleForCaixa(caixa));
  }, [caixa, operador]);

  useEffect(() => {
    if (cart.length) return;
    setDescontoEntrada("");
    setDescontoTipo("valor");
  }, [cart.length]);

  const caixaPendenteDiaAnterior = !!caixa?.caixa_pendente_dia_anterior;

  useEffect(() => {
    const handleKeyboardShortcut = (event) => {
      const targetTag = String(event.target?.tagName || "").toUpperCase();
      if (["INPUT", "TEXTAREA", "SELECT"].includes(targetTag) || event.target?.isContentEditable) {
        return;
      }

      if (event.shiftKey && String(event.key || "").toLowerCase() === "p") {
        if (!caixa || caixaPendenteDiaAnterior || activeModule !== "venda" || !cart.length) return;
        if (clienteModalAberto || pagamentoModalAberto) return;

        event.preventDefault();
        imprimirOrcamento();
        return;
      }

      if (event.key !== "F4") return;
      if (!caixa || caixaPendenteDiaAnterior) return;
      if (clienteModalAberto || pagamentoModalAberto || activeModule !== "venda") return;

      event.preventDefault();
      abrirModalCliente();
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [activeModule, caixa, caixaPendenteDiaAnterior, cart, clienteModalAberto, pagamentoModalAberto]);

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
      if (existing) {
        return current.map((item) =>
          item.produto_id === produto.produto_id
            ? { ...item, quantidade: Number(item.quantidade) + quantidadeAdicionar }
            : item,
        );
      }

      return [
        ...current,
        {
          produto_id: produto.produto_id,
          codigo_produto: produto.codigo,
          descricao: produto.descricao,
          quantidade: quantidadeAdicionar,
          valor_unitario: Number(produto.preco_venda || 0),
        },
      ];
    });
    setPagamentosConfirmados(null);
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
      const formasPagamento = Array.isArray(supportData.formasPagamento)
        ? supportData.formasPagamento.filter(Boolean)
        : [];

      setFinanceiroSupportData({
        ...FALLBACK_FINANCEIRO_SUPPORT_DATA,
        ...supportData,
        formasPagamento: formasPagamento.length
          ? formasPagamento
          : FALLBACK_FINANCEIRO_SUPPORT_DATA.formasPagamento,
        formaPagamentoPadrao:
          supportData.formaPagamentoPadrao ||
          formasPagamento.find((item) => item.padrao) ||
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
          const formasPagamento = Array.isArray(cachedSupportData.formasPagamento)
            ? cachedSupportData.formasPagamento.filter(Boolean)
            : [];

          setFinanceiroSupportData({
            ...FALLBACK_FINANCEIRO_SUPPORT_DATA,
            ...cachedSupportData,
            formasPagamento: formasPagamento.length
              ? formasPagamento
              : FALLBACK_FINANCEIRO_SUPPORT_DATA.formasPagamento,
            formaPagamentoPadrao:
              cachedSupportData.formaPagamentoPadrao ||
              formasPagamento.find((item) => item.padrao) ||
              FALLBACK_FINANCEIRO_SUPPORT_DATA.formaPagamentoPadrao,
          });

          return {
            success: true,
            cached: true,
          };
        } catch {
          // segue para o fallback local padrao
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
      text: "Agora escolha se deseja imprimir orçamento, emitir cupom fiscal ou apenas finalizar a venda.",
      icon: "success",
    });
  }

  async function finalizarVenda(modoFinalizacao = "finalizar") {
    try {
      if (!Array.isArray(pagamentosConfirmados) || !pagamentosConfirmados.length) {
        throw new Error("Informe as formas de pagamento antes de concluir a venda.");
      }

      const snapshotOrcamento = {
        items: cart.map((item) => ({ ...item })),
        subtotal,
        desconto: descontoCalculado,
        total,
        cliente: clienteResumo || "Cliente não identificado",
        operador: operador?.nome || caixa?.operador_nome || "Operador",
        data: new Date().toLocaleString("pt-BR"),
      };

      showLoading("Finalizando venda...");
      const result = await api.criarVenda({
        cliente: clienteIdentificado,
        items: cart,
        pagamentos: pagamentosConfirmados,
        subtotal,
        desconto: descontoCalculado,
        totalLiquido: total,
      });
      setCart([]);
      setClienteIdentificado(null);
      setPagamentosConfirmados(null);
      setDescontoEntrada("");
      setDescontoTipo("valor");
      setPagamentoModalAberto(false);

      if (modoFinalizacao === "orcamento") {
        await imprimirOrcamento(snapshotOrcamento);
      }

      showAlert({
        title: "Venda registrada",
        text: result.fiscal?.message || "Venda registrada localmente.",
        icon: result.fiscal?.success ? "success" : "info",
      });
    } catch (error) {
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
      const payload =
        payloadBase || {
          items: cart,
          subtotal,
          desconto: descontoCalculado,
          total,
          cliente: clienteResumo || "Cliente não identificado",
          operador: operador?.nome || caixa?.operador_nome || "Operador",
          data: new Date().toLocaleString("pt-BR"),
        };

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
    } catch (error) {
      showAlert({
        title: "Falha ao imprimir orçamento",
        text: error.message,
        icon: "error",
      });
    }
  }

  async function imprimirOrcamentoComRecebimento() {
    if (!Array.isArray(pagamentosConfirmados) || !pagamentosConfirmados.length) {
      showAlert({
        title: "Pagamento pendente",
        text: "Informe as formas de pagamento antes de imprimir o orçamento.",
        icon: "warning",
      });
      return;
    }

    await imprimirOrcamento({
      items: cart.map((item) => ({ ...item })),
      subtotal,
      desconto: descontoCalculado,
      total,
      cliente: clienteResumo || "Cliente não identificado",
      operador: operador?.nome || caixa?.operador_nome || "Operador",
      data: new Date().toLocaleString("pt-BR"),
    });
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

  async function sincronizarProdutos(full = false) {
    try {
      showLoading("Sincronizando produtos...");
      const result = await api.sincronizarProdutos({ full });
      showAlert({
        title: "Produtos sincronizados",
        text: `${result.imported || 0} produto(s) importado(s) ou atualizado(s).`,
        icon: "success",
      });
    } catch (error) {
      showAlert({
        title: "Falha na sincronização",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  async function sairDoSistema() {
    const confirmed = await askYesNoQuestion(
      "Sair do sistema",
      "Deseja encerrar a sessão do operador atual?",
    );

    if (!confirmed) return;

    setCart([]);
    setClienteIdentificado(null);
    setClienteModalAberto(false);
    setPagamentoModalAberto(false);
    setPagamentosConfirmados(null);
    setDescontoEntrada("");
    setDescontoTipo("valor");
    setOperador(null);
    setActiveModule(getModuleForCaixa(caixa));
  }

  function alternarTelaCheia() {
    if (window.v12Desktop?.toggleFullscreen) {
      window.v12Desktop.toggleFullscreen();
      return;
    }

    showAlert({
      title: "Opcao indisponivel",
      text: "Tela cheia esta disponivel somente no app Electron.",
      icon: "info",
    });
  }

  if (!configStatus) {
    return (
      <div className="setup-shell">
        <div className="login-card">
          <img src={logoPdvWhite} alt="V12 PDV" />
          <h1>Carregando PDV</h1>
          <p>Verificando configuração local do terminal.</p>
        </div>
      </div>
    );
  }

  if (configStatus && !configStatus.configurado) {
    return (
      <SetupLocal
        onConfigured={() => {
          loadInitialData({ silent: true });
        }}
      />
    );
  }

  if (configStatus?.configurado && !operador) {
    return <LoginOperador config={configStatus.config} onLogin={handleOperadorLogin} />;
  }

  async function handleOperadorLogin(operadorData) {
    try {
      showLoading("Verificando caixa...");
      const caixaData = await api.caixaAtual();
      setCaixa(caixaData);
      setActiveModule(getModuleForCaixa(caixaData));
      setOperador(operadorData);
      await carregarFinanceiroSupportData({ silent: true, refresh: true });
    } catch (error) {
      showAlert({
        title: "Falha ao carregar caixa",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  function openModule(module) {
    if (module !== "configuracao" && caixa?.caixa_pendente_dia_anterior && module !== "fechamento") {
      showAlert({
        title: "Fechamento pendente",
        text: `Existe um caixa aberto do dia ${caixa.data_operacional}. Feche esse caixa antes de continuar.`,
        icon: "warning",
      });
      setActiveModule("fechamento");
      return;
    }

    if (!caixa && !["abertura", "configuracao"].includes(module)) {
      showAlert({
        title: "Caixa fechado",
        text: "Abra o caixa antes de acessar esta operação.",
        icon: "info",
      });
      setActiveModule("abertura");
      return;
    }

    setActiveModule(module);
  }

  function handleCaixaAberto(data) {
    setCaixa(data);
    setActiveModule(data?.caixa_pendente_dia_anterior ? "fechamento" : "venda");
  }

  function handleCaixaFechado() {
    setCart([]);
    setClienteIdentificado(null);
    setClienteModalAberto(false);
    setPagamentoModalAberto(false);
    setPagamentosConfirmados(null);
    setDescontoEntrada("");
    setDescontoTipo("valor");
    setCaixa(null);
    setActiveModule("abertura");
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
      text: `${nome} foi vinculado à venda atual.`,
      icon: "success",
    });
  }

  const breadcrumbByModule = {
    abertura: "Caixa > Abertura",
    venda: "Vendas > Registro de item",
    sangria: "Caixa > Sangria",
    suprimento: "Caixa > Suprimento",
    fechamento: "Caixa > Fechamento",
    configuracao: "Sistema > Configuracoes locais",
  };
  const showSaleShortcuts = !caixaPendenteDiaAnterior && !["abertura", "fechamento", "configuracao"].includes(activeModule);
  const breadcrumbAtivo =
    activeModule === "venda" && clienteModalAberto
      ? "Venda > Informar cliente"
      : activeModule === "venda" && clienteIdentificado
        ? "Venda > Cliente identificado"
        : breadcrumbByModule[activeModule];
  const clienteResumo = clienteIdentificado
    ? `${clienteIdentificado.tipoDocumento}: ${clienteIdentificado.documento} - ${clienteIdentificado.nome}`
    : null;
  const vendaProntaParaConclusao = Array.isArray(pagamentosConfirmados) && pagamentosConfirmados.length > 0;
  const formasPagamento = financeiroSupportData?.formasPagamento?.length
    ? financeiroSupportData.formasPagamento
    : FALLBACK_FINANCEIRO_SUPPORT_DATA.formasPagamento;

  return (
    <div className="pdv-shell">
      <header className="pdv-topbar">
        <div className="menu-group">
          <button className="top-menu">
            <FiMenu />
            Menu <small>F2</small>
            <FiChevronDown className="chevron" />
          </button>
          <div className="top-dropdown">
            <button onClick={() => openModule("venda")}><FiShoppingCart /> Nova venda</button>
            <button onClick={() => openModule("sangria")}><FiFileText /> Sangria</button>
            <button onClick={() => openModule("suprimento")}><FiFileText /> Suprimento</button>
            <button onClick={() => openModule("fechamento")}><FiFileText /> Fechamento de caixa</button>
            <button onClick={() => openModule("configuracao")}><FiSettings /> Configuracoes locais</button>
            <button onClick={() => sincronizarProdutos(true)}><FiRefreshCcw /> Sincronizar produtos</button>
            <button onClick={alternarTelaCheia}><FiMaximize2 /> Alternar tela cheia</button>
            <button className="danger-menu" onClick={sairDoSistema}><FiPower /> Sair do sistema</button>
          </div>
        </div>

        <div className="operator-info">
          <span>{configStatus?.config?.terminal_codigo || "PDV: 01"}</span>
          <span>Operador: {operador?.nome || caixa?.operador_nome || "Caixa fechado"}</span>
          <span>{configStatus?.config?.tenant_nome || health?.station || "Caixa 01"}</span>
        </div>

        <div className="menu-group align-right">
          <button className="top-menu fiscal">
            Menu fiscal <small>F12</small>
            <FiChevronDown className="chevron" />
          </button>
          <div className="top-dropdown">
            <button>Status SEFAZ</button>
            <button>Enviar contingencias</button>
            <button>Consultar NFC-e</button>
          </div>
        </div>
      </header>

      <main className="pdv-main">
        <section className={`left-panel ${showSaleShortcuts ? "" : "without-shortcuts"}`}>
          <div className="logo-card">
            <img src={logoPdvWhite} alt="V12 PDV" />
          </div>

          {showSaleShortcuts ? (
            <div className="shortcut-grid">
              <button className="shortcut primary" onClick={() => openModule("venda")}>Registro de item <small>F3</small></button>
              <button className="shortcut" onClick={abrirModalCliente} disabled={vendaProntaParaConclusao}>
                Informar cliente <small>F4</small>
              </button>
              <button className="shortcut" onClick={() => openModule("fechamento")}>Fechamento <small>F5</small></button>
              <button className="shortcut" onClick={() => openModule("sangria")}>Sangria <small>F6</small></button>
              <button className="shortcut" onClick={() => openModule("suprimento")}>Suprimento <small>F7</small></button>
              <button className="shortcut">Consultar produto <small>F8</small></button>
            </div>
          ) : null}

            <div className="entry-card">
            <div className="entry-card-top">
              <div className="breadcrumb">{breadcrumbAtivo}</div>
              {activeModule === "fechamento" && caixa ? (
                <button
                  className="back-to-sale"
                  type="button"
                  disabled={caixaPendenteDiaAnterior}
                  onClick={() => openModule("venda")}
                >
                  Voltar para venda
                </button>
              ) : null}
            </div>
            {clienteResumo ? (
              <div className="customer-chip-row">
                <span className="customer-chip">
                  <FiUser />
                  {clienteResumo}
                </span>
                <button
                  type="button"
                  className="clear-customer"
                  disabled={vendaProntaParaConclusao}
                  onClick={() => {
                    setClienteIdentificado(null);
                    setPagamentosConfirmados(null);
                  }}
                >
                  Limpar
                </button>
              </div>
            ) : null}
            {activeModule === "abertura" ? (
              <AberturaCaixa operador={operador} onOpened={handleCaixaAberto} />
            ) : null}
            {activeModule === "venda" ? (
              <ProdutoSearch onSelect={addProduto} disabled={!caixa || vendaProntaParaConclusao} />
            ) : null}
            {activeModule === "sangria" ? (
              <MovimentoCaixa tipo="sangria" operador={operador} onDone={() => openModule("venda")} />
            ) : null}
            {activeModule === "suprimento" ? (
              <MovimentoCaixa tipo="suprimento" operador={operador} onDone={() => openModule("venda")} />
            ) : null}
            {activeModule === "fechamento" ? (
              <FechamentoCaixa onClosed={handleCaixaFechado} />
            ) : null}
            {activeModule === "configuracao" ? <ConfiguracaoLocal /> : null}
          </div>
        </section>

        <section className="right-panel">
          <div className="receipt-header">
            <strong>V12 ERP</strong>
            <span>PDV Local - NFC-e modelo 65</span>
            <small>{new Date().toLocaleString("pt-BR")}</small>
          </div>

          <VendaResumo
            cart={cart}
            total={total}
            subtotal={subtotal}
            descontoTipo={descontoTipo}
            descontoEntrada={descontoEntrada}
            descontoCalculado={descontoCalculado}
            onDescontoTipoChange={(nextTipo) => {
              setDescontoTipo(nextTipo);
              setPagamentosConfirmados(null);
            }}
            onDescontoEntradaChange={(nextEntrada) => {
              setDescontoEntrada(nextEntrada);
              setPagamentosConfirmados(null);
            }}
            onChange={(nextCart) => {
              setCart(nextCart);
              setPagamentosConfirmados(null);
            }}
            onFinish={iniciarFinalizacaoVenda}
            onPrintBudget={imprimirOrcamentoComRecebimento}
            onIssueCupom={() => finalizarVenda("cupom")}
            onFinalizeSale={() => finalizarVenda("finalizar")}
            onCancelPayment={cancelarPagamentosConfirmados}
            paymentReady={vendaProntaParaConclusao}
            disabled={!caixa || caixaPendenteDiaAnterior || !cart.length}
          />
        </section>
      </main>

      {clienteModalAberto ? (
        <div className="customer-modal-backdrop" onClick={fecharModalCliente}>
          <div className="customer-modal" onClick={(event) => event.stopPropagation()}>
              <div className="customer-modal-header">
              <div>
                <strong>Identificar cliente</strong>
                <p>Use CPF, CNPJ ou documento estrangeiro. O dado fica salvo na venda e já prepara orçamento e NFC-e futura.</p>
              </div>
              <button type="button" className="customer-modal-close" onClick={fecharModalCliente} aria-label="Fechar">
                <FiX />
              </button>
            </div>

            <div className="customer-modal-grid">
              <label>
                Tipo de documento
                <select
                  value={clienteForm.tipoDocumento}
                  onChange={(event) =>
                    setClienteForm((current) => ({ ...current, tipoDocumento: event.target.value }))
                  }
                >
                  <option value="CPF">CPF</option>
                  <option value="CNPJ">CNPJ</option>
                  <option value="ESTRANGEIRO">Estrangeiro</option>
                </select>
              </label>

              <label>
                Documento
                <input
                  value={clienteForm.documento}
                  onChange={(event) =>
                    setClienteForm((current) => ({ ...current, documento: event.target.value }))
                  }
                  placeholder={
                    clienteForm.tipoDocumento === "CPF"
                      ? "000.000.000-00"
                      : clienteForm.tipoDocumento === "CNPJ"
                        ? "00.000.000/0000-00"
                        : "Documento estrangeiro"
                  }
                />
              </label>

              <label className="customer-modal-full">
                Nome
                <input
                  value={clienteForm.nome}
                  onChange={(event) => setClienteForm((current) => ({ ...current, nome: event.target.value }))}
                  placeholder="Nome do cliente ou razão social"
                />
              </label>

              <label className="customer-modal-full">
                Email
                <input
                  value={clienteForm.email}
                  onChange={(event) => setClienteForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="opcional"
                />
              </label>
            </div>

            <div className="customer-modal-actions">
              <button type="button" className="secondary-action" onClick={fecharModalCliente}>
                Cancelar
              </button>
              <button type="button" onClick={salvarClienteIdentificado}>
                Salvar identificação
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <VendaPagamentoModal
        open={pagamentoModalAberto}
        subtotal={subtotal}
        desconto={descontoCalculado}
        total={total}
        formasPagamento={formasPagamento}
        clienteResumo={clienteResumo}
        supportLoading={!financeiroSupportData}
        onClose={() => setPagamentoModalAberto(false)}
        onReceive={confirmarRecebimentoVenda}
      />

      <footer className="pdv-footer">
        <div className="footer-status">
          <span className={caixa ? "dot online" : "dot offline"} />
          {caixa ? "Caixa aberto" : "Caixa fechado"}
          <button onClick={() => loadInitialData()}><FiRefreshCcw /> Atualizar</button>
          <button onClick={() => sincronizarProdutos(false)}><FiWifi /> Sync produtos</button>
        </div>
        <span />
        <button className="footer-brand" onClick={sairDoSistema} title="Sair do sistema">
          <FiPower />
          V12 ERP
        </button>
      </footer>
    </div>
  );
}
