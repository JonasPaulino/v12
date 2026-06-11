import { useContext, useEffect } from "react";
import { AppContext } from "context";

const PageWrapper = ({ title, children }) => {
  const { selecionaPagina } = useContext(AppContext);

  useEffect(() => {
    selecionaPagina(title);
  }, [selecionaPagina, title]);

  return children;
};

export default PageWrapper;
