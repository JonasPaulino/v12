import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import Tabela from "./tabela";
import { ModalVenda } from "./modal_venda";
import { useVendaPage } from "./use";
import * as C from "./style";

export const Venda = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    search,
    setSearch,
    debouncedSearch,
    openModal,
    selectedVendaId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleCloseModal,
    handleRefreshList,
  } = useVendaPage();

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
                Novo pedido de venda
              </C.CreateButton>
            </C.ToolbarGroup>

            <C.ToolbarGroup>
              <C.SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por número, cliente ou documento"
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

      <ModalVenda
        isOpen={openModal}
        vendaId={selectedVendaId}
        onClose={handleCloseModal}
      />
    </C.Shell>
  );
};
