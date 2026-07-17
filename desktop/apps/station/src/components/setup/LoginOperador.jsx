import { useContext, useEffect, useState } from "react";
import { FiEye, FiEyeOff, FiRefreshCcw } from "react-icons/fi";
import { api } from "../../api.js";
import { AppContext } from "../../context/AppContext.jsx";
import { useSweetAlert } from "../../context/SweetAlertContext.jsx";
import logoPdvColor from "../../assets/logo_pdv_cor.png";

const REMEMBER_OPERATOR_KEY = "v12_pdv_remember_operator_email";

export function LoginOperador({ config, onLogin, onRefreshStatus, syncState }) {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, promptPasswordChange } = useSweetAlert();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrarUsuario, setLembrarUsuario] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(REMEMBER_OPERATOR_KEY) || "";
    if (savedEmail) {
      setEmail(savedEmail);
      setLembrarUsuario(true);
    }
  }, []);

  const bloqueado = !!config?.tenant_acesso_bloqueado || !!config?.bloqueado;
  const motivoBloqueio =
    config?.motivo_bloqueio ||
    config?.tenant_bloqueio_motivo ||
    "A filial está bloqueada na retaguarda.";
  const atualizacaoReleaseEmAndamento = [
    "baixando",
    "instalando",
    "pendente_reinicio",
    "recursos_aplicado",
  ].includes(String(syncState?.releaseStatus || ""));
  const mensagemAtualizacao =
    syncState?.releaseMessage ||
    "Encontramos uma nova versão do PDV e estamos atualizando o sistema. Aguarde e não feche o aplicativo.";
  const exibirAvisoAtualizacao =
    !bloqueado &&
    (
      atualizacaoReleaseEmAndamento ||
      /instalador foi iniciado|reinicie o pdv|atualização baixada/i.test(
        String(syncState?.releaseMessage || ""),
      )
    );

  function persistRememberedEmail(value) {
    const normalizedEmail = String(value || "").trim().toLowerCase();
    if (lembrarUsuario && normalizedEmail) {
      window.localStorage.setItem(REMEMBER_OPERATOR_KEY, normalizedEmail);
      return;
    }

    window.localStorage.removeItem(REMEMBER_OPERATOR_KEY);
  }

  async function submit(event) {
    event.preventDefault();
    if (bloqueado || atualizacaoReleaseEmAndamento) return;
    showLoading("Validando operador...");
    try {
      persistRememberedEmail(email);
      const operador = await api.loginOperador({ email, senha });

      if (operador?.primeiro_acesso_pendente) {
        hideLoading();
        const passwordResult = await promptPasswordChange();
        if (!passwordResult?.password) return;

        showLoading("Atualizando senha no ERP...");
        await api.trocarSenhaPrimeiroAcesso({
          email,
          senha_atual: senha,
          nova_senha: passwordResult.password,
        });

        setSenha("");
        showAlert({
          title: "Senha atualizada",
          text: "Entre novamente usando a nova senha.",
          icon: "success",
        });
        return;
      }

      await onLogin(operador);
    } catch (error) {
      showAlert({
        title: "Acesso negado",
        text: error.message,
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  }

  return (
    <div className="setup-shell">
      <form className="login-card" onSubmit={submit}>
        <img src={logoPdvColor} alt="V12 PDV" />
        <h1>Entrar no caixa</h1>
        <p>
          {config?.tenant_nome || "Filial configurada"} • {config?.terminal_nome || "Caixa 01"}
        </p>
        {bloqueado ? (
          <div className="login-blocked-message">
            <strong>Filial bloqueada</strong>
            <span>{motivoBloqueio}</span>
            <button
              type="button"
              className="blocked-refresh-button"
              onClick={() => onRefreshStatus?.({ syncRemote: true, silent: true })}
            >
              Atualizar situação
            </button>
          </div>
        ) : null}
        {exibirAvisoAtualizacao ? (
          <div className="login-sync-message">
            <strong className="login-sync-title">
              <FiRefreshCcw className="spinning-icon" />
              {atualizacaoReleaseEmAndamento ? "Atualizando PDV" : "Situação do PDV"}
            </strong>
            <span>{mensagemAtualizacao}</span>
          </div>
        ) : null}
        <label>
          E-mail do operador
          <input
            type="email"
            value={email}
            disabled={bloqueado || atualizacaoReleaseEmAndamento}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Senha local
          <span className="password-field">
            <input
              type={mostrarSenha ? "text" : "password"}
              value={senha}
              disabled={bloqueado || atualizacaoReleaseEmAndamento}
              onChange={(event) => setSenha(event.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              disabled={bloqueado || atualizacaoReleaseEmAndamento}
              onClick={() => setMostrarSenha((current) => !current)}
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarSenha ? <FiEyeOff /> : <FiEye />}
            </button>
          </span>
        </label>
        <label className="remember-operator">
          <input
            type="checkbox"
            checked={lembrarUsuario}
            disabled={bloqueado || atualizacaoReleaseEmAndamento}
            onChange={(event) => setLembrarUsuario(event.target.checked)}
          />
          Lembrar usuário neste caixa
        </label>
        <button type="submit" disabled={bloqueado || atualizacaoReleaseEmAndamento}>
          {atualizacaoReleaseEmAndamento ? "Atualizando PDV..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
