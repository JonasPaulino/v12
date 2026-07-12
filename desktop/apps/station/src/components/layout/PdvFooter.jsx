import { FiPower, FiRefreshCcw } from "react-icons/fi";

export function PdvFooter({ caixa, atualizarPdvCompleto, sairDoSistema }) {
  return (
    <footer className="pdv-footer">
      <div className="footer-status">
        <span className={caixa ? "dot online" : "dot offline"} />
        {caixa ? "Caixa aberto" : "Caixa fechado"}
        <button onClick={atualizarPdvCompleto}><FiRefreshCcw /> Atualizar PDV</button>
      </div>
      <span />
      <button className="footer-brand" onClick={sairDoSistema} title="Sair do sistema">
        <FiPower />
        V12 ERP
      </button>
    </footer>
  );
}
