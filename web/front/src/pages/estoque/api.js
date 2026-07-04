import { api } from "api/axiosConfig";

export const getSaldosEstoque = async (page, limit, search, sort) => {
  const { data } = await api.get("/estoque/saldos", {
    params: {
      page,
      limit,
      search,
      sort: JSON.stringify(sort || {}),
    },
  });

  return data;
};

export const getMovimentacoesEstoque = async (page, limit, search, sort) => {
  const { data } = await api.get("/estoque/movimentacoes", {
    params: {
      page,
      limit,
      search,
      sort: JSON.stringify(sort || {}),
    },
  });

  return data;
};

export const searchProdutosEstoque = async (search = "", limit = 20) => {
  const { data } = await api.get("/estoque/produtos-select", {
    params: { search, limit },
  });

  return data;
};

export const criarAjusteEstoque = async (payload) => {
  const { data } = await api.post("/estoque/ajustes", payload);
  return data;
};
