import { FiPower, FiRefreshCcw } from "react-icons/fi";

export function PdvFooter({ caixa, syncState, atualizarPdvCompleto, sairDoSistema }) {
  const syncTitle = syncState?.running
    ? "Uma atualização automática está sendo executada em segundo plano."
    : syncState?.lastError
      ? syncState.lastError
      : "Atualizar PDV agora";

  return (
    <footer className="pdv-footer">
      <div className="footer-status">
        <span className={caixa ? "dot online" : "dot offline"} />
        {caixa ? "Caixa aberto" : "Caixa fechado"}
        <button
          onClick={() => atualizarPdvCompleto()}
          className={syncState?.running ? "sync-running" : ""}
          title={syncTitle}
        >
          <FiRefreshCcw className={syncState?.running ? "spinning-icon" : ""} />
          Atualizar PDV
        </button>
      </div>
      <span />
      <button className="footer-brand" onClick={sairDoSistema} title="Sair do sistema">
        <FiPower />
        V12 ERP
      </button>
    </footer>
  );
}
