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

export const buscarCepViaCep = async (cep) => {
  const digits = String(cep || "").replace(/\D/g, "");

  if (digits.length !== 8) {
    throw new Error("Informe um CEP com 8 dígitos.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  const data = await response.json();

  if (!response.ok || data?.erro) {
    throw new Error("CEP não encontrado no ViaCEP.");
  }

  return data;
};
