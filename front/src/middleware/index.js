import { useContext, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { changeFirstPassword, checkTokenValidity } from "./api";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";

export const AuthMiddleware = ({ children }) => {
  const navigate = useNavigate();
  const { showAlert, promptPasswordChange } = useSweetAlert();
  const { setUser, setBusiness, setBusinesses, clearSession } = useContext(AppContext);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const alertLockRef = useRef(false);
  const firstLoginLockRef = useRef(false);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();

      if (!alertLockRef.current) {
        alertLockRef.current = true;
        showAlert({
          title: "Sessão encerrada",
          text: "Sua autenticação expirou. Faça login novamente.",
          icon: "error",
          timer: 3000,
        });

        setTimeout(() => {
          alertLockRef.current = false;
        }, 3000);
      }

      navigate("/login", { replace: true });
    };

    document.addEventListener("app:unauthorized", handleUnauthorized);
    return () => document.removeEventListener("app:unauthorized", handleUnauthorized);
  }, [clearSession, navigate, showAlert]);

  useEffect(() => {
    let mounted = true;

    const validate = async () => {
      const result = await checkTokenValidity();
      if (!mounted) return;

      if (result.valid) {
        setUser(result.user);
        setBusiness(result.tenant);
        setBusinesses(result.tenants);
        setValid(true);

        if (result.user?.usuario_primeiro_login && !firstLoginLockRef.current) {
          firstLoginLockRef.current = true;

          try {
            const passwordData = await promptPasswordChange();
            if (passwordData?.password) {
              const updated = await changeFirstPassword(passwordData.password);
              setUser(updated.user || result.user);
              showAlert({
                title: "Senha atualizada",
                text: "Seu acesso foi liberado com a nova senha.",
                icon: "success",
                timer: 1800,
              });
            }
          } catch (error) {
            showAlert({
              title: "Falha ao atualizar senha",
              text:
                error?.response?.data?.error ||
                "Não foi possível concluir a troca da senha inicial.",
              icon: "error",
            });
            clearSession();
            setValid(false);
          } finally {
            firstLoginLockRef.current = false;
          }
        }
      } else {
        clearSession();
        setValid(false);
      }

      setChecking(false);
    };

    validate();

    return () => {
      mounted = false;
    };
  }, [clearSession, setBusiness, setBusinesses, setUser]);

  if (checking) return null;

  if (!valid) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
