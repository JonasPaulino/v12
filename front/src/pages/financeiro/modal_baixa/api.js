import {
  estornarBaixaFinanceira,
  getSupportData as getFinanceiroSupportData,
  getTituloFinanceiroById,
  registrarBaixaFinanceira,
} from "../api";

export const getSupportData = async (tipo = "receber") => {
  return getFinanceiroSupportData(tipo);
};

export const getTituloById = async (financeiroTituloId) => {
  return getTituloFinanceiroById(financeiroTituloId);
};

export const createBaixa = async (financeiroTituloId, payload) => {
  return registrarBaixaFinanceira(financeiroTituloId, payload);
};

export const estornarBaixa = async (financeiroTituloBaixaId) => {
  return estornarBaixaFinanceira(financeiroTituloBaixaId);
};
