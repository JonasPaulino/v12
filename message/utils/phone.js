export const normalizePhoneNumber = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
};
