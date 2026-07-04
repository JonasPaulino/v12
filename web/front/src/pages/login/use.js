import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { loginRequest } from "./api";

export const useLogin = () => {
  const navigate = useNavigate();
  const { showAlert } = useSweetAlert();
  const { showLoading, hideLoading, setUser, setBusiness, setBusinesses, setSystemMode } =
    useContext(AppContext);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pendingAccess, setPendingAccess] = useState(null);

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleLogin();
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showAlert({
        title: "Campos obrigatórios",
        text: "Informe e-mail e senha para continuar.",
        icon: "info",
      });
      return;
    }

    showLoading("Validando credenciais...");
    try {
      const response = await loginRequest(username, password);
      const canEnter =
        response?.success === true &&
        response?.user?.usuario_id &&
        response?.tenant?.tenant_id &&
        Array.isArray(response?.tenants) &&
        response.tenants.length > 0;

      if (!canEnter) {
        showAlert({
          title: "Falha no login",
          text: "Não foi possível concluir a autenticação.",
          icon: "error",
        });
        return;
      }

      if (response.user?.usuario_master) {
        setPendingAccess(response);
        return;
      }

      setUser(response.user || null);
      setBusiness(response.tenant || null);
      setBusinesses(response.tenants || []);
      setSystemMode("cliente");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      showAlert({
        title: "Falha no login",
        text: error?.response?.data?.error || "Não foi possível validar o acesso.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  const enterClientMode = () => {
    if (!pendingAccess) return;

    setUser(pendingAccess.user || null);
    setBusiness(pendingAccess.tenant || null);
    setBusinesses(pendingAccess.tenants || []);
    setSystemMode("cliente");
    navigate("/dashboard", { replace: true });
  };

  const enterGestaoMode = () => {
    if (!pendingAccess) return;

    setUser(pendingAccess.user || null);
    setBusiness(pendingAccess.tenant || null);
    setBusinesses(pendingAccess.tenants || []);
    setSystemMode("gestao");
    navigate("/gestao-v12", { replace: true });
  };

  return {
    username,
    password,
    pendingAccess,
    setUsername,
    setPassword,
    handleKeyDown,
    handleLogin,
    enterClientMode,
    enterGestaoMode,
  };
};
