import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiEdit2,
  FiLogOut,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiTrash2,
} from "react-icons/fi";
import { api } from "../../api.js";
import logoPdvColor from "../../assets/logo_pdv_cor.png";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const PEDIDO_ALLOWED_PROFILES = new Set(["vendedor", "pdv_operador", "pdv_supervisor", "gerente"]);
const REMEMBER_PEDIDO_OPERATOR_KEY = "v12_pedido_remember_operator_email";
const SESSION_PEDIDO_OPERATOR_KEY = "v12_pedido_operador";
const VIEW_MODES = Object.freeze({
  LIST: "list",
  NEW: "new",
  EDIT: "edit",
});

function createEmptyPedidoForm() {
  return {
    cliente_nome: "",
    observacao: "",
  };
}

function normalizeText(value) {
  return String(value || "").trim();
}

function podeLancarPedido(operador) {
  const perfis = Array.isArray(operador?.perfis) ? operador.perfis : [];
  return perfis.some((perfil) => PEDIDO_ALLOWED_PROFILES.has(perfil));
}

export function MobilePedidosApp() {
  const [operador, setOperador] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(SESSION_PEDIDO_OPERATOR_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [loginForm, setLoginForm] = useState({ email: "", senha: "" });
  const [lembrarUsuario, setLembrarUsuario] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState(VIEW_MODES.LIST);
  const [caixaAtual, setCaixaAtual] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [pedidoSearch, setPedidoSearch] = useState("");
  const [pedidoAtualId, setPedidoAtualId] = useState(null);
  const [pedidoMeta, setPedidoMeta] = useState({ numero_pedido: null, referencia: "" });
  const [pedidoForm, setPedidoForm] = useState(createEmptyPedidoForm());
  const [search, setSearch] = useState("");
  const [produtos, setProdutos] = useState([]);
  const [cart, setCart] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const { showAlert, showToast, askYesNoQuestion, promptPasswordChange } = useSweetAlert();

  const total = useMemo(
    () => cart.reduce((acc, item) => acc + Number(item.quantidade || 0) * Number(item.preco_venda || 0), 0),
    [cart],
  );

  const totalItens = useMemo(
    () => cart.reduce((acc, item) => acc + Number(item.quantidade || 0), 0),
    [cart],
  );

  const caixaDisponivel = !!caixaAtual && !caixaAtual.caixa_pendente_dia_anterior;
  const editandoPedido = viewMode === VIEW_MODES.EDIT;

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(REMEMBER_PEDIDO_OPERATOR_KEY) || "";
    if (savedEmail) {
      setLoginForm((current) => ({ ...current, email: savedEmail }));
      setLembrarUsuario(true);
    }
  }, []);

  useEffect(() => {
    if (!operador) return;
    if (podeLancarPedido(operador)) return;

    setOperador(null);
    setCart([]);
    window.localStorage.removeItem(SESSION_PEDIDO_OPERATOR_KEY);
    showAlert({
      title: "Acesso não permitido",
      text: "Seu usuário não possui permissão para lançar pedidos.",
      icon: "warning",
    });
  }, [operador, showAlert]);

  useEffect(() => {
    if (!operador) return undefined;
    if (viewMode === VIEW_MODES.LIST) return undefined;

    const timer = window.setTimeout(async () => {
      try {
        setLoadingProdutos(true);
        const data = await api.produtos(search, {
          strategy: "mobile",
          limit: search.trim() ? 20 : 15,
        });
        setProdutos(Array.isArray(data) ? data : []);
      } catch (error) {
        showAlert({
          title: "Falha ao buscar produtos",
          text: error.message,
          icon: "error",
        });
      } finally {
        setLoadingProdutos(false);
      }
    }, search.trim() ? 280 : 120);

    return () => window.clearTimeout(timer);
  }, [operador, search, showAlert, viewMode]);

  useEffect(() => {
    if (!operador) return;
    void carregarDashboardPedidos({ silent: true });
  }, [operador]);

  useEffect(() => {
    if (!operador) return undefined;
    if (viewMode !== VIEW_MODES.LIST) return undefined;

    const timer = window.setTimeout(() => {
      void carregarDashboardPedidos({ silent: true });
    }, 260);

    return () => window.clearTimeout(timer);
  }, [operador, pedidoSearch, viewMode]);

  async function carregarDashboardPedidos({ silent = false } = {}) {
    try {
      if (!silent) {
        setLoadingPedidos(true);
      }

      const [caixa, pedidosDia] = await Promise.all([
        api.caixaAtual(),
        api.pedidos({
          search: pedidoSearch,
          limit: 60,
        }),
      ]);

      setCaixaAtual(caixa || null);
      setPedidos(Array.isArray(pedidosDia) ? pedidosDia : []);
      return {
        caixa: caixa || null,
        pedidos: Array.isArray(pedidosDia) ? pedidosDia : [],
      };
    } catch (error) {
      if (!silent) {
        showAlert({
          title: "Falha ao carregar pedidos",
          text: error.message,
          icon: "error",
        });
      }
      return null;
    } finally {
      if (!silent) {
        setLoadingPedidos(false);
      }
    }
  }

  function persistRememberedEmail(value) {
    const normalizedEmail = String(value || "").trim().toLowerCase();
    if (lembrarUsuario && normalizedEmail) {
      window.localStorage.setItem(REMEMBER_PEDIDO_OPERATOR_KEY, normalizedEmail);
      return;
    }

    window.localStorage.removeItem(REMEMBER_PEDIDO_OPERATOR_KEY);
  }

  async function login(event) {
    event.preventDefault();

    try {
      setLoading(true);
      const data = await api.loginOperador(loginForm);
      if (data?.primeiro_acesso_pendente) {
        const passwordResult = await promptPasswordChange();
        if (!passwordResult?.password) {
          return;
        }

        setLoading(true);
        await api.trocarSenhaPrimeiroAcesso({
          email: loginForm.email,
          senha_atual: loginForm.senha,
          nova_senha: passwordResult.password,
        });

        setLoginForm((current) => ({
          ...current,
          senha: "",
        }));
        showAlert({
          title: "Senha atualizada",
          text: "Entre novamente usando a nova senha para continuar.",
          icon: "success",
        });
        return;
      }

      if (!podeLancarPedido(data)) {
        showAlert({
          title: "Acesso não permitido",
          text: "Seu usuário não possui permissão para lançar pedidos.",
          icon: "warning",
        });
        return;
      }

      persistRememberedEmail(loginForm.email);
      setOperador(data);
      setViewMode(VIEW_MODES.LIST);
      window.localStorage.setItem(SESSION_PEDIDO_OPERATOR_KEY, JSON.stringify(data));
    } catch (error) {
      showAlert({
        title: "Falha no login",
        text: error.message,
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setOperador(null);
    setViewMode(VIEW_MODES.LIST);
    setPedidoAtualId(null);
    setPedidoMeta({ numero_pedido: null, referencia: "" });
    setPedidoForm(createEmptyPedidoForm());
    setCart([]);
    setSearch("");
    setProdutos([]);
    setCaixaAtual(null);
    setPedidos([]);
    window.localStorage.removeItem(SESSION_PEDIDO_OPERATOR_KEY);
  }

  function resetEditorState() {
    setPedidoAtualId(null);
    setPedidoMeta({ numero_pedido: null, referencia: "" });
    setPedidoForm(createEmptyPedidoForm());
    setCart([]);
    setSearch("");
    setProdutos([]);
  }

  function voltarParaLista() {
    resetEditorState();
    setViewMode(VIEW_MODES.LIST);
  }

  async function abrirNovoPedido() {
    if (!caixaDisponivel) {
      showAlert({
        title: "Caixa fechado",
        text: "Abra o caixa no PDV antes de lançar novos pedidos.",
        icon: "warning",
      });
      return;
    }

    try {
      setLoading(true);
      const data = await api.proximoNumeroPedido();
      resetEditorState();
      setPedidoMeta({
        numero_pedido: Number(data?.numero_pedido || 0),
        referencia: data?.referencia || "",
      });
      setViewMode(VIEW_MODES.NEW);
    } catch (error) {
      showAlert({
        title: "Falha ao iniciar pedido",
        text: error.message,
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function editarPedido(pedidoId) {
    if (!caixaDisponivel) {
      showAlert({
        title: "Caixa fechado",
        text: "Abra o caixa no PDV antes de alterar pedidos.",
        icon: "warning",
      });
      return;
    }

    try {
      setLoading(true);
      const data = await api.pedidoDetalhe(pedidoId);
      setPedidoAtualId(Number(data.pedido_id));
      setPedidoMeta({
        numero_pedido: Number(data.numero_pedido || data.pedido_id || 0),
        referencia: data.referencia_formatada || data.referencia || "",
      });
      setPedidoForm({
        cliente_nome: data.cliente_nome || "",
        observacao: data.observacao || "",
      });
      setCart(
        Array.isArray(data.itens)
          ? data.itens.map((item) => ({
              produto_id: Number(item.produto_id),
              codigo: item.codigo_produto || "",
              descricao: item.descricao || "",
              unidade: item.unidade || "UN",
              preco_venda: Number(item.valor_unitario || 0),
              quantidade: Number(item.quantidade || 0),
              observacao: item.observacao || "",
            }))
          : [],
      );
      setSearch("");
      setViewMode(VIEW_MODES.EDIT);
    } catch (error) {
      showAlert({
        title: "Falha ao abrir pedido",
        text: error.message,
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function excluirPedido(pedido) {
    const confirmed = await askYesNoQuestion(
      "Excluir pedido",
      `Deseja excluir ${pedido.referencia_formatada || pedido.referencia}?`,
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await api.cancelarPedido(pedido.pedido_id);
      await carregarDashboardPedidos({ silent: true });
      showToast({
        title: "Pedido excluído",
        text: "O pedido foi retirado da fila de lançamento.",
        icon: "success",
        position: "top",
      });
    } catch (error) {
      showAlert({
        title: "Falha ao excluir pedido",
        text: error.message,
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  function addProduto(produto) {
    setCart((current) => {
      const existing = current.find((item) => Number(item.produto_id) === Number(produto.produto_id));
      if (existing) {
        return current.map((item) =>
          Number(item.produto_id) === Number(produto.produto_id)
            ? { ...item, quantidade: Number(item.quantidade || 0) + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          produto_id: produto.produto_id,
          codigo: produto.codigo || "",
          descricao: produto.descricao,
          unidade: produto.unidade || "UN",
          preco_venda: Number(produto.preco_venda || 0),
          quantidade: 1,
          observacao: "",
        },
      ];
    });
    setSearch("");
  }

  function updateQuantidade(produtoId, delta) {
    setCart((current) =>
      current
        .map((item) =>
          Number(item.produto_id) === Number(produtoId)
            ? { ...item, quantidade: Math.max(0, Number(item.quantidade || 0) + delta) }
            : item,
        )
        .filter((item) => Number(item.quantidade || 0) > 0),
    );
  }

  function updateItemObservacao(produtoId, observacao) {
    setCart((current) =>
      current.map((item) =>
        Number(item.produto_id) === Number(produtoId) ? { ...item, observacao } : item,
      ),
    );
  }

  async function salvarPedido() {
    if (!caixaDisponivel) {
      showAlert({
        title: "Caixa fechado",
        text: "Abra o caixa no PDV antes de enviar pedidos.",
        icon: "warning",
      });
      return;
    }

    if (!cart.length) {
      showAlert({
        title: "Pedido vazio",
        text: "Adicione ao menos um item antes de enviar.",
        icon: "warning",
      });
      return;
    }

    const confirmed = await askYesNoQuestion(
      editandoPedido ? "Atualizar pedido" : "Enviar pedido",
      editandoPedido
        ? `Salvar alterações de ${pedidoMeta.referencia || "pedido"}?`
        : `Enviar ${totalItens} item(ns) para o caixa?`,
    );
    if (!confirmed) return;

    const payload = {
      operador_id: operador.operador_id,
      operador_nome: operador.nome,
      cliente_nome: normalizeText(pedidoForm.cliente_nome),
      observacao: normalizeText(pedidoForm.observacao),
      itens: cart.map((item) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        observacao: normalizeText(item.observacao),
      })),
    };

    try {
      setLoading(true);
      if (editandoPedido) {
        await api.atualizarPedido(pedidoAtualId, payload);
      } else {
        await api.criarPedido(payload);
      }

      await carregarDashboardPedidos({ silent: true });
      voltarParaLista();
      showToast({
        title: editandoPedido ? "Pedido atualizado" : "Pedido enviado",
        text: "O pedido já está disponível no caixa.",
        icon: "success",
        position: "top",
      });
    } catch (error) {
      showAlert({
        title: editandoPedido ? "Falha ao atualizar pedido" : "Falha ao enviar pedido",
        text: error.message,
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!operador) {
    return (
      <div className="mobile-order-shell">
        <form className="mobile-login-card" onSubmit={login}>
          <img src={logoPdvColor} alt="V12 PDV" />
          <h1>Acesso do vendedor</h1>
          <label>
            E-mail
            <input
              value={loginForm.email}
              onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="usuario@empresa.com.br"
              autoComplete="username"
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={loginForm.senha}
              onChange={(event) => setLoginForm((current) => ({ ...current, senha: event.target.value }))}
              placeholder="Senha"
              autoComplete="current-password"
            />
          </label>
          <label className="remember-operator">
            <input
              type="checkbox"
              checked={lembrarUsuario}
              onChange={(event) => setLembrarUsuario(event.target.checked)}
            />
            Lembrar usuário neste aparelho
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mobile-order-app">
      <header className="mobile-order-header">
        <img src={logoPdvColor} alt="V12 PDV" />
        <div>
          <strong>Pedidos</strong>
          <span>{operador.nome}</span>
        </div>
        <button type="button" onClick={logout} aria-label="Sair">
          <FiLogOut />
        </button>
      </header>

      <main className="mobile-order-main">
        {viewMode === VIEW_MODES.LIST ? (
          <>
            <section className="mobile-order-panel mobile-order-panel-hero">
              <div className="mobile-order-hero-top">
                <div className="mobile-order-hero-summary">
                  <span className="mobile-panel-kicker">Pedidos do dia</span>
                  <div className="mobile-order-hero-title-row">
                    <strong>{pedidos.length} pedido(s)</strong>
                    <span className={`mobile-order-inline-status ${caixaDisponivel ? "open" : "closed"}`}>
                      {caixaDisponivel ? "Caixa aberto" : "Caixa fechado"}
                    </span>
                  </div>
                  <small>
                    {caixaDisponivel
                      ? "Caixa aberto para receber pedidos."
                      : "Caixa fechado. Novos pedidos ficam bloqueados."}
                  </small>
                </div>
                <button
                  type="button"
                  className="mobile-order-refresh-button"
                  onClick={() => void carregarDashboardPedidos()}
                  disabled={loadingPedidos || loading}
                  aria-label="Atualizar pedidos"
                >
                  <FiRefreshCw />
                </button>
              </div>

              <div className="mobile-order-hero-actions">
                <button type="button" onClick={() => void abrirNovoPedido()} disabled={!caixaDisponivel || loading}>
                  <FiPlus />
                  Novo pedido
                </button>
              </div>
            </section>

            {!caixaDisponivel ? (
              <section className="mobile-order-panel mobile-order-alert">
                Abra o caixa no PDV principal antes de registrar pedidos por este aparelho.
              </section>
            ) : null}

            <section className="mobile-order-panel mobile-order-list-panel">
              <div className="mobile-order-list-header">
                <strong>Buscar pedido</strong>
              </div>
              <div className="mobile-search-box">
                <FiSearch />
                <input
                  value={pedidoSearch}
                  onChange={(event) => setPedidoSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void carregarDashboardPedidos();
                    }
                  }}
                  placeholder="Número, cliente ou vendedor"
                />
              </div>

              <div className="mobile-order-list">
                {pedidos.length ? (
                  pedidos.map((pedido) => (
                    <article className="mobile-order-card" key={pedido.pedido_id}>
                      <div className="mobile-order-card-top">
                        <div>
                          <strong>{pedido.referencia_formatada || pedido.referencia}</strong>
                          <small>{pedido.operador_nome || "Sem operador"}</small>
                        </div>
                        <span className={`mobile-order-status ${pedido.status}`}>{pedido.status}</span>
                      </div>

                      <div className="mobile-order-card-middle">
                        <span>{pedido.cliente_nome || "Sem cliente informado"}</span>
                        <strong>{formatCurrency(pedido.total_liquido)}</strong>
                      </div>

                      <div className="mobile-order-card-bottom">
                        <small>{pedido.total_itens} item(ns)</small>
                        {pedido.editavel ? (
                          <div className="mobile-order-card-actions">
                            <button type="button" className="ghost" onClick={() => void editarPedido(pedido.pedido_id)}>
                              <FiEdit2 />
                              Editar
                            </button>
                            <button type="button" className="ghost danger" onClick={() => void excluirPedido(pedido)}>
                              <FiTrash2 />
                              Excluir
                            </button>
                          </div>
                        ) : (
                          <small>{pedido.status === "importado" ? "Já enviado ao caixa" : "Sem edição"}</small>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="mobile-empty-state">
                    Nenhum pedido encontrado para hoje.
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="mobile-order-panel mobile-order-editor-head">
              <button type="button" className="mobile-back-button" onClick={voltarParaLista}>
                <FiArrowLeft />
                Voltar para lista
              </button>

              <div className="mobile-editor-reference">
                <span className="mobile-panel-kicker">{editandoPedido ? "Editar pedido" : "Novo pedido"}</span>
                <strong>{pedidoMeta.referencia || "Carregando..."}</strong>
                <small>
                  {pedidoMeta.numero_pedido
                    ? `Sequência ${String(pedidoMeta.numero_pedido).padStart(4, "0")}`
                    : "Sequência automática"}
                </small>
              </div>
            </section>

            <section className="mobile-order-panel">
              <label>
                Cliente
                <input
                  value={pedidoForm.cliente_nome}
                  onChange={(event) =>
                    setPedidoForm((current) => ({ ...current, cliente_nome: event.target.value }))
                  }
                  placeholder="Nome do cliente"
                />
              </label>
              <label>
                Observação
                <textarea
                  value={pedidoForm.observacao}
                  onChange={(event) =>
                    setPedidoForm((current) => ({ ...current, observacao: event.target.value }))
                  }
                  placeholder="Observação geral do pedido"
                />
              </label>
            </section>

            <section className="mobile-order-panel">
              <label>
                Buscar item
                <div className="mobile-search-box">
                  <FiSearch />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Digite código ou descrição"
                  />
                </div>
              </label>
              <div className="mobile-products-caption">
                {search.trim()
                  ? `${produtos.length} item(ns) encontrado(s)`
                  : "Exibindo os itens mais vendidos. Digite para filtrar."}
              </div>
              <div className="mobile-product-list">
                {loadingProdutos ? (
                  <div className="mobile-empty-state">Buscando itens...</div>
                ) : produtos.length ? (
                  produtos.map((produto) => (
                    <button type="button" key={produto.produto_id} onClick={() => addProduto(produto)}>
                      <span className="mobile-product-main">
                        <strong>{produto.descricao}</strong>
                        <small>{produto.codigo || "Sem código"} · {produto.unidade || "UN"}</small>
                      </span>
                      <strong className="price">{formatCurrency(produto.preco_venda)}</strong>
                      <span className="add-icon">
                        <FiPlus />
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="mobile-empty-state">Nenhum item encontrado.</div>
                )}
              </div>
            </section>

            <section className="mobile-order-panel mobile-cart-panel">
              <div className="mobile-cart-title">
                <strong>Itens do pedido</strong>
                <span>{totalItens} item(ns)</span>
              </div>

              <div className="mobile-cart-list">
                {cart.length ? (
                  cart.map((item) => (
                    <div className="mobile-cart-item" key={item.produto_id}>
                      <div className="mobile-cart-item-top">
                        <span>
                          <strong>{item.descricao}</strong>
                          <small>{item.codigo || "Sem código"} · {item.unidade}</small>
                        </span>
                        <strong>{formatCurrency(Number(item.quantidade) * Number(item.preco_venda))}</strong>
                      </div>

                      <div className="mobile-cart-item-actions">
                        <button type="button" onClick={() => updateQuantidade(item.produto_id, -1)}>
                          -
                        </button>
                        <strong>{item.quantidade}</strong>
                        <button type="button" onClick={() => updateQuantidade(item.produto_id, 1)}>
                          +
                        </button>
                        <button type="button" className="remove" onClick={() => updateQuantidade(item.produto_id, -9999)}>
                          <FiTrash2 />
                        </button>
                      </div>

                      <input
                        value={item.observacao}
                        onChange={(event) => updateItemObservacao(item.produto_id, event.target.value)}
                        placeholder="Observação do item"
                      />
                    </div>
                  ))
                ) : (
                  <div className="mobile-empty-state">Nenhum item lançado.</div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {viewMode !== VIEW_MODES.LIST ? (
        <footer className="mobile-order-footer">
          <div>
            <span>Total</span>
            <strong>{formatCurrency(total)}</strong>
          </div>
          <button type="button" disabled={!cart.length || loading} onClick={() => void salvarPedido()}>
            <FiSend />
            {loading ? (editandoPedido ? "Salvando..." : "Enviando...") : editandoPedido ? "Salvar pedido" : "Enviar pedido"}
          </button>
        </footer>
      ) : null}
    </div>
  );
}
