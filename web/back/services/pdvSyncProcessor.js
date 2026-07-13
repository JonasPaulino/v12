import { pool } from "../config/conexao.js";
import DesktopSyncDAO from "../model/desktopSyncDAO.js";
import PdvDAO from "../model/pdvDAO.js";

const NFCE_EVENT_MAP = {
  NFCE_EMITIDA: "pendente",
  NFCE_CONTINGENCIA: "contingencia",
  NFCE_AUTORIZADA: "autorizada",
  NFCE_CANCELADA: "cancelada",
};

async function processarEventoComClient(client, evento) {
  const terminal = await PdvDAO.ensureTerminal(client, {
    tenantId: evento.tenantId,
    terminalCodigo: evento.terminalCodigo,
    terminalNome: evento.terminalNome,
  });

  switch (evento.eventType) {
    case "CAIXA_ABERTO": {
      await PdvDAO.upsertCaixa(client, {
        tenantId: evento.tenantId,
        terminal,
        payload: evento.payload,
      });
      return "Caixa aberto sincronizado.";
    }

    case "CAIXA_FECHADO": {
      await PdvDAO.upsertCaixa(client, {
        tenantId: evento.tenantId,
        terminal,
        payload: evento.payload,
      });
      return "Caixa fechado sincronizado.";
    }

    case "CAIXA_MOVIMENTO": {
      let caixa = await PdvDAO.obterCaixaPorLocalId(client, {
        tenantId: evento.tenantId,
        caixaLocalId: evento.payload?.caixa_id,
      });

      if (!caixa) {
        caixa = await PdvDAO.upsertCaixa(client, {
          tenantId: evento.tenantId,
          terminal,
          payload: {
            caixa_id: evento.payload?.caixa_id,
            sessao_codigo: `PDV-${evento.tenantId}-${terminal.terminal_codigo}-${evento.payload?.caixa_id || "MOV"}`,
            operador_id: evento.payload?.operador_id,
            operador_nome: evento.payload?.operador_nome,
            status: "aberto",
          },
        });
      }

      await PdvDAO.upsertCaixaMovimento(client, {
        tenantId: evento.tenantId,
        pdvCaixaId: caixa.pdv_caixa_id,
        payload: evento.payload,
      });
      return "Movimento de caixa sincronizado.";
    }

    case "VENDA_CRIADA":
    case "VENDA_CANCELADA": {
      let caixa = await PdvDAO.obterCaixaPorLocalId(client, {
        tenantId: evento.tenantId,
        caixaLocalId: evento.payload?.caixa_id,
      });

      if (!caixa) {
        caixa = await PdvDAO.upsertCaixa(client, {
          tenantId: evento.tenantId,
          terminal,
          payload: {
            caixa_id: evento.payload?.caixa_id,
            sessao_codigo: evento.payload?.sessao_codigo,
            operador_nome: evento.payload?.operador_nome,
            status: "aberto",
          },
        });
      }

      const venda = await PdvDAO.upsertVenda(client, {
        tenantId: evento.tenantId,
        terminal,
        caixa,
        payload: evento.payload,
      });

      await PdvDAO.replaceVendaItens(client, {
        tenantId: evento.tenantId,
        pdvVendaId: venda.pdv_venda_id,
        itens: Array.isArray(evento.payload?.itens) ? evento.payload.itens : [],
      });

      await PdvDAO.replaceVendaPagamentos(client, {
        tenantId: evento.tenantId,
        pdvVendaId: venda.pdv_venda_id,
        pagamentos: Array.isArray(evento.payload?.pagamentos) ? evento.payload.pagamentos : [],
      });

      if (venda.status === "concluida" && !venda.estoque_aplicado) {
        await PdvDAO.aplicarEstoqueVenda(client, {
          tenantId: evento.tenantId,
          pdvVendaId: venda.pdv_venda_id,
          tipoCodigo: "pdv_venda_saida",
          fator: -1,
        });
        await PdvDAO.marcarControleEstoque(client, {
          pdvVendaId: venda.pdv_venda_id,
          aplicado: true,
          estornado: false,
        });
      }

      if (venda.status === "cancelada" && venda.estoque_aplicado && !venda.estoque_estornado) {
        await PdvDAO.aplicarEstoqueVenda(client, {
          tenantId: evento.tenantId,
          pdvVendaId: venda.pdv_venda_id,
          tipoCodigo: "pdv_cancelamento_entrada",
          fator: 1,
        });
        await PdvDAO.marcarControleEstoque(client, {
          pdvVendaId: venda.pdv_venda_id,
          estornado: true,
        });
      }

      return venda.status === "cancelada"
        ? "Venda cancelada sincronizada."
        : "Venda sincronizada.";
    }

    case "NFCE_EMITIDA":
    case "NFCE_CONTINGENCIA":
    case "NFCE_AUTORIZADA":
    case "NFCE_CANCELADA": {
      await PdvDAO.atualizarStatusNfce(client, {
        tenantId: evento.tenantId,
        vendaLocalId: evento.payload?.vendaId || evento.payload?.venda_id,
        payload: {
          ...evento.payload,
          status: NFCE_EVENT_MAP[evento.eventType] || evento.payload?.status,
        },
      });
      return "Status fiscal do PDV sincronizado.";
    }

    default:
      return `Evento ${evento.eventType} recebido sem processamento específico.`;
  }
}

export async function processarEventoDesktopSync(evento) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const observacao = await processarEventoComClient(client, evento);
    await DesktopSyncDAO.atualizarEventoStatus(client, {
      desktopSyncEventoId: evento.desktopSyncEventoId,
      status: "processado",
      observacao,
    });
    await client.query("COMMIT");
    return { success: true, observacao };
  } catch (error) {
    await client.query("ROLLBACK");
    await DesktopSyncDAO.atualizarEventoStatus(pool, {
      desktopSyncEventoId: evento.desktopSyncEventoId,
      status: "erro",
      observacao: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}
