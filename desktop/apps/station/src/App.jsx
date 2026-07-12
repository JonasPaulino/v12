import { useRef } from "react";
import { FiUser } from "react-icons/fi";
import { AberturaCaixa } from "./components/caixa/AberturaCaixa.jsx";
import { FechamentoCaixa } from "./components/caixa/FechamentoCaixa.jsx";
import { MovimentoCaixa } from "./components/caixa/MovimentoCaixa.jsx";
import { CustomerIdentificationModal } from "./components/CustomerIdentificationModal.jsx";
import { ProdutoSearch } from "./components/ProdutoSearch.jsx";
import { VendaResumo } from "./components/VendaResumo.jsx";
import { ConfiguracaoLocal } from "./components/configuracao/ConfiguracaoLocal.jsx";
import { PdvFooter } from "./components/layout/PdvFooter.jsx";
import { PdvTopBar } from "./components/layout/PdvTopBar.jsx";
import { VendaPagamentoModal } from "./components/pagamento/VendaPagamentoModal.jsx";
import { LoginOperador } from "./components/setup/LoginOperador.jsx";
import { SetupLocal } from "./components/setup/SetupLocal.jsx";
import { HistoricoVendaDetalhe } from "./components/vendas/HistoricoVendaDetalhe.jsx";
import { HistoricoVendas } from "./components/vendas/HistoricoVendas.jsx";
import { BREADCRUMB_BY_MODULE } from "./constants/pdv.js";
import { usePdvHistorico } from "./hooks/usePdvHistorico.js";
import { usePdvSession } from "./hooks/usePdvSession.js";
import { usePdvShortcuts } from "./hooks/usePdvShortcuts.js";
import { usePdvVenda } from "./hooks/usePdvVenda.js";
import logoPdvWhite from "./assets/logo_pdv_branca.png";

