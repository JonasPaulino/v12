import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "api/axiosConfig";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import { GestaoV12Layout } from "layouts/gestao_v12";
import * as C from "./style";

const formatMoney = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const formatNumber = (value) => new Intl.NumberFormat("pt-BR").format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("pt-BR");
};

const truncate = (value, maxLength = 82) => {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text || "--";
  return `${text.slice(0, maxLength - 3).trim()}...`;
};

const statusLabel = {
  aguardando: "Aguardando",
  em_atendimento: "Em atendimento",
  aberto: "Aberto",
  parcial: "Parcial",
  vencido: "Vencido",
  quitado: "Quitado",
  cancelado: "Cancelado",
};

export const GestaoV12Dashboard = () => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const indicadores = data?.indicadores || {};
  const vencimentos = data?.vencimentos || [];
  const chatFila = data?.chatFila || [];
  const clientesRisco = data?.clientesRisco || [];

  const kpis = useMemo(
    () => [
      {
        label: "Clientes ativos",
        value: formatNumber(indicadores.clientesAtivos),
        hint: `${formatNumber(indicadores.contratosAtivos)} contrato(s) ativo(s)`,
        tone: "blue",
      },
      {
        label: "A receber aberto",
        value: formatMoney(indicadores.receberAberto),
        hint: `${formatMoney(indicadores.receberVencido)} vencido`,
        tone: indicadores.receberVencido > 0 ? "danger" : "green",
      },
      {
        label: "Recebido no mês",
        value: formatMoney(indicadores.recebidoMes),
        hint: "Baixas registradas neste mês",
        tone: "green",
      },
      {
        label: "Chat aguardando",
        value: formatNumber(indicadores.chatAguardando),
        hint: `${formatNumber(indicadores.chatEmAtendimento)} em atendimento`,
        tone: indicadores.chatAguardando > 0 ? "warning" : "blue",
      },
      {
        label: "Clientes bloqueados",
        value: formatNumber(indicadores.clientesBloqueados),
        hint: "Filiais com acesso bloqueado",
        tone: indicadores.clientesBloqueados > 0 ? "danger" : "blue",
      },
      {
        label: "A pagar aberto",
        value: formatMoney(indicadores.pagarAberto),
        hint: `${formatMoney(indicadores.pagarVencido)} vencido`,
        tone: indicadores.pagarVencido > 0 ? "warning" : "blue",
      },
      {
        label: "Pessoas cadastradas",
        value: formatNumber(indicadores.pessoasAtivas),
        hint: "Clientes, fornecedores e contatos da gestão",
        tone: "blue",
      },
      {
        label: "Resposta média",
        value: `${formatNumber(indicadores.chatTempoMedioRespostaMin)} min`,
        hint: `${formatNumber(indicadores.chatEncerradosMes)} atendimento(s) encerrado(s) no mês`,
        tone: "blue",
      },
    ],
    [indicadores]
  );

  const loadDashboard = useCallback(async ({ silent = false } = {}) => {
    setLoading(true);
    if (!silent) showLoading("Carregando dashboard...");
    try {
      const response = await api.get("/gestao/dashboard");
      setData(response.data?.data || {});
    } catch (error) {
      hideLoading();
      showAlert?.({
        title: "Falha ao carregar dashboard",
        text: error?.response?.data?.message || "Não foi possível carregar os indicadores.",
        icon: "error",
      });
    } finally {
      setLoading(false);
      if (!silent) hideLoading();
    }
  }, [hideLoading, showAlert, showLoading]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <GestaoV12Layout
      title="Dashboard Gestão"
      subtitle="Indicadores reais da operação comercial, financeira e atendimento da V12."
    >
      <C.Grid>
        <C.HeaderRow>
          <C.SectionTitle>Visão geral</C.SectionTitle>
          <C.RefreshButton type="button" onClick={() => loadDashboard()} disabled={loading}>
            {loading ? "Atualizando..." : "Atualizar"}
          </C.RefreshButton>
        </C.HeaderRow>

        <C.KpiGrid>
          {kpis.map((item) => (
            <C.KpiCard key={item.label} $tone={item.tone}>
              <C.KpiLabel>{item.label}</C.KpiLabel>
              <C.KpiValue>{item.value}</C.KpiValue>
              <C.KpiHint>{item.hint}</C.KpiHint>
            </C.KpiCard>
          ))}
        </C.KpiGrid>

        <C.Panels>
          <C.Panel>
            <C.PanelHeader>
              <C.PanelTitle>Próximos vencimentos</C.PanelTitle>
              <C.PanelText>Recebimentos e pagamentos previstos para os próximos 15 dias.</C.PanelText>
            </C.PanelHeader>

            <C.List>
              {vencimentos.length ? (
                vencimentos.map((item) => (
                  <C.ListItem key={item.parcela_id}>
                    <C.ItemMain>
                      <strong>{truncate(item.pessoa_nome || item.descricao)}</strong>
                      <span>
                        {item.tipo === "pagar" ? "A pagar" : "A receber"} · Parcela {item.numero_parcela} ·{" "}
                        {formatDate(item.vencimento)}
                      </span>
                    </C.ItemMain>
                    <C.ItemAside>
                      <strong>{formatMoney(item.saldo)}</strong>
                      <C.StatusBadge $status={item.status}>{statusLabel[item.status] || item.status}</C.StatusBadge>
                    </C.ItemAside>
                  </C.ListItem>
                ))
              ) : (
                <C.Empty>Sem vencimentos próximos.</C.Empty>
              )}
            </C.List>
          </C.Panel>

          <C.Panel>
            <C.PanelHeader>
              <C.PanelTitle>Fila do chat</C.PanelTitle>
              <C.PanelText>Atendimentos aguardando ou em andamento.</C.PanelText>
            </C.PanelHeader>

            <C.List>
              {chatFila.length ? (
                chatFila.map((item) => (
                  <C.ListItem key={item.atendimento_id}>
                    <C.ItemMain>
                      <strong>{truncate(item.cliente_nome, 56)}</strong>
                      <span>
                        {item.categoria_nome} · {statusLabel[item.status] || item.status} ·{" "}
                        {item.minutos_aguardando} min
                      </span>
                      <small>{truncate(item.assunto, 96)}</small>
                    </C.ItemMain>
                    <C.ItemAside>
                      <C.StatusBadge $status={item.status}>{statusLabel[item.status] || item.status}</C.StatusBadge>
                      <span>{item.atendente_nome || "Sem atendente"}</span>
                    </C.ItemAside>
                  </C.ListItem>
                ))
              ) : (
                <C.Empty>Sem atendimentos em fila.</C.Empty>
              )}
            </C.List>
          </C.Panel>

          <C.Panel $wide>
            <C.PanelHeader>
              <C.PanelTitle>Clientes com cobrança vencida</C.PanelTitle>
              <C.PanelText>Clientes que exigem ação financeira ou bloqueio manual.</C.PanelText>
            </C.PanelHeader>

            <C.List>
              {clientesRisco.length ? (
                clientesRisco.map((item) => (
                  <C.ListItem key={item.tenant_id}>
                    <C.ItemMain>
                      <strong>{truncate(item.tenant_nome, 70)}</strong>
                      <span>
                        {item.parcelas_vencidas} parcela(s) vencida(s) desde{" "}
                        {formatDate(item.vencimento_mais_antigo)}
                      </span>
                    </C.ItemMain>
                    <C.ItemAside>
                      <strong>{formatMoney(item.saldo_vencido)}</strong>
                      <C.StatusBadge $status={item.acesso_bloqueado ? "bloqueado" : "vencido"}>
                        {item.acesso_bloqueado ? "Bloqueado" : "Ativo"}
                      </C.StatusBadge>
                    </C.ItemAside>
                  </C.ListItem>
                ))
              ) : (
                <C.Empty>Sem clientes com cobrança vencida.</C.Empty>
              )}
            </C.List>
          </C.Panel>
        </C.Panels>
      </C.Grid>
    </GestaoV12Layout>
  );
};
