import {
  FiChevronDown,
  FiFileText,
  FiMaximize2,
  FiMenu,
  FiPackage,
  FiPower,
  FiRefreshCcw,
  FiSettings,
  FiShoppingCart,
} from "react-icons/fi";

export function PdvTopBar({
  config,
  health,
  operador,
  caixa,
  syncState,
  openModule,
  carregarHistoricoVendas,
  atualizarPdvCompleto,
  consultarStatusFiscalLocal,
  enviarContingenciasFiscais,
  alternarTelaCheia,
  sairDoSistema,
}) {
  const syncTitle = syncState?.running
    ? "Uma atualização automática está sendo executada em segundo plano."
    : syncState?.lastError
      ? syncState.lastError
      : syncState?.releaseMessage
        ? syncState.releaseMessage
      : "Atualizar PDV agora";

  return (
    <header className="pdv-topbar">
      <div className="menu-group">
        <button className="top-menu">
          <FiMenu />
          Menu <small>F2</small>
          <FiChevronDown className="chevron" />
        </button>
        <div className="top-dropdown">
          <button onClick={() => openModule("venda")}><FiShoppingCart /> Nova venda</button>
          <button onClick={() => openModule("pedidos_pendentes")}><FiPackage /> Pedidos pendentes</button>
          <button onClick={() => openModule("sangria")}><FiFileText /> Sangria</button>
          <button onClick={() => openModule("suprimento")}><FiFileText /> Suprimento</button>
          <button onClick={() => openModule("fechamento")}><FiFileText /> Fechamento de caixa</button>
          <button
            onClick={() => {
              openModule("historico_vendas");
              carregarHistoricoVendas({ keepSelection: false });
            }}
          >
            <FiFileText /> Reimpressão e cancelamento
          </button>
          <button onClick={() => openModule("configuracao")}><FiSettings /> Configurações locais</button>
          <div className="top-dropdown-section">
            <span className="top-dropdown-section-title">Atualizações</span>
            <button
              className={`submenu-button ${syncState?.running ? "sync-running" : ""}`.trim()}
              onClick={() => atualizarPdvCompleto()}
              title={syncTitle}
            >
              <FiRefreshCcw className={syncState?.running ? "spinning-icon" : ""} />
              Atualizar PDV
            </button>
          </div>
          <button onClick={alternarTelaCheia}><FiMaximize2 /> Alternar tela cheia</button>
          <button className="danger-menu" onClick={sairDoSistema}><FiPower /> Sair do sistema</button>
        </div>
      </div>

      <div className="operator-info">
        <span>{config?.terminal_codigo || "PDV: 01"}</span>
        <span>Operador: {operador?.nome || caixa?.operador_nome || "Caixa fechado"}</span>
        <span>{config?.tenant_nome || health?.station || "Caixa 01"}</span>
      </div>

      <div className="menu-group align-right">
        <button className="top-menu fiscal">
          Menu fiscal <small>F12</small>
          <FiChevronDown className="chevron" />
        </button>
        <div className="top-dropdown">
          <button onClick={consultarStatusFiscalLocal}>Status fiscal local</button>
          <button onClick={enviarContingenciasFiscais}>Enviar contingências</button>
          <button
            onClick={() => {
              openModule("historico_vendas");
              carregarHistoricoVendas({ keepSelection: false });
            }}
          >
            Consultar NFC-e
          </button>
        </div>
      </div>
    </header>
  );
}
