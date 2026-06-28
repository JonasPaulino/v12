import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import Tabela from "./tabela";
import { ModalDevolucao } from "./modal_devolucao";
import { ModalEditarDevolucao } from "./modal_editar_devolucao";
import { useDevolucaoPage } from "./use";
import * as C from "./style";

export const Devolucao = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    search,
    setSearch,
    debouncedSearch,
    openModal,
    selectedDevolucaoId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleCloseModal,
    handleCloseEditModal,
    handleRefreshList,
  } = useDevolucaoPage();

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
                Nova devolução
              </C.CreateButton>
            </C.ToolbarGroup>

            <C.ToolbarGroup>
              <C.SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por devolução, cliente, fornecedor ou documento"
              />
            </C.ToolbarGroup>
          </C.Toolbar>

          <C.TableArea>
            <Tabela
              search={debouncedSearch}
              refreshKey={refreshKey}
              onEditar={handleEditar}
              onCanceled={handleRefreshList}
            />
          </C.TableArea>
        </C.Body>
      </C.Content>

      <ModalDevolucao isOpen={openModal} onClose={handleCloseModal} />
      <ModalEditarDevolucao
        devolucaoId={selectedDevolucaoId}
        isOpen={!!selectedDevolucaoId}
        onClose={handleCloseEditModal}
      />
    </C.Shell>
  );
};
