import React, { createContext, useCallback, useMemo, useState } from "react";
import { SweetAlertProvider } from "./sweet_alert";
import Loading from "./loading";

export const AppContext = createContext(null);
const MOBILE_BREAKPOINT = 900;

const readStoredJSON = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeStoredJSON = (key, value) => {
  if (value === null || value === undefined) {
    window.localStorage.removeItem(key);
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

export const AppProvider = ({ children }) => {
  const [loading, setLoading] = useState({ active: false, message: null });
  const [mOpen, setMOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > MOBILE_BREAKPOINT;
  });
  const [pageSelect, setPageSelect] = useState("Dashboard");
  const [user, setUserState] = useState(() => readStoredJSON("user"));
  const [business, setBusinessState] = useState(() => readStoredJSON("business"));
  const [businesses, setBusinessesState] = useState(
    () => readStoredJSON("businesses") || []
  );

  const showLoading = useCallback((message = null) => {
    setLoading({ active: true, message });
  }, []);

  const hideLoading = useCallback(() => {
    setLoading({ active: false, message: null });
  }, []);

  const abreFechaMenu = useCallback(() => {
    setMOpen((prev) => !prev);
  }, []);

  const selecionaPagina = useCallback((pagina) => {
    setPageSelect(pagina);
  }, []);

  const setUser = useCallback((value) => {
    setUserState(value || null);
    writeStoredJSON("user", value || null);
  }, []);

  const setBusiness = useCallback((value) => {
    setBusinessState(value || null);
    writeStoredJSON("business", value || null);
  }, []);

  const setBusinesses = useCallback((value) => {
    const normalized = Array.isArray(value) ? value : [];
    setBusinessesState(normalized);
    writeStoredJSON("businesses", normalized);
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setBusiness(null);
    setBusinesses([]);
  }, [setBusiness, setBusinesses, setUser]);

  const contextValue = useMemo(
    () => ({
      loading,
      mOpen,
      pageSelect,
      user,
      business,
      businesses,
      showLoading,
      hideLoading,
      abreFechaMenu,
      selecionaPagina,
      setUser,
      setBusiness,
      setBusinesses,
      clearSession,
    }),
    [
      loading,
      mOpen,
      pageSelect,
      user,
      business,
      businesses,
      showLoading,
      hideLoading,
      abreFechaMenu,
      selecionaPagina,
      setUser,
      setBusiness,
      setBusinesses,
      clearSession,
    ]
  );

  return (
    <SweetAlertProvider>
      <AppContext.Provider value={contextValue}>
        {children}
        <Loading />
      </AppContext.Provider>
    </SweetAlertProvider>
  );
};
