import React, { createContext, useContext, useMemo } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const SweetAlertContext = createContext(null);
const ReactSwal = withReactContent(Swal);

export const SweetAlertProvider = ({ children }) => {
  const value = useMemo(
    () => ({
      showAlert: ({
        title,
        text,
        html,
        icon = "info",
        timer,
        confirmButtonText,
        width,
      }) =>
        ReactSwal.fire({
          title,
          text: html ? undefined : text,
          html,
          icon,
          timer,
          width,
          timerProgressBar: !!timer,
          confirmButtonText:
            typeof confirmButtonText === "string" && confirmButtonText.trim()
              ? confirmButtonText
              : "OK",
          confirmButtonColor: "#0b5fff",
        }),
      askYesNoQuestion: async (title, text) => {
        const result = await ReactSwal.fire({
          title,
          text,
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Sim",
          cancelButtonText: "Não",
          confirmButtonColor: "#0b5fff",
        });

        return result.isConfirmed;
      },
      promptPasswordChange: async () => {
        const result = await ReactSwal.fire({
          title: "Primeiro acesso",
          html: `
            <div style="display:grid;gap:12px;text-align:left;">
              <p style="margin:0;color:#5f6f8f;">
                Defina uma nova senha para concluir o primeiro login.
              </p>
              <input id="swal-password" type="password" class="swal2-input" placeholder="Nova senha" style="margin:0;" />
              <input id="swal-password-confirm" type="password" class="swal2-input" placeholder="Confirmar nova senha" style="margin:0;" />
            </div>
          `,
          focusConfirm: false,
          allowOutsideClick: false,
          allowEscapeKey: false,
          confirmButtonText: "Salvar senha",
          confirmButtonColor: "#0b5fff",
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
    }),
    []
  );

  return (
    <SweetAlertContext.Provider value={value}>
      {children}
    </SweetAlertContext.Provider>
  );
};

export const useSweetAlert = () => useContext(SweetAlertContext);
