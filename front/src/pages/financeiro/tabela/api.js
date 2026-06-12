import { getTitulosFinanceiros } from "../api";

export const getFinanceiro = async (page, limit, search, tipo, status, sort) =>
  getTitulosFinanceiros(page, limit, search, tipo, status, sort);
