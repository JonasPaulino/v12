import { FiHeadphones, FiPower, FiRefreshCcw } from "react-icons/fi";

export function PdvFooter({
  caixa,
  syncState,
  supportChatState,
  onOpenSupportChat,
  atualizarPdvCompleto,
  sairDoSistema,
}) {
  const syncTitle = syncState?.running
    ? "Uma atualização automática está sendo executada em segundo plano."
    : syncState?.lastError
      ? syncState.lastError
      : syncState?.releaseMessage
        ? syncState.releaseMessage
      : "Atualizar PDV agora";

  const supportTitle =
    supportChatState?.available
      ? "Abrir chat com o suporte"
      : supportChatState?.reason || "Suporte indisponível no momento";
  const pdvVersion = syncState?.version ? ` ${syncState.version}` : "";

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
          {syncState?.running ? "Atualizando..." : "Atualizar PDV"}
        </button>
      </div>
      <div className="footer-actions">
        <button
          type="button"
          className={`footer-support ${supportChatState?.unread ? "unread" : ""}`}
          onClick={onOpenSupportChat}
          disabled={!supportChatState?.available}
          title={supportTitle}
        >
          <FiHeadphones />
          Falar com suporte
        </button>
        <button className="footer-brand" onClick={sairDoSistema} title="Sair do sistema">
          <FiPower />
          V12 PDV{pdvVersion}
        </button>
      </div>
    </footer>
  );
}
