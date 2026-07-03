import { api } from "api/axiosConfig";

export const getEntradasMercadoria = async (
  page = 1,
  limit = 12,
  search = "",
  sort = {},
  options = {}
) => {
  const { data } = await api.get("/entrada-mercadoria", {
    params: {
      page,
      limit,
      search,
      sort: JSON.stringify(sort || {}),
      onlyNfe: options.onlyNfe ? "true" : undefined,
    },
  });
  return data;
};

export const getEntradaMercadoria = async (entradaMercadoriaId) => {
  const { data } = await api.get(`/entrada-mercadoria/${entradaMercadoriaId}`);
  return data;
};

export const searchPedidosCompraSelect = async (search = "", limit = 20) => {
  const { data } = await api.get("/entrada-mercadoria/pedidos-compra-select", {
    params: {
      search,
      limit,
    },
  });
  return data;
};

export const getPedidoCompraEntrada = async (pedidoCompraId) => {
  const { data } = await api.get(`/entrada-mercadoria/pedido-compra/${pedidoCompraId}`);
  return data;
};

export const criarEntradaMercadoria = async (payload) => {
  const { data } = await api.post("/entrada-mercadoria", payload);
  return data;
};

export const cancelarEntradaMercadoria = async (entradaMercadoriaId, payload = {}) => {
  const { data } = await api.post(
    `/entrada-mercadoria/${entradaMercadoriaId}/cancelar`,
    payload
  );
  return data;
};

export const prepararXmlEntradaMercadoria = async (file) => {
  const formData = new FormData();
  formData.append("xml", file);

  const { data } = await api.post("/entrada-mercadoria/xml/preparar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const importarXmlEntradaMercadoria = async (file, produtoVinculos = {}) => {
  const formData = new FormData();
  formData.append("xml", file);
  formData.append("produto_vinculos", JSON.stringify(produtoVinculos || {}));

  const { data } = await api.post("/entrada-mercadoria/xml", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const getSolicitacoesXmlEntrada = async (search = "", limit = 20) => {
  const { data } = await api.get("/entrada-mercadoria/xml-solicitacoes", {
    params: {
      search,
      limit,
    },
  });
  return data;
};

export const solicitarXmlEntradaPorChave = async (chaveAcesso) => {
  const { data } = await api.post("/entrada-mercadoria/xml-solicitacoes", {
    chave_acesso: chaveAcesso,
  });
  return data;
};

export const atualizarSolicitacaoXmlEntrada = async (solicitacaoId) => {
  const { data } = await api.post(
    `/entrada-mercadoria/xml-solicitacoes/${solicitacaoId}/consultar`
  );
  return data;
};

export const importarSolicitacaoXmlEntrada = async (solicitacaoId) => {
  const { data } = await api.post(
    `/entrada-mercadoria/xml-solicitacoes/${solicitacaoId}/importar`
  );
  return data;
};

export const prepararSolicitacaoXmlEntrada = async (solicitacaoId) => {
  const { data } = await api.get(
    `/entrada-mercadoria/xml-solicitacoes/${solicitacaoId}/preparar`
  );
  return data;
};

export const importarSolicitacaoXmlEntradaComVinculos = async (
  solicitacaoId,
  produtoVinculos = {}
) => {
  const { data } = await api.post(
    `/entrada-mercadoria/xml-solicitacoes/${solicitacaoId}/importar`,
    {
      produto_vinculos: produtoVinculos,
    }
  );
  return data;
};

export const searchProdutosEntradaSelect = async (search = "", limit = 20) => {
  const { data } = await api.get("/compra/produtos-select", {
    params: {
      search,
      limit,
    },
  });
  return data;
};

export const registrarManifestacaoNfeRecebida = async (entradaMercadoriaId, payload) => {
  const { data } = await api.post(
    `/entrada-mercadoria/${entradaMercadoriaId}/manifestacoes`,
    payload
  );
  return data;
};