export default function App() {
  const vendaBridgeRef = useRef({
    resetVendaState: () => {},
    carregarFinanceiroSupportData: async () => ({ success: true }),
  });

  const session = usePdvSession({
    onResetVenda: () => vendaBridgeRef.current.resetVendaState(),
    onCarregarFinanceiroSupportData: (payload) =>
      vendaBridgeRef.current.carregarFinanceiroSupportData(payload),
  });

  const venda = usePdvVenda({
    config: session.configStatus?.config,
    operador: session.operador,
    caixa: session.caixa,
    activeModule: session.activeModule,
    caixaPendenteDiaAnterior: session.caixaPendenteDiaAnterior,
  });

  vendaBridgeRef.current = venda;

  const historico = usePdvHistorico({
    config: session.configStatus?.config,
    operador: session.operador,
    caixa: session.caixa,
    onPrintBudget: venda.imprimirOrcamento,
  });

  function handleFocarConsultaProduto() {
    if (session.activeModule !== "venda") {
      session.openModule("venda");
      window.requestAnimationFrame(() => {
        venda.focarConsultaProduto();
      });
      return;
    }

    venda.focarConsultaProduto();
  }

  usePdvShortcuts({
    activeModule: session.activeModule,
    caixa: session.caixa,
    caixaPendenteDiaAnterior: session.caixaPendenteDiaAnterior,
    cartLength: venda.cart.length,
    clienteModalAberto: venda.clienteModalAberto,
    pagamentoModalAberto: venda.pagamentoModalAberto,
    vendaProntaParaConclusao: venda.vendaProntaParaConclusao,
    openModule: session.openModule,
    abrirModalCliente: venda.abrirModalCliente,
    focarConsultaProduto: handleFocarConsultaProduto,
    abrirPagamentoVenda: venda.abrirPagamentoVenda,
    imprimirOrcamento: venda.imprimirOrcamento,
  });

  if (!session.configStatus) {
    return (
      <div className="setup-shell">
        <div className="login-card">
          <img src={logoPdvWhite} alt="V12 PDV" />
          <h1>Carregando PDV</h1>
          <p>Verificando configuracao local do terminal.</p>
        </div>
      </div>
    );
  }

  if (!session.configStatus.configurado) {
    return (
      <SetupLocal
        onConfigured={() => {
          session.loadInitialData({ silent: true });
        }}
      />
    );
  }

  if (!session.operador) {
    return (
      <LoginOperador
        config={session.configStatus.config}
        onLogin={session.handleOperadorLogin}
      />
    );
  }

  const breadcrumbAtivo =
    session.activeModule === "venda" && venda.clienteModalAberto
      ? "Venda > Informar cliente"
      : session.activeModule === "venda" && venda.clienteIdentificado
        ? "Venda > Cliente identificado"
        : BREADCRUMB_BY_MODULE[session.activeModule];

  const showSaleShortcuts =
    !session.caixaPendenteDiaAnterior &&
    !["abertura", "fechamento", "configuracao", "historico_vendas"].includes(session.activeModule);

  const showBackToSale =
    Boolean(session.caixa) &&
    ["fechamento", "configuracao", "historico_vendas", "sangria", "suprimento"].includes(session.activeModule);

  return (
    <div className="pdv-shell">
      <PdvTopBar
        config={session.configStatus?.config}
        health={session.health}
        operador={session.operador}
        caixa={session.caixa}
        openModule={session.openModule}
        carregarHistoricoVendas={historico.carregarHistoricoVendas}
        atualizarPdvCompleto={session.atualizarPdvCompleto}
        alternarTelaCheia={session.alternarTelaCheia}
        sairDoSistema={session.sairDoSistema}
      />

      <main className="pdv-main">
        <section className={`left-panel ${showSaleShortcuts ? "" : "without-shortcuts"}`}>
          <div className="logo-card">
            <img src={logoPdvWhite} alt="V12 PDV" />
          </div>

          {showSaleShortcuts ? (
            <div className="shortcut-grid">
              <button className="shortcut primary" onClick={() => session.openModule("venda")}>Registro de item <small>F3</small></button>
              <button className="shortcut" onClick={venda.abrirModalCliente} disabled={venda.vendaProntaParaConclusao}>
                Informar cliente <small>F4</small>
              </button>
              <button className="shortcut" onClick={() => session.openModule("fechamento")}>Fechamento <small>F5</small></button>
              <button className="shortcut" onClick={() => session.openModule("sangria")}>Sangria <small>F6</small></button>
              <button className="shortcut" onClick={() => session.openModule("suprimento")}>Suprimento <small>F7</small></button>
              <button className="shortcut" onClick={handleFocarConsultaProduto}>Consultar produto <small>F8</small></button>
            </div>
          ) : null}

          <div className="entry-card">
            <div className="entry-card-top">
              <div className="breadcrumb">{breadcrumbAtivo}</div>
              {showBackToSale ? (
                <button
                  className="back-to-sale"
                  type="button"
                  disabled={session.activeModule === "fechamento" && session.caixaPendenteDiaAnterior}
                  onClick={() => session.openModule("venda")}
                >
                  Voltar para venda
                </button>
              ) : null}
            </div>

            {session.activeModule === "venda" && venda.clienteResumo ? (
              <div className="customer-chip-row">
                <span className="customer-chip">
                  <FiUser />
                  {venda.clienteResumo}
                </span>
                <button
                  type="button"
                  className="clear-customer"
                  disabled={venda.vendaProntaParaConclusao}
                  onClick={() => {
                    venda.setClienteIdentificado(null);
                    venda.setPagamentosConfirmados(null);
                  }}
                >
                  Limpar
                </button>
              </div>
            ) : null}

            {session.activeModule === "abertura" ? (
              <AberturaCaixa operador={session.operador} onOpened={session.handleCaixaAberto} />
            ) : null}

            {session.activeModule === "venda" ? (
              <ProdutoSearch
                ref={venda.productSearchRef}
                onSelect={venda.addProduto}
                disabled={!session.caixa || venda.vendaProntaParaConclusao}
              />
            ) : null}

            {session.activeModule === "sangria" ? (
              <MovimentoCaixa
                tipo="sangria"
                operador={session.operador}
                onDone={() => session.openModule("venda")}
              />
            ) : null}

            {session.activeModule === "suprimento" ? (
              <MovimentoCaixa
                tipo="suprimento"
                operador={session.operador}
                onDone={() => session.openModule("venda")}
              />
            ) : null}

            {session.activeModule === "fechamento" ? (
              <FechamentoCaixa onClosed={session.handleCaixaFechado} />
            ) : null}

            {session.activeModule === "configuracao" ? <ConfiguracaoLocal /> : null}

            {session.activeModule === "historico_vendas" ? (
              <HistoricoVendas
                search={historico.historicoBusca}
                status={historico.historicoStatus}
                vendas={historico.historicoVendas}
                loading={historico.historicoLoading}
                selectedVendaId={historico.historicoVendaSelecionadaId}
                onSearchChange={historico.setHistoricoBusca}
                onStatusChange={historico.setHistoricoStatus}
                onRefresh={() => historico.carregarHistoricoVendas({ keepSelection: true })}
                onSelect={historico.carregarHistoricoVendaDetalhe}
              />
            ) : null}
          </div>
        </section>

        <section className="right-panel">
          {session.activeModule === "historico_vendas" ? (
            <HistoricoVendaDetalhe
              venda={historico.historicoVendaDetalhe}
              loading={historico.historicoLoading}
              config={session.configStatus?.config}
              onRefresh={() =>
                historico.historicoVendaSelecionadaId
                  ? historico.carregarHistoricoVendaDetalhe(historico.historicoVendaSelecionadaId)
                  : historico.carregarHistoricoVendas({ keepSelection: true })
              }
              onReprint={historico.reimprimirVendaHistorico}
              onCancel={historico.cancelarVendaHistorico}
            />
          ) : (
            <>
              <div className="receipt-header">
                <strong>V12 ERP</strong>
                <span>PDV Local - NFC-e modelo 65</span>
                <small>{new Date().toLocaleString("pt-BR")}</small>
              </div>

              <VendaResumo
                cart={venda.cart}
                total={venda.total}
                subtotal={venda.subtotal}
                descontoTipo={venda.descontoTipo}
                descontoEntrada={venda.descontoEntrada}
                descontoCalculado={venda.descontoCalculado}
                onDescontoTipoChange={(nextTipo) => {
                  venda.setDescontoTipo(nextTipo);
                  venda.setPagamentosConfirmados(null);
                }}
                onDescontoEntradaChange={(nextEntrada) => {
                  venda.setDescontoEntrada(nextEntrada);
                  venda.setPagamentosConfirmados(null);
                }}
                onChange={(nextCart) => {
                  venda.setCart(nextCart);
                  venda.setPagamentosConfirmados(null);
                }}
                onFinish={venda.iniciarFinalizacaoVenda}
                onPrintBudget={venda.imprimirOrcamentoComRecebimento}
                onIssueCupom={() => venda.finalizarVenda("cupom")}
                onFinalizeSale={() => venda.finalizarVenda("finalizar")}
                onCancelPayment={venda.cancelarPagamentosConfirmados}
                paymentReady={venda.vendaProntaParaConclusao}
                disabled={!session.caixa || session.caixaPendenteDiaAnterior || !venda.cart.length}
              />
            </>
          )}
        </section>
      </main>

      <CustomerIdentificationModal
        open={venda.clienteModalAberto}
        clienteForm={venda.clienteForm}
        onChange={(patch) => venda.setClienteForm((current) => ({ ...current, ...patch }))}
        onClose={venda.fecharModalCliente}
        onSave={venda.salvarClienteIdentificado}
      />

      <VendaPagamentoModal
        open={venda.pagamentoModalAberto}
        subtotal={venda.subtotal}
        desconto={venda.descontoCalculado}
        total={venda.total}
        formasPagamento={venda.formasPagamento}
        clienteResumo={venda.clienteResumo}
        supportLoading={!venda.financeiroSupportData}
        onClose={() => venda.setPagamentoModalAberto(false)}
        onReceive={venda.confirmarRecebimentoVenda}
      />

      <PdvFooter
        caixa={session.caixa}
        atualizarPdvCompleto={session.atualizarPdvCompleto}
        sairDoSistema={session.sairDoSistema}
      />
    </div>
  );
}
