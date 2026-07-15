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
      promptPasswordChange: async () => {
        hideGlobalLoading();
        const result = await Swal.fire({
          title: "Alterar senha temporária",
          html: `
            <div style="display:grid;gap:12px;text-align:left;">
              <p style="margin:0;color:#64748b;">
                Este é seu primeiro acesso. Crie uma nova senha para liberar o caixa e sincronizar a alteração com o ERP.
              </p>
              <input id="swal-password" type="password" class="swal2-input" placeholder="Nova senha" style="margin:0;" />
              <input id="swal-password-confirm" type="password" class="swal2-input" placeholder="Confirmar nova senha" style="margin:0;" />
            </div>
          `,
          focusConfirm: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
          confirmButtonText: "Salvar senha",
          confirmButtonColor: "#075985",
          background: "#f8fbff",
          preConfirm: () => {
            const password = document.getElementById("swal-password")?.value || "";
            const confirmPassword =
              document.getElementById("swal-password-confirm")?.value || "";

            if (password.length < 6) {
              Swal.showValidationMessage("A nova senha precisa ter pelo menos 6 caracteres.");
              return false;
            }

            if (password !== confirmPassword) {
              Swal.showValidationMessage("As senhas informadas não conferem.");
              return false;
            }

            return { password };
          },
        });

        return result.isConfirmed ? result.value : null;
      },
      showToast: ({ title, text, icon = "success", timer = 1800, position = "top-end" }) => {
        hideGlobalLoading();
        return Swal.fire({
          toast: true,
          position,
          icon,
          title,
          text,
          timer,
          timerProgressBar: true,
          showConfirmButton: false,
          background: "#f8fbff",
          didOpen: (toast) => {
            toast.addEventListener("mouseenter", Swal.stopTimer);
            toast.addEventListener("mouseleave", Swal.resumeTimer);
          },
        });
      },
    }),
    [],
  );

  return <SweetAlertContext.Provider value={value}>{children}</SweetAlertContext.Provider>;
}

export const useSweetAlert = () => useContext(SweetAlertContext);
