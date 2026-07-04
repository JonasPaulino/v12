import {
  gerarCobrancaBoletoFinanceira,
  gerarCobrancaPixFinanceira,
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

export const createPixCharge = async (financeiroTituloId, payload) => {
  return gerarCobrancaPixFinanceira(financeiroTituloId, payload);
};

export const createBoletoCharge = async (financeiroTituloId, payload) => {
  return gerarCobrancaBoletoFinanceira(financeiroTituloId, payload);
};
