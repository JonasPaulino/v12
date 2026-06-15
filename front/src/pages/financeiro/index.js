import React, { useCallback, useContext, useState } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import Tabela from "./tabela";
import { ModalBaixa } from "./modal_baixa";
import { ModalTitulo } from "./modal_titulo";
import { useFinanceiroPage } from "./use";
import * as C from "./style";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const Financeiro = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    search,
    setSearch,
    debouncedSearch,
    tipo,
    setTipo,
    status,
    setStatus,
    openModal,
    openBaixaModal,
    selectedTituloId,
    selectedBaixaTituloId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleOpenBaixa,
    handleCancelar,
    handleCloseModal,
    handleCloseBaixaModal,
  } = useFinanceiroPage();
  const [resumo, setResumo] = useState({
    quantidadeTitulos: 0,
    totalReceber: 0,
    totalPagar: 0,
    totalVencido: 0,
  });

  const handleResumoChange = useCallback((nextResumo) => {
    setResumo(
      nextResumo || {
        quantidadeTitulos: 0,
        totalReceber: 0,
        totalPagar: 0,
        totalVencido: 0,
      }
    );
  }, []);

  return (
    <C.Shell>
      <Sidebar />
      {mOpen && <C.Overlay onClick={abreFechaMenu} />}

      <C.Content>
        <Header />

        <C.Body>
          <C.Toolbar>
            <C.ToolbarGroup>
              <C.CreateButton type="button" onClick={handleOpenNovo}>
                Novo título manual
              </C.CreateButton>

              <C.SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por código, pessoa, documento ou descrição"
              />
            </C.ToolbarGroup>

            <C.ToolbarGroup>
              <C.FilterSelect value={tipo} onChange={(event) => setTipo(event.target.value)}>
                <option value="">Todos os tipos</option>
                <option value="receber">Contas a receber</option>
                <option value="pagar">Contas a pagar</option>
              </C.FilterSelect>

              <C.FilterSelect value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Todos os status</option>
                <option value="aberto">Abertos</option>
                <option value="parcial">Parciais</option>
                <option value="quitado">Quitados</option>
                <option value="cancelado">Cancelados</option>
                <option value="vencido">Vencidos</option>
              </C.FilterSelect>
            </C.ToolbarGroup>
          </C.Toolbar>

          <C.SummaryGrid>
            <C.SummaryCard>
              <C.SummaryLabel>Títulos</C.SummaryLabel>
              <C.SummaryValue>{resumo.quantidadeTitulos}</C.SummaryValue>
            </C.SummaryCard>
            <C.SummaryCard>
              <C.SummaryLabel>Total a receber</C.SummaryLabel>
              <C.SummaryValue>{currencyFormatter.format(resumo.totalReceber || 0)}</C.SummaryValue>
            </C.SummaryCard>
            <C.SummaryCard>
              <C.SummaryLabel>Total a pagar</C.SummaryLabel>
              <C.SummaryValue>{currencyFormatter.format(resumo.totalPagar || 0)}</C.SummaryValue>
            </C.SummaryCard>
            <C.SummaryCard>
              <C.SummaryLabel>Total vencido</C.SummaryLabel>
              <C.SummaryValue>{currencyFormatter.format(resumo.totalVencido || 0)}</C.SummaryValue>
            </C.SummaryCard>
          </C.SummaryGrid>

          <C.TableArea>
            <Tabela
              search={debouncedSearch}
              tipo={tipo}
              status={status}
              refreshKey={refreshKey}
              onEditar={handleEditar}
              onBaixa={handleOpenBaixa}
              onCancelar={handleCancelar}
              onResumoChange={handleResumoChange}
            />
          </C.TableArea>
        </C.Body>
      </C.Content>

      <ModalTitulo
        isOpen={openModal}
        tituloId={selectedTituloId}
        initialTipo={["receber", "pagar"].includes(tipo) ? tipo : "receber"}
        onClose={handleCloseModal}
      />

      <ModalBaixa
        isOpen={openBaixaModal}
        tituloId={selectedBaixaTituloId}
        onClose={handleCloseBaixaModal}
      />
    </C.Shell>
  );
};
