import { api } from "api/axiosConfig";

export const getEntradasMercadoria = async (page = 1, limit = 12, search = "", sort = {}) => {
  const { data } = await api.get("/entrada-mercadoria", {
    params: {
      page,
      limit,
      search,
      sort: JSON.stringify(sort || {}),
    },
  });
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

