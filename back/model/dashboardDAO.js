import tenantDAO from "./tenantDAO.js";
import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

const toNumber = (value) => Number(value || 0);

class DashboardDAO {
  static async getResumo(client, usuarioId) {
    const tenant = await tenantDAO.getCurrent(client);

    const usuarioSql = `
      SELECT
        usuario_id,
        usuario_nome,
        usuario_email,
        usuario_username
      FROM usuario
      WHERE usuario_id = $1
      LIMIT 1
    `;

    const indicadoresSql = `
      SELECT
        (
          SELECT COUNT(*)
          FROM pessoa p
          JOIN pessoa_tenant pt
            ON pt.pessoa_id = p.pessoa_id
           AND pt.tenant_id = ${TENANT_CONTEXT_SQL}
           AND pt.ativo = TRUE
          WHERE p.pessoa_excluido = FALSE
            AND p.pessoa_ativo = TRUE
        ) AS clientes_ativos,
        (
          SELECT COUNT(*)
          FROM produto p
          WHERE p.tenant_id = ${TENANT_CONTEXT_SQL}
            AND p.excluido = FALSE
            AND p.ativo = TRUE
        ) AS produtos_ativos,
        (
          SELECT COUNT(*)
          FROM pedido_venda pv
          WHERE pv.tenant_id = ${TENANT_CONTEXT_SQL}
            AND pv.excluido = FALSE
            AND pv.status <> 'cancelado'
        ) AS pedidos_ativos,
        (
          SELECT COUNT(*)
          FROM pedido_venda pv
          WHERE pv.tenant_id = ${TENANT_CONTEXT_SQL}
            AND pv.excluido = FALSE
            AND pv.status <> 'cancelado'
            AND date_trunc('month', pv.data_emissao) = date_trunc('month', CURRENT_DATE)
        ) AS pedidos_mes,
        (
          SELECT COALESCE(SUM(pv.total), 0)
          FROM pedido_venda pv
          WHERE pv.tenant_id = ${TENANT_CONTEXT_SQL}
            AND pv.excluido = FALSE
            AND pv.status <> 'cancelado'
            AND date_trunc('month', pv.data_emissao) = date_trunc('month', CURRENT_DATE)
        ) AS faturamento_mes,
        (
          SELECT COUNT(*)
          FROM financeiro_titulo_parcela ftp
          JOIN financeiro_titulo ft
            ON ft.financeiro_titulo_id = ftp.financeiro_titulo_id
           AND ft.tenant_id = ftp.tenant_id
          WHERE ft.tenant_id = ${TENANT_CONTEXT_SQL}
            AND ft.excluido = FALSE
            AND ft.tipo = 'receber'
            AND ftp.status IN ('aberta', 'parcial', 'vencida')
        ) AS parcelas_receber,
        (
          SELECT COALESCE(SUM(GREATEST(ftp.valor_parcela - ftp.valor_recebido, 0)), 0)
          FROM financeiro_titulo_parcela ftp
          JOIN financeiro_titulo ft
            ON ft.financeiro_titulo_id = ftp.financeiro_titulo_id
           AND ft.tenant_id = ftp.tenant_id
          WHERE ft.tenant_id = ${TENANT_CONTEXT_SQL}
            AND ft.excluido = FALSE
            AND ft.tipo = 'receber'
            AND ftp.status IN ('aberta', 'parcial', 'vencida')
        ) AS saldo_receber,
        (
          SELECT COUNT(*)
          FROM financeiro_titulo_parcela ftp
          JOIN financeiro_titulo ft
            ON ft.financeiro_titulo_id = ftp.financeiro_titulo_id
           AND ft.tenant_id = ftp.tenant_id
          WHERE ft.tenant_id = ${TENANT_CONTEXT_SQL}
            AND ft.excluido = FALSE
            AND ft.tipo = 'receber'
            AND ftp.status IN ('aberta', 'parcial', 'vencida')
            AND ftp.data_vencimento < CURRENT_DATE
        ) AS parcelas_vencidas,
        (
          SELECT COALESCE(SUM(GREATEST(ftp.valor_parcela - ftp.valor_recebido, 0)), 0)
          FROM financeiro_titulo_parcela ftp
          JOIN financeiro_titulo ft
            ON ft.financeiro_titulo_id = ftp.financeiro_titulo_id
           AND ft.tenant_id = ftp.tenant_id
          WHERE ft.tenant_id = ${TENANT_CONTEXT_SQL}
            AND ft.excluido = FALSE
            AND ft.tipo = 'receber'
            AND ftp.status IN ('aberta', 'parcial', 'vencida')
            AND ftp.data_vencimento < CURRENT_DATE
        ) AS saldo_vencido
    `;

    const vendasPeriodoSql = `
      WITH dias AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 day',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS dia
      )
      SELECT
        TO_CHAR(d.dia, 'YYYY-MM-DD') AS data,
        COALESCE(SUM(pv.total), 0) AS total,
        COALESCE(COUNT(pv.pedido_venda_id), 0) AS quantidade
      FROM dias d
      LEFT JOIN pedido_venda pv
        ON pv.tenant_id = ${TENANT_CONTEXT_SQL}
       AND pv.excluido = FALSE
       AND pv.status <> 'cancelado'
       AND pv.data_emissao = d.dia
      GROUP BY d.dia
      ORDER BY d.dia
    `;

    const carteiraStatusSql = `
      SELECT
        ftp.status,
        COUNT(*)::int AS quantidade,
        COALESCE(SUM(GREATEST(ftp.valor_parcela - ftp.valor_recebido, 0)), 0) AS valor
      FROM financeiro_titulo_parcela ftp
      JOIN financeiro_titulo ft
        ON ft.financeiro_titulo_id = ftp.financeiro_titulo_id
       AND ft.tenant_id = ftp.tenant_id
      WHERE ft.tenant_id = ${TENANT_CONTEXT_SQL}
        AND ft.excluido = FALSE
        AND ft.tipo = 'receber'
        AND ftp.status <> 'cancelada'
      GROUP BY ftp.status
      ORDER BY quantidade DESC, ftp.status
    `;

    const topProdutosSql = `
      SELECT
        pvi.produto_id,
        COALESCE(MAX(NULLIF(TRIM(pvi.descricao), '')), 'Produto sem descrição') AS descricao,
        COALESCE(SUM(pvi.quantidade), 0) AS quantidade,
        COALESCE(SUM(pvi.valor_total), 0) AS total
      FROM pedido_venda_item pvi
      JOIN pedido_venda pv
        ON pv.pedido_venda_id = pvi.pedido_venda_id
       AND pv.tenant_id = pvi.tenant_id
      WHERE pvi.tenant_id = ${TENANT_CONTEXT_SQL}
        AND pv.excluido = FALSE
        AND pv.status <> 'cancelado'
      GROUP BY pvi.produto_id
      ORDER BY total DESC, quantidade DESC
      LIMIT 4
    `;

    const proximosRecebimentosSql = `
      SELECT
        ft.financeiro_titulo_id,
        ftp.financeiro_titulo_parcela_id,
        p.pessoa_nome_razao,
        ftp.numero_parcela,
        ftp.data_vencimento,
        GREATEST(ftp.valor_parcela - ftp.valor_recebido, 0) AS saldo
      FROM financeiro_titulo_parcela ftp
      JOIN financeiro_titulo ft
        ON ft.financeiro_titulo_id = ftp.financeiro_titulo_id
       AND ft.tenant_id = ftp.tenant_id
      JOIN pessoa p
        ON p.pessoa_id = ft.pessoa_id
      WHERE ft.tenant_id = ${TENANT_CONTEXT_SQL}
        AND ft.excluido = FALSE
        AND ft.tipo = 'receber'
        AND ftp.status IN ('aberta', 'parcial', 'vencida')
        AND ftp.data_vencimento <= CURRENT_DATE + INTERVAL '15 day'
      ORDER BY ftp.data_vencimento ASC, ftp.numero_parcela ASC
      LIMIT 4
    `;

    const [
      usuarioResult,
      indicadoresResult,
      vendasPeriodoResult,
      carteiraStatusResult,
      topProdutosResult,
      proximosRecebimentosResult,
    ] = await Promise.all([
      client.query(usuarioSql, [usuarioId]),
      client.query(indicadoresSql),
      client.query(vendasPeriodoSql),
      client.query(carteiraStatusSql),
      client.query(topProdutosSql),
      client.query(proximosRecebimentosSql),
    ]);

    const indicadores = indicadoresResult.rows[0] || {};
    const pedidosMes = toNumber(indicadores.pedidos_mes);
    const faturamentoMes = toNumber(indicadores.faturamento_mes);

    return {
      tenant,
      usuario: usuarioResult.rows[0] || null,
      indicadores: {
        clientesAtivos: toNumber(indicadores.clientes_ativos),
        produtosAtivos: toNumber(indicadores.produtos_ativos),
        pedidosAtivos: toNumber(indicadores.pedidos_ativos),
        pedidosMes,
        faturamentoMes,
        ticketMedioMes: pedidosMes > 0 ? faturamentoMes / pedidosMes : 0,
        parcelasReceber: toNumber(indicadores.parcelas_receber),
        saldoReceber: toNumber(indicadores.saldo_receber),
        parcelasVencidas: toNumber(indicadores.parcelas_vencidas),
        saldoVencido: toNumber(indicadores.saldo_vencido),
      },
      graficos: {
        vendasUltimos7Dias: vendasPeriodoResult.rows.map((row) => ({
          data: row.data,
          total: toNumber(row.total),
          quantidade: toNumber(row.quantidade),
        })),
        carteiraPorStatus: carteiraStatusResult.rows.map((row) => ({
          status: row.status,
          quantidade: toNumber(row.quantidade),
          valor: toNumber(row.valor),
        })),
        topProdutos: topProdutosResult.rows.map((row) => ({
          produto_id: toNumber(row.produto_id),
          descricao: row.descricao,
          quantidade: toNumber(row.quantidade),
          total: toNumber(row.total),
        })),
      },
      proximosRecebimentos: proximosRecebimentosResult.rows.map((row) => ({
        financeiro_titulo_id: toNumber(row.financeiro_titulo_id),
        financeiro_titulo_parcela_id: toNumber(row.financeiro_titulo_parcela_id),
        pessoa_nome_razao: row.pessoa_nome_razao,
        numero_parcela: toNumber(row.numero_parcela),
        data_vencimento: row.data_vencimento,
        saldo: toNumber(row.saldo),
      })),
    };
  }
}

export default DashboardDAO;
