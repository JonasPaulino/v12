import { useContext, useEffect, useState } from "react";
import { api } from "../../api.js";
import { AppContext } from "../../context/AppContext.jsx";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";

function currency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function FechamentoCaixa({ onClosed }) {
  const [resumo, setResumo] = useState(null);
  const [valor, setValor] = useState("");
  const [observacao, setObservacao] = useState("");
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();

  async function loadResumo() {
    try {
      showLoading("Calculando fechamento...");
      const data = await api.caixaResumo();
      setResumo(data);
      setValor(String(Number(data?.dinheiro_esperado || 0).toFixed(2)));
    } catch (error) {
      showAlert({ title: "Falha no resumo", text: error.message, icon: "error" });
    } finally {
      hideLoading();
    }
  }

  useEffect(() => {
    loadResumo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fechar(event) {
    event.preventDefault();
    const diferenca = Number(valor || 0) - Number(resumo?.dinheiro_esperado || 0);
    const confirmed = await askYesNoQuestion(
      "Encerrar caixa",
      `Diferença calculada: ${currency(diferenca)}. Deseja fechar o caixa?`,
    );
    if (!confirmed) return;

    try {
      showLoading("Fechando caixa...");
      const caixa = await api.fecharCaixa({
        valor_fechamento: valor,
        observacao,
      });
      showAlert({ title: "Caixa fechado", text: "Sessão de caixa encerrada.", icon: "success" });
      onClosed(caixa);
    } catch (error) {
      showAlert({ title: "Falha ao fechar caixa", text: error.message, icon: "error" });
    } finally {
      hideLoading();
    }
  }

  const caixaPendenteDiaAnterior = !!resumo?.caixa?.caixa_pendente_dia_anterior;

  return (
    <form className="cash-flow-module" onSubmit={fechar}>
      <div className="cash-flow-head">
        <strong>Fechamento do caixa</strong>
        <span>
          {caixaPendenteDiaAnterior
            ? `Caixa aberto em ${new Date(`${resumo.caixa.data_operacional}T00:00:00`).toLocaleDateString("pt-BR")}. Feche este caixa antes de iniciar o dia atual.`
            : "Confira o dinheiro físico da gaveta e encerre a sessão."}
        </span>
        <small>O fechamento considera apenas as vendas concluídas do caixa aberto atual.</small>
      </div>

      <div className="cash-resume-list">
        <span>Saldo inicial <b>{currency(resumo?.caixa?.valor_abertura)}</b></span>
        <span>Vendas concluídas <b>{resumo?.vendas?.quantidade_vendas || 0}</b></span>
        <span>Total vendido <b>{currency(resumo?.vendas?.total_vendido)}</b></span>
        <span>Vendas em dinheiro <b>{currency(resumo?.dinheiro_vendas)}</b></span>
        <span>Suprimentos <b>{currency(resumo?.suprimentos)}</b></span>
        <span>Sangrias <b>{currency(resumo?.sangrias)}</b></span>
        <strong>Dinheiro esperado <b>{currency(resumo?.dinheiro_esperado)}</b></strong>
      </div>

      <div className="payment-resume-grid">
        <span>PIX <b>{currency(resumo?.pagamentos?.pix)}</b></span>
        <span>Crédito <b>{currency(resumo?.pagamentos?.credito)}</b></span>
        <span>Débito <b>{currency(resumo?.pagamentos?.debito)}</b></span>
        <span>Outros <b>{currency(resumo?.pagamentos?.outros)}</b></span>
      </div>

      <label>
        Valor conferido na gaveta
        <input value={valor} onChange={(event) => setValor(event.target.value)} />
      </label>

      <label>
        Observação da conferência
        <input value={observacao} onChange={(event) => setObservacao(event.target.value)} />
      </label>

      <button type="submit">Encerrar caixa</button>
    </form>
  );
}
