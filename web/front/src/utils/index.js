export const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() || "")
    .join("");

export const getFirstName = (name = "") => name.split(" ").filter(Boolean)[0] || "";

export const formatTelefone = (value, fallback = "--") => {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  return value || fallback;
};

export const reloadAfterTenantSwitch = () => {
  if (typeof window === "undefined") return;

  window.setTimeout(() => {
    window.location.reload();
  }, 80);
};
