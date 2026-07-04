import React, { useContext, useState } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import Tabela from "./tabela";
import { ModalAjusteEstoque } from "./modal_ajuste";
import { useEstoquePage } from "./use";
import * as C from "./style";

export const Estoque = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    debouncedSearch,
    openAjusteModal,
    refreshKey,
    handleOpenAjuste,
    handleCloseAjuste,
  } = useEstoquePage();
  const [produtoAjuste, setProdutoAjuste] = useState(null);

  const handleAjusteProduto = (produto) => {
    setProdutoAjuste(produto);
    handleOpenAjuste();
  };

  const handleNovoAjuste = () => {
    setProdutoAjuste(null);
    handleOpenAjuste();
  };

  const handleCloseModal = (shouldRefresh = false) => {
    setProdutoAjuste(null);
    handleCloseAjuste(shouldRefresh);
  };

  return (
    <C.Shell>
      <Sidebar />
      {mOpen && <C.Overlay onClick={abreFechaMenu} />}

      <C.Content>
        <Header />

        <C.Body>
          <C.Toolbar>
            <C.ToolbarGroup>
              <C.CreateButton type="button" onClick={handleNovoAjuste}>
                Ajuste manual
              </C.CreateButton>
            </C.ToolbarGroup>

            <C.ToolbarGroup>
              <C.SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por produto, código, NCM ou origem"
              />
            </C.ToolbarGroup>
          </C.Toolbar>

          <C.Tabs>
            <C.TabButton
              type="button"
              $active={activeTab === "saldos"}
              onClick={() => setActiveTab("saldos")}
            >
              Saldos
            </C.TabButton>
            <C.TabButton
              type="button"
              $active={activeTab === "movimentacoes"}
              onClick={() => setActiveTab("movimentacoes")}
            >
              Movimentações
            </C.TabButton>
          </C.Tabs>

          <C.TableArea>
            <Tabela
              activeTab={activeTab}
              search={debouncedSearch}
              refreshKey={refreshKey}
              onAjusteProduto={handleAjusteProduto}
            />
          </C.TableArea>
        </C.Body>
      </C.Content>

      <ModalAjusteEstoque
        isOpen={openAjusteModal}
        produtoInicial={produtoAjuste}
        onClose={handleCloseModal}
      />
    </C.Shell>
  );
};
