import React from "react";

export const formatDocumento = (value, fallback = "--") => {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }

  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }

  return value || fallback;
};

const Documento = ({ value, fallback = "--" }) => {
  return <>{formatDocumento(value, fallback)}</>;
};

export default Documento;
