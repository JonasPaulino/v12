import {
  getTituloFinanceiroById,
  getSupportData as getFinanceiroSupportData,
} from "../api";
import { api } from "api/axiosConfig";

export const getSupportData = async (tipo = "receber") => {
  return getFinanceiroSupportData(tipo);
};

export const searchPessoasSelect = async (search = "", limit = 20) => {
  const { data } = await api.get("/financeiro/pessoas-select", {
    params: {
      search,
      limit,
    },
  });

  return data;
};

export const createTituloManual = async (payload) => {
  const { data } = await api.post("/financeiro", payload);
  return data;
};

export const getTituloById = async (financeiroTituloId) => {
  return getTituloFinanceiroById(financeiroTituloId);
};

export const updateTituloManual = async (financeiroTituloId, payload) => {
  const { data } = await api.put(`/financeiro/${financeiroTituloId}`, payload);
  return data;
};
