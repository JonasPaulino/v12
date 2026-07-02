import React from "react";
import { GestaoV12Layout } from "layouts/gestao_v12";
import * as C from "./style";

const kpis = [
  {
    label: "Clientes ativos",
    value: "--",
    hint: "Empresas liberadas para uso do V12.",
  },
  {
    label: "Receita prevista",
    value: "R$ --",
    hint: "Mensalidades abertas do período.",
  },
  {
    label: "Inadimplentes",
    value: "--",
    hint: "Clientes com cobrança vencida.",
  },
  {
    label: "Bloqueios pendentes",
    value: "--",
    hint: "Contratos que precisam de ação.",
  },
];

export const GestaoV12Dashboard = () => (
  <GestaoV12Layout
    title="Dashboard Gestão"
    subtitle="Indicadores internos da operação comercial e financeira do V12."
  >
    <C.Grid>
      <C.Hero>
        <C.Badge>Gestão interna</C.Badge>
        <C.Title>Controle da empresa V12</C.Title>
        <C.Text>
          Este ambiente é separado do ERP usado pelos clientes. Aqui ficam cadastro
          de clientes, contratos, parcelas, cobranças, usuários internos e
          configurações administrativas da operação V12.
        </C.Text>
      </C.Hero>

      <C.KpiGrid>
        {kpis.map((item) => (
          <C.KpiCard key={item.label}>
            <C.KpiLabel>{item.label}</C.KpiLabel>
            <C.KpiValue>{item.value}</C.KpiValue>
            <C.KpiHint>{item.hint}</C.KpiHint>
          </C.KpiCard>
        ))}
      </C.KpiGrid>

      <C.Panels>
        <C.Panel>
          <C.PanelTitle>Próximas entregas</C.PanelTitle>
          <C.TaskList>
            <C.Task>
              <strong>Financeiro da gestão</strong>
              <span>Listar parcelas do schema gestão e gerar cobranças Asaas.</span>
            </C.Task>
            <C.Task>
              <strong>Bloqueio por inadimplência</strong>
              <span>Impedir login do cliente conforme regra do contrato.</span>
            </C.Task>
            <C.Task>
              <strong>Webhook Asaas da V12</strong>
              <span>Baixar mensalidades sem misturar com o Asaas das filiais.</span>
            </C.Task>
          </C.TaskList>
        </C.Panel>

        <C.Panel>
          <C.PanelTitle>Separação aplicada</C.PanelTitle>
          <C.Text>
            O modo Gestão V12 não usa seletor de filial e não deve gravar dados no
            financeiro operacional dos clientes. A base financeira interna usa o
            schema `gestao`.
          </C.Text>
        </C.Panel>
      </C.Panels>
    </C.Grid>
  </GestaoV12Layout>
);
