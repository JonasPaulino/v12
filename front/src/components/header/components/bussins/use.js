import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { switchTenant } from "./api";

export const useToggleOptions = () => {
  const [isOpen, setIsOpen] = useState(false);
  const optionsContainerRef = useRef(null);

  const toggleOptions = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        isOpen &&
        optionsContainerRef.current &&
        !optionsContainerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return { isOpen, toggleOptions, optionsContainerRef, setIsOpen };
};

export const useBusinessOptions = () => {
  const {
    business,
    businesses,
    setUser,
    setBusiness,
    setBusinesses,
    showLoading,
    hideLoading,
  } = useContext(AppContext);
  const { showAlert } = useSweetAlert();

  const handleSwitch = async (tenantId, closeMenu) => {
    if (!tenantId || tenantId === business?.tenant_id) {
      if (typeof closeMenu === "function") closeMenu(false);
      return;
    }

    showLoading("Trocando filial...");
    try {
      const response = await switchTenant(tenantId);
      setUser(response.user || null);
      setBusiness(response.tenant || null);
      setBusinesses(response.tenants || []);
      if (typeof closeMenu === "function") closeMenu(false);
    } catch (error) {
      showAlert({
        title: "Falha ao trocar filial",
        text: error?.response?.data?.error || "Não foi possível trocar a filial ativa.",
        icon: "error",
      });
    } finally {
      hideLoading();
    }
  };

  return {
    business,
    businesses,
    handleSwitch,
  };
};
