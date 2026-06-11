export const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() || "")
    .join("");

export const getFirstName = (name = "") => name.split(" ").filter(Boolean)[0] || "";
