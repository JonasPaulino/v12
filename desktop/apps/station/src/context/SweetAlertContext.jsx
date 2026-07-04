import { createContext, useContext, useMemo } from "react";
import Swal from "sweetalert2";

const SweetAlertContext = createContext(null);

function hideGlobalLoading() {
  window.dispatchEvent(new CustomEvent("app:loading:hide"));
}

export function SweetAlertProvider({ children }) {
  const value = useMemo(
    () => ({
      showAlert: ({ title, text, html, icon = "info", confirmButtonText = "OK" }) => {
        hideGlobalLoading();
        return Swal.fire({
          title,
          text: html ? undefined : text,
          html,
          icon,
          confirmButtonText,
          confirmButtonColor: "#075985",
          background: "#f8fbff",
        });
      },
      askYesNoQuestion: async (title, text) => {
        hideGlobalLoading();
        const result = await Swal.fire({
          title,
          text,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Sim",
          cancelButtonText: "Nao",
          confirmButtonColor: "#075985",
          cancelButtonColor: "#64748b",
          background: "#f8fbff",
        });

        return result.isConfirmed;
      },
    }),
    [],
  );

  return <SweetAlertContext.Provider value={value}>{children}</SweetAlertContext.Provider>;
}

export const useSweetAlert = () => useContext(SweetAlertContext);
