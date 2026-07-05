import { useContext, useState } from "react";
import { api } from "../api.js";
import { AppContext } from "../context/AppContext.jsx";
import { useSweetAlert } from "../context/SweetAlertContext.jsx";

export function CaixaPanel({ caixa, operador, onChange }) {
  const [valor, setValor] = useState("0.00");
  const [observacao, setObservacao] = useState("");
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();

  async function abrir() {
    try {
      showLoading("Abrindo caixa...");
      const data = await api.abrirCaixa({
        operador_id: operador?.operador_id,
        valor_abertura: valor,
        observacao,
      });
      onChange(data);
      showAlert({ title: "Caixa aberto", text: "Caixa aberto com sucesso.", icon: "success" });
    } catch (error) {
      showAlert({ title: "Falha ao abrir caixa", text: error.message, icon: "error" });
    } finally {
      hideLoading();
    }
  }

  async function fechar() {
    const confirmed = await askYesNoQuestion(
      "Fechar caixa",
      "Deseja realmente fechar o caixa atual?",
    );
    if (!confirmed) return;

    try {
      showLoading("Fechando caixa...");
      const data = await api.fecharCaixa({ valor_fechamento: valor, observacao });
      onChange(data);
      showAlert({ title: "Caixa fechado", text: "Caixa fechado com sucesso.", icon: "success" });
    } catch (error) {
      showAlert({ title: "Falha ao fechar caixa", text: error.message, icon: "error" });
    } finally {
      hideLoading();
    }
  }

  return (
    <div className="cash-module">
      {caixa ? (
        <>
          <div className="cash-summary">
            <strong>Caixa aberto</strong>
            <span>{caixa.operador_nome}</span>
            <small>{caixa.sessao_codigo}</small>
            <small>Abertura: R$ {Number(caixa.valor_abertura || 0).toFixed(2)}</small>
          </div>
          <label>
            Valor fechamento
            <input value={valor} onChange={(event) => setValor(event.target.value)} />
          </label>
          <button className="danger" onClick={fechar}>Fechar caixa</button>
        </>
      ) : (
        <>
          <div className="cash-summary closed-summary">
            <strong>Caixa fechado</strong>
            <span>Abra o caixa para iniciar vendas.</span>
          </div>
          <div className="cash-summary operator-summary">
            <strong>Operador</strong>
            <span>{operador?.nome || "Operador nao identificado"}</span>
          </div>
          <label>
            Valor abertura
            <input value={valor} onChange={(event) => setValor(event.target.value)} />
          </label>
          <label>
            Observação
            <input value={observacao} onChange={(event) => setObservacao(event.target.value)} />
          </label>
          <button onClick={abrir}>Abrir caixa</button>
        </>
      )}
    </div>
  );
}
