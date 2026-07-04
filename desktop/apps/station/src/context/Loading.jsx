import { useContext } from "react";
import { AppContext } from "./AppContext.jsx";

export function Loading() {
  const { loading } = useContext(AppContext);

  if (!loading?.active) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-card">
        <div className="loading-spinner" />
        <p>{loading.message || "Carregando..."}</p>
      </div>
    </div>
  );
}
