import { useContext, useMemo, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { reloadAfterTenantSwitch } from "utils";
import { switchTenant } from "./api";

const isTenantActive = (tenant) => tenant?.tenant_ativo !== false && tenant?.ativo !== false;

export const useBusinessSwitcher = () => {
  const {
    business,
    businesses,
    setBusiness,
    setBusinesses,
    setUser,
    showLoading,
    hideLoading,
  } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [isOpen, setIsOpen] = useState(false);

  const currentTenantId = business?.tenant_id || null;

  const tenantOptions = useMemo(
    () => (businesses || []).filter(isTenantActive),
    [businesses]
  );
  const selectedTenantId = useMemo(() => {
    if (!tenantOptions.length) return currentTenantId;
    const currentIsActive = tenantOptions.some(
      (tenant) => Number(tenant.tenant_id) === Number(currentTenantId)
    );
    return currentIsActive ? currentTenantId : tenantOptions[0].tenant_id;
  }, [currentTenantId, tenantOptions]);

  const toggle = () => setIsOpen((prev) => !prev);

  const handleSwitch = async (tenantId) => {
    if (!tenantId || tenantId === selectedTenantId) {
      setIsOpen(false);
      return;
    }

    showLoading("Trocando filial...");
    try {
      const response = await switchTenant(tenantId);
      setUser(response.user || null);
      setBusiness(response.tenant || null);
      setBusinesses(response.tenants || []);
      setIsOpen(false);
      reloadAfterTenantSwitch();
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
    currentTenantId: selectedTenantId,
    tenantOptions,
    isOpen,
    toggle,
    handleSwitch,
  };
};
