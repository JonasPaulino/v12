import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import { LineChart, BarChart, DonutChart } from "./components/charts";
import * as C from "./style";
import { useDashboard } from "./use";

export const Dashboard = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    data,
    kpis,
    loading,
    formatCurrency,
    formatCompactCurrency,
    formatDateLabel,
    formatStatusLabel,
  } = useDashboard();

  const vendasUltimos7Dias = data?.graficos?.vendasUltimos7Dias || [];
  const carteiraPorStatus = data?.graficos?.carteiraPorStatus || [];
  const topProdutos = data?.graficos?.topProdutos || [];
  const proximosRecebimentos = data?.proximosRecebimentos || [];

  return (
    <C.Shell>
      <Sidebar />
      {mOpen && <C.Overlay onClick={abreFechaMenu} />}

      <C.Content>
        <Header />

        <C.Body>
          <C.KpiGrid>
            {kpis.map((item) => (
              <C.KpiCard key={item.id} $accent={item.accent}>
                <C.KpiLabel>{item.label}</C.KpiLabel>
                <C.KpiValue>{item.value}</C.KpiValue>
                <C.KpiHint>{item.hint}</C.KpiHint>
              </C.KpiCard>
            ))}
          </C.KpiGrid>

          <C.AnalyticsGrid>
            <C.Panel>
              <C.PanelHeader>
                <div>
                  <C.PanelTitle>Carteira a receber</C.PanelTitle>
                </div>
                <C.PanelBadge>{loading ? "..." : "pizza"}</C.PanelBadge>
              </C.PanelHeader>

              <C.PanelContent>
                <DonutChart
                  data={carteiraPorStatus}
                  valueFormatter={formatCompactCurrency}
                  labelFormatter={formatStatusLabel}
                />
              </C.PanelContent>
            </C.Panel>

            <C.Panel>
              <C.PanelHeader>
                <div>
                  <C.PanelTitle>Próximos recebimentos</C.PanelTitle>
                </div>
                <C.PanelBadge>{proximosRecebimentos.length} itens</C.PanelBadge>
              </C.PanelHeader>

              <C.PanelContent>
                {proximosRecebimentos.length ? (
                  <C.ReceivablesList>
                    {proximosRecebimentos.map((item) => (
                      <C.ReceivableItem key={item.financeiro_titulo_parcela_id}>
                        <C.ReceivableTop>
                          <C.ReceivableName>{item.pessoa_nome_razao}</C.ReceivableName>
                          <C.ReceivableValue>{formatCurrency(item.saldo)}</C.ReceivableValue>
                        </C.ReceivableTop>
                        <C.ReceivableMeta>
                          <span>Parcela {item.numero_parcela}</span>
                          <span>Vencimento {formatDateLabel(item.data_vencimento)}</span>
                        </C.ReceivableMeta>
                      </C.ReceivableItem>
                    ))}
                  </C.ReceivablesList>
                ) : (
                  <C.EmptyArea>
                    Nenhuma parcela aberta foi encontrada no horizonte dos próximos 15 dias.
                  </C.EmptyArea>
                )}
              </C.PanelContent>
            </C.Panel>

            <C.Panel>
              <C.PanelHeader>
                <div>
                  <C.PanelTitle>Produtos com maior faturamento</C.PanelTitle>
                </div>
                <C.PanelBadge>{loading ? "..." : "barra"}</C.PanelBadge>
              </C.PanelHeader>

              <C.PanelContent>
                <BarChart
                  data={topProdutos}
                  valueFormatter={formatCurrency}
                  quantityFormatter={(value) => `${value} un.`}
                />
              </C.PanelContent>
            </C.Panel>
          </C.AnalyticsGrid>

          <C.BottomRow>
            <C.Panel>
              <C.PanelHeader>
                <div>
                  <C.PanelTitle>Vendas nos últimos 7 dias</C.PanelTitle>
                </div>
                <C.PanelBadge>{loading ? "carregando" : "linha"}</C.PanelBadge>
              </C.PanelHeader>

              <C.PanelContent>
                <LineChart
                  data={vendasUltimos7Dias}
                  valueFormatter={formatCompactCurrency}
                  labelFormatter={formatDateLabel}
                />
              </C.PanelContent>
            </C.Panel>
          </C.BottomRow>
        </C.Body>
      </C.Content>
    </C.Shell>
  );
};
