import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import Tabela from "./tabela";
import { ModalProduto } from "./modal_produto";
import { useProdutoPage } from "./use";
import * as C from "./style";

export const Produto = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    search,
    setSearch,
    debouncedSearch,
    openModal,
    selectedProdutoId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleCloseModal,
    handleRefreshList,
  } = useProdutoPage();

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
                Cadastrar produto
              </C.CreateButton>
            </C.ToolbarGroup>

            <C.ToolbarGroup>
              <C.SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por codigo, descricao ou NCM"
              />
            </C.ToolbarGroup>
          </C.Toolbar>

          <C.TableArea>
            <Tabela
              search={debouncedSearch}
              refreshKey={refreshKey}
              onEditar={handleEditar}
              onDeleted={handleRefreshList}
            />
          </C.TableArea>
        </C.Body>
      </C.Content>

      <ModalProduto
        isOpen={openModal}
        produtoId={selectedProdutoId}
        onClose={handleCloseModal}
      />
    </C.Shell>
  );
};
