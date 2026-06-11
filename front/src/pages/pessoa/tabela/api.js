import { api } from "api/axiosConfig";

export const getPessoas = async (page, limit, search, sort) => {
  const { data } = await api.get("/pessoa/listar", {
    params: {
      page,
      limit,
      search,
      sort: JSON.stringify(sort || {}),
    },
  });

  return data;
};

export const deletePessoa = async (pessoaId) => {
  const { data } = await api.delete(`/pessoa/${pessoaId}`);
  return data;
};
