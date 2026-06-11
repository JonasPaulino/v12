import { api } from "api/axiosConfig";

export const getPessoaById = async (pessoaId) => {
  const { data } = await api.get(`/pessoa/${pessoaId}`);
  return data;
};

export const createPessoa = async (payload) => {
  const { data } = await api.post("/pessoa", payload);
  return data;
};

export const updatePessoa = async (pessoaId, payload) => {
  const { data } = await api.put(`/pessoa/${pessoaId}`, payload);
  return data;
};
