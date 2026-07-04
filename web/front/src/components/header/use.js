import { useContext } from "react";
import { AppContext } from "context";

export const useBusiness = () => {
  const { business } = useContext(AppContext);
  return business || {};
};
