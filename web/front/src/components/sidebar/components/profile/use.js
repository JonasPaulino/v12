import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { getFirstName } from "utils";
import { markLogoutInProgress } from "api/authSessionState";
import { logout } from "./api";

export const useToggleOptions = () => {
  const [isOpen, setIsOpen] = useState(false);
  const optionsContainerRef = useRef(null);

  const toggleOptions = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        optionsContainerRef.current &&
        !optionsContainerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return {
    isOpen,
    toggleOptions,
    optionsContainerRef,
  };
};

export const useUser = () => {
  const { user } = useContext(AppContext);

  return {
    name: user?.usuario_nome || "",
    email: user?.usuario_email || "",
    shortName: getFirstName(user?.usuario_nome || ""),
    isMaster: !!user?.usuario_master,
  };
};

export const useProfileActions = () => {
  const navigate = useNavigate();
  const { askYesNoQuestion } = useSweetAlert();
  const { clearSession } = useContext(AppContext);

  const handleLogout = async () => {
    const confirmed = await askYesNoQuestion("Sair do sistema?", "Deseja encerrar a sessão atual?");
    if (!confirmed) return;

    markLogoutInProgress();
    await logout().catch(() => null);
    clearSession();
    navigate("/login", { replace: true });
  };

  return { handleLogout };
};
