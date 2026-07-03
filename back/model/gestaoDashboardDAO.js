const toNumber = (value) => Number(value || 0);

const money = (value) => Number(value || 0);

class GestaoDashboardDAO {
  static async getResumo(client) {
    const indicadoresSql = `
      SELECT
        (
          SELECT COUNT(*)::int
          FROM tenant t
          WHERE t.tenant_ativo = TRUE
        ) AS clientes_ativos,
        (
          SELECT COUNT(*)::int
          FROM tenant t
          WHERE t.tenant_ativo = TRUE
            AND COALESCE(t.tenant_acesso_bloqueado, FALSE) = TRUE
        ) AS clientes_bloqueados,
        (
          SELECT COUNT(*)::int
          FROM gestao.pessoa p
          WHERE p.excluido = FALSE
            AND p.ativo = TRUE
        ) AS pessoas_ativas,
        (
          SELECT COUNT(*)::int
          FROM gestao.cliente_contrato cc
          WHERE cc.status = 'ativo'
        ) AS contratos_ativos,
        (
          SELECT COUNT(*)::int
          FROM gestao.usuario_interno gi
          JOIN usuario u ON u.usuario_id = gi.usuario_id
          WHERE gi.ativo = TRUE
            AND u.usuario_ativo = TRUE
            AND u.usuario_excluido = FALSE
        ) AS usuarios_internos_ativos,
        (
          SELECT COUNT(*)::int
          FROM chat.atendimento a
          WHERE a.status = 'aguardando'
        ) AS chat_aguardando,
        (
          SELECT COUNT(*)::int
          FROM chat.atendimento a
          WHERE a.status = 'em_atendimento'
        ) AS chat_em_atendimento,
        (
          SELECT COUNT(*)::int
          FROM chat.atendimento a
          WHERE a.status = 'encerrado'
            AND a.encerrado_em >= date_trunc('month', CURRENT_DATE)
        ) AS chat_encerrados_mes,
        (
          SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (a.primeira_resposta_em - a.criado_em)) / 60)::numeric, 1), 0)
          FROM chat.atendimento a
          WHERE a.primeira_resposta_em IS NOT NULL
            AND a.criado_em >= CURRENT_DATE - INTERVAL '30 days'
        ) AS chat_tempo_medio_resposta_min
    `;

    const financeiroSql = `
      SELECT
        COALESCE(SUM(CASE
          WHEN ft.tipo = 'receber'
           AND fp.status IN ('aberto', 'parcial', 'vencido')
          THEN GREATEST(fp.valor - fp.valor_pago, 0)
          ELSE 0
        END), 0) AS receber_aberto,
        COALESCE(SUM(CASE
          WHEN ft.tipo = 'receber'
           AND fp.status IN ('aberto', 'parcial', 'vencido')
           AND fp.vencimento < CURRENT_DATE
          THEN GREATEST(fp.valor - fp.valor_pago, 0)
          ELSE 0
        END), 0) AS receber_vencido,
        COALESCE(SUM(CASE
          WHEN ft.tipo = 'receber'
           AND fp.status = 'quitado'
           AND fp.pagamento_em >= date_trunc('month', CURRENT_DATE)::date
          THEN fp.valor_pago
          ELSE 0
        END), 0) AS recebido_mes,
        COALESCE(SUM(CASE
          WHEN ft.tipo = 'pagar'
           AND fp.status IN ('aberto', 'parcial', 'vencido')
          THEN GREATEST(fp.valor - fp.valor_pago, 0)
          ELSE 0
        END), 0) AS pagar_aberto,
        COALESCE(SUM(CASE
          WHEN ft.tipo = 'pagar'
           AND fp.status IN ('aberto', 'parcial', 'vencido')
           AND fp.vencimento < CURRENT_DATE
          THEN GREATEST(fp.valor - fp.valor_pago, 0)
          ELSE 0
        END), 0) AS pagar_vencido,
        COUNT(*) FILTER (
          WHERE ft.tipo = 'receber'
            AND fp.status IN ('aberto', 'parcial', 'vencido')
            AND fp.vencimento < CURRENT_DATE
        )::int AS parcelas_receber_vencidas,
        COUNT(*) FILTER (
          WHERE ft.tipo = 'pagar'
            AND fp.status IN ('aberto', 'parcial', 'vencido')
            AND fp.vencimento < CURRENT_DATE
        )::int AS parcelas_pagar_vencidas
      FROM gestao.financeiro_parcela fp
      JOIN gestao.financeiro_titulo ft
        ON ft.titulo_id = fp.titulo_id
      WHERE ft.excluido = FALSE
        AND fp.status <> 'cancelado'
    `;

    const vencimentosSql = `
      SELECT
        fp.parcela_id,
        ft.titulo_id,
        ft.tipo,
        ft.descricao,
        COALESCE(p.nome_razao, t.tenant_nome, 'Sem pessoa vinculada') AS pessoa_nome,
        fp.numero_parcela,
        fp.vencimento,
        GREATEST(fp.valor - fp.valor_pago, 0) AS saldo,
        fp.status
      FROM gestao.financeiro_parcela fp
      JOIN gestao.financeiro_titulo ft
        ON ft.titulo_id = fp.titulo_id
      LEFT JOIN gestao.pessoa p
        ON p.pessoa_id = ft.pessoa_id
      LEFT JOIN tenant t
        ON t.tenant_id = ft.tenant_id
      WHERE ft.excluido = FALSE
        AND fp.status IN ('aberto', 'parcial', 'vencido')
        AND fp.vencimento <= CURRENT_DATE + INTERVAL '15 days'
      ORDER BY fp.vencimento ASC, ft.tipo DESC, fp.parcela_id ASC
      LIMIT 8
    `;

    const chatFilaSql = `
      SELECT
        a.atendimento_id,
        a.protocolo,
        a.cliente_nome,
        a.assunto,
        a.status,
        c.nome AS categoria_nome,
        u.usuario_nome AS atendente_nome,
        a.criado_em,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - a.criado_em)) / 60)::int AS minutos_aguardando
      FROM chat.atendimento a
      JOIN chat.categoria c ON c.categoria_id = a.categoria_id
      LEFT JOIN usuario u ON u.usuario_id = a.atendente_usuario_id
      WHERE a.status IN ('aguardando', 'em_atendimento')
      ORDER BY
        CASE a.status WHEN 'aguardando' THEN 1 ELSE 2 END,
        a.criado_em ASC
      LIMIT 8
    `;

    const clientesRiscoSql = `
      SELECT
        t.tenant_id,
        t.tenant_nome,
        COALESCE(t.tenant_acesso_bloqueado, FALSE) AS acesso_bloqueado,
        COUNT(fp.parcela_id)::int AS parcelas_vencidas,
        COALESCE(SUM(GREATEST(fp.valor - fp.valor_pago, 0)), 0) AS saldo_vencido,
        MIN(fp.vencimento) AS vencimento_mais_antigo
      FROM tenant t
      JOIN gestao.financeiro_titulo ft
        ON ft.tenant_id = t.tenant_id
       AND ft.tipo = 'receber'
       AND ft.excluido = FALSE
      JOIN gestao.financeiro_parcela fp
        ON fp.titulo_id = ft.titulo_id
       AND fp.status IN ('aberto', 'parcial', 'vencido')
       AND fp.vencimento < CURRENT_DATE
      WHERE t.tenant_ativo = TRUE
      GROUP BY t.tenant_id, t.tenant_nome, t.tenant_acesso_bloqueado
      ORDER BY saldo_vencido DESC, vencimento_mais_antigo ASC
      LIMIT 6
    `;

    const [indicadoresResult, financeiroResult, vencimentosResult, chatFilaResult, clientesRiscoResult] =
      await Promise.all([
        client.query(indicadoresSql),
        client.query(financeiroSql),
        client.query(vencimentosSql),
        client.query(chatFilaSql),
        client.query(clientesRiscoSql),
      ]);

    const indicadores = indicadoresResult.rows[0] || {};
    const financeiro = financeiroResult.rows[0] || {};

    return {
      indicadores: {
        clientesAtivos: toNumber(indicadores.clientes_ativos),
        clientesBloqueados: toNumber(indicadores.clientes_bloqueados),
        pessoasAtivas: toNumber(indicadores.pessoas_ativas),
        contratosAtivos: toNumber(indicadores.contratos_ativos),
        usuariosInternosAtivos: toNumber(indicadores.usuarios_internos_ativos),
        receberAberto: money(financeiro.receber_aberto),
        receberVencido: money(financeiro.receber_vencido),
        recebidoMes: money(financeiro.recebido_mes),
        pagarAberto: money(financeiro.pagar_aberto),
        pagarVencido: money(financeiro.pagar_vencido),
        parcelasReceberVencidas: toNumber(financeiro.parcelas_receber_vencidas),
        parcelasPagarVencidas: toNumber(financeiro.parcelas_pagar_vencidas),
        chatAguardando: toNumber(indicadores.chat_aguardando),
        chatEmAtendimento: toNumber(indicadores.chat_em_atendimento),
        chatEncerradosMes: toNumber(indicadores.chat_encerrados_mes),
        chatTempoMedioRespostaMin: toNumber(indicadores.chat_tempo_medio_resposta_min),
      },
      vencimentos: vencimentosResult.rows,
      chatFila: chatFilaResult.rows,
      clientesRisco: clientesRiscoResult.rows,
    };
  }
}

export default GestaoDashboardDAO;
