import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { Loading } from "./Loading.jsx";
import { SweetAlertProvider } from "./SweetAlertContext.jsx";

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [loading, setLoading] = useState({ active: false, message: null });

  const showLoading = useCallback((message = "Carregando...") => {
    setLoading({ active: true, message });
  }, []);

  const hideLoading = useCallback(() => {
    setLoading({ active: false, message: null });
  }, []);

  useEffect(() => {
    const handleHideLoading = () => hideLoading();
    window.addEventListener("app:loading:hide", handleHideLoading);
    return () => window.removeEventListener("app:loading:hide", handleHideLoading);
  }, [hideLoading]);

  const value = useMemo(
    () => ({
      loading,
      showLoading,
      hideLoading,
    }),
    [hideLoading, loading, showLoading],
  );

  return (
    <SweetAlertProvider>
      <AppContext.Provider value={value}>
        {children}
        <Loading />
      </AppContext.Provider>
    </SweetAlertProvider>
  );
}
