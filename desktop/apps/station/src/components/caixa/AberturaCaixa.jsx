import { useContext, useState } from "react";
import { api } from "../../api.js";
import { AppContext } from "../../context/AppContext.jsx";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";

export function AberturaCaixa({ operador, onOpened }) {
  const [valor, setValor] = useState("0.00");
  const [observacao, setObservacao] = useState("");
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();

  async function abrir(event) {
    event.preventDefault();
    try {
      showLoading("Abrindo caixa...");
      const caixa = await api.abrirCaixa({
        operador_id: operador?.operador_id,
        valor_abertura: valor,
        observacao,
      });
      showAlert({
        title: caixa?.reaberto ? "Caixa reaberto" : "Caixa aberto",
        text: caixa?.reaberto
          ? "O caixa do dia foi reaberto para ajustes e novas operações."
          : "Fundo de troco registrado.",
        icon: "success",
      });
      onOpened(caixa);
    } catch (error) {
      showAlert({ title: "Falha ao abrir caixa", text: error.message, icon: "error" });
    } finally {
      hideLoading();
    }
  }

  return (
    <form className="cash-flow-module" onSubmit={abrir}>
      <div className="cash-flow-head">
        <strong>Abertura do caixa</strong>
        <span>Informe o fundo de troco existente na gaveta antes de iniciar vendas.</span>
      </div>

      <div className="cash-flow-grid">
        <div className="cash-flow-info">
          <small>Operador</small>
          <strong>{operador?.nome || "Operador"}</strong>
        </div>
        <div className="cash-flow-info">
          <small>Data</small>
          <strong>{new Date().toLocaleDateString("pt-BR")}</strong>
        </div>
      </div>

      <label>
        Saldo inicial / fundo de troco
        <input value={valor} onChange={(event) => setValor(event.target.value)} autoFocus />
      </label>

      <label>
        Observação
        <input value={observacao} onChange={(event) => setObservacao(event.target.value)} />
      </label>

      <button type="submit">Abrir caixa</button>
    </form>
  );
}
