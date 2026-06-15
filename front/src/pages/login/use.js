import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { loginRequest } from "./api";

export const useLogin = () => {
  const navigate = useNavigate();
  const { showAlert } = useSweetAlert();
  const { showLoading, hideLoading, setUser, setBusiness, setBusinesses } =
    useContext(AppContext);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleLogin();
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showAlert({
        title: "Campos obrigatórios",
        text: "Informe login e senha para continuar.",
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

      setUser(response.user || null);
      setBusiness(response.tenant || null);
      setBusinesses(response.tenants || []);
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

  return {
    username,
    password,
    setUsername,
    setPassword,
    handleKeyDown,
    handleLogin,
  };
};
