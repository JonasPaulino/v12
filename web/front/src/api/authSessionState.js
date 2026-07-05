const LOGOUT_IN_PROGRESS_KEY = "v12:logout_in_progress";

const getSessionStorage = () => {
  if (typeof window === "undefined") return null;
  return window.sessionStorage || null;
};

export const markLogoutInProgress = () => {
  getSessionStorage()?.setItem(LOGOUT_IN_PROGRESS_KEY, "true");
};

export const clearLogoutInProgress = () => {
  getSessionStorage()?.removeItem(LOGOUT_IN_PROGRESS_KEY);
};

export const isLogoutInProgress = () =>
  getSessionStorage()?.getItem(LOGOUT_IN_PROGRESS_KEY) === "true";
