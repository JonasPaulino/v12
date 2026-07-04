import {
  enviarBoletoWhatsAppFinanceiro,
  enviarPixWhatsAppFinanceiro,
  getTitulosFinanceiros,
} from "../api";

export const getFinanceiro = async (page, limit, search, tipo, status, sort) =>
  getTitulosFinanceiros(page, limit, search, tipo, status, sort);

export const sendBoletoWhatsApp = async (financeiroTituloId) =>
  enviarBoletoWhatsAppFinanceiro(financeiroTituloId);

export const sendPixWhatsApp = async (financeiroTituloId) =>
  enviarPixWhatsAppFinanceiro(financeiroTituloId);
