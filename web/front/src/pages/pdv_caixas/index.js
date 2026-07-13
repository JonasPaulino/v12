import React, { useContext, useEffect, useState } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import Paginacao from "components/paginacao";
import { AppContext } from "context";
import { getPdvCaixa, listPdvCaixas } from "./api";
import * as C from "../pdv_vendas/style";

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("pt-BR");
};

export const PdvCaixas = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let active = true;
    listPdvCaixas({ page, limit: 12, search, status })
      .then((response) => {
        if (!active) return;
        setRows(Array.isArray(response.data) ? response.data : []);
        setTotalPages(Number(response.totalPages || 1));
        setSelectedId((current) => {
          const exists = response.data?.find((item) => Number(item.pdv_caixa_id) === Number(current));
          return exists?.pdv_caixa_id || response.data?.[0]?.pdv_caixa_id || null;
        });
      })
      .catch(() => {
        if (!active) return;
        setRows([]);
        setTotalPages(1);
        setSelectedId(null);
      });

    return () => {
      active = false;
    };
  }, [page, search, status]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    getPdvCaixa(selectedId)
      .then((response) => {
        if (!active) return;
        setDetail(response.data || null);
      })
      .catch(() => {
        if (!active) return;
        setDetail(null);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  return (
    <C.Shell>
      <Sidebar />
      {mOpen && <C.Overlay onClick={abreFechaMenu} />}
      <C.Content>
        <Header />
        <C.Body>
          <C.Toolbar>
            <C.ToolbarGroup>
              <C.SearchInput
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Pesquisar por terminal, operador ou sessão"
              />
              <C.Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todos os status</option>
                <option value="aberto">Abertos</option>
                <option value="fechado">Fechados</option>
              </C.Select>
            </C.ToolbarGroup>
          </C.Toolbar>

          <C.Grid>
            <C.Panel>
              <C.PanelHeader>
                <C.PanelTitle>
                  <C.Title>Caixas do PDV</C.Title>
                  <C.Subtitle>{rows.length} caixa(s) nesta página</C.Subtitle>
                </C.PanelTitle>
              </C.PanelHeader>
              <C.List>
                {rows.length ? (
                  rows.map((item) => (
                    <C.Row
                      key={item.pdv_caixa_id}
                      type="button"
                      $active={Number(item.pdv_caixa_id) === Number(selectedId)}
                      onClick={() => setSelectedId(item.pdv_caixa_id)}
                    >
                      <C.RowTop>
                        <C.RowNumber>{item.terminal_codigo || "--"} • {item.operador_nome || "--"}</C.RowNumber>
                        <C.Badge $tone={item.status === "fechado" ? "primary" : "warning"}>
                          {item.status}
                        </C.Badge>
                      </C.RowTop>
                      <C.RowMeta>
                        <span>{item.sessao_codigo}</span>
                        <span>{formatDateTime(item.aberto_em)}</span>
                        <span>{item.terminal_nome || "--"}</span>
                      </C.RowMeta>
                      <C.RowTop>
                        <span />
                        <C.RowValue>{formatCurrency(item.total_vendido)}</C.RowValue>
                      </C.RowTop>
                    </C.Row>
                  ))
                ) : (
                  <C.Empty>Nenhum caixa do PDV encontrado para os filtros informados.</C.Empty>
                )}
              </C.List>
              <C.Footer>
                <Paginacao page={page} totalPages={totalPages} onPageChange={setPage} />
              </C.Footer>
            </C.Panel>

            <C.Panel>
              <C.PanelHeader>
                <C.PanelTitle>
                  <C.Title>Detalhes do caixa</C.Title>
                  <C.Subtitle>
                    {detail
                      ? `${detail.terminal_codigo || "--"} • ${detail.sessao_codigo || "--"}`
                      : "Selecione um caixa para visualizar"}
                  </C.Subtitle>
                </C.PanelTitle>
              </C.PanelHeader>
              <C.DetailBody>
                {detail ? (
                  <>
                    <C.StatsGrid>
                      <C.StatCard>
                        <C.StatLabel>Abertura</C.StatLabel>
                        <C.StatValue>{formatCurrency(detail.valor_abertura)}</C.StatValue>
                      </C.StatCard>
                      <C.StatCard>
                        <C.StatLabel>Fechamento</C.StatLabel>
                        <C.StatValue>{formatCurrency(detail.valor_fechamento)}</C.StatValue>
                      </C.StatCard>
                      <C.StatCard>
                        <C.StatLabel>Status</C.StatLabel>
                        <C.StatValue>{detail.status}</C.StatValue>
                      </C.StatCard>
                      <C.StatCard>
                        <C.StatLabel>Diferença</C.StatLabel>
                        <C.StatValue>{formatCurrency(detail.diferenca_fechamento)}</C.StatValue>
                      </C.StatCard>
                    </C.StatsGrid>

                    <C.Section>
                      <C.SectionTitle>Movimentos</C.SectionTitle>
                      <div style={{ overflow: "auto" }}>
                        <C.Table>
                          <C.Head>
                            <tr>
                              <C.HeadCell>Tipo</C.HeadCell>
                              <C.HeadCell>Valor</C.HeadCell>
                              <C.HeadCell>Motivo</C.HeadCell>
                              <C.HeadCell>Data</C.HeadCell>
                            </tr>
                          </C.Head>
                          <tbody>
                            {(detail.movimentos || []).map((item) => (
                              <tr key={item.pdv_caixa_movimento_id}>
                                <C.Cell>{item.tipo}</C.Cell>
                                <C.Cell>{formatCurrency(item.valor)}</C.Cell>
                                <C.Cell>{item.motivo || "--"}</C.Cell>
                                <C.Cell>{formatDateTime(item.criado_em)}</C.Cell>
                              </tr>
                            ))}
                          </tbody>
                        </C.Table>
                      </div>
                    </C.Section>

                    <C.Section>
                      <C.SectionTitle>Vendas do caixa</C.SectionTitle>
                      <div style={{ overflow: "auto" }}>
                        <C.Table>
                          <C.Head>
                            <tr>
                              <C.HeadCell>Venda</C.HeadCell>
                              <C.HeadCell>Cliente</C.HeadCell>
                              <C.HeadCell>Status</C.HeadCell>
                              <C.HeadCell>Total</C.HeadCell>
                              <C.HeadCell>Data</C.HeadCell>
                            </tr>
                          </C.Head>
                          <tbody>
                            {(detail.vendas || []).map((item) => (
                              <tr key={item.pdv_venda_id}>
                                <C.Cell>#{String(item.venda_local_id).padStart(6, "0")}</C.Cell>
                                <C.Cell>{item.cliente_nome || "Consumidor não identificado"}</C.Cell>
                                <C.Cell>{item.status}</C.Cell>
                                <C.Cell>{formatCurrency(item.total_liquido)}</C.Cell>
                                <C.Cell>{formatDateTime(item.concluida_em || item.cancelada_em)}</C.Cell>
                              </tr>
                            ))}
                          </tbody>
                        </C.Table>
                      </div>
                    </C.Section>
                  </>
                ) : (
                  <C.Empty>Selecione um caixa para carregar os detalhes do PDV.</C.Empty>
                )}
              </C.DetailBody>
            </C.Panel>
          </C.Grid>
        </C.Body>
      </C.Content>
    </C.Shell>
  );
};
