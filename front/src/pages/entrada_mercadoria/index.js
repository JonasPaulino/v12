import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import Tabela from "./tabela";
import { ModalEntradaMercadoria } from "./modal_entrada";
import { ModalDetalheEntradaMercadoria } from "./modal_detalhe";
import { ModalImportarNota } from "./modal_importar_nota";
import { useEntradaMercadoriaPage } from "./use";
import * as C from "./style";

export const EntradaMercadoria = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    search,
    setSearch,
    debouncedSearch,
    openModal,
    openImportModal,
    detailEntradaId,
    refreshKey,
    handleOpenNovo,
    handleCloseModal,
    handleOpenImportModal,
    handleCloseImportModal,
    handleOpenDetails,
    handleCloseDetails,
  } = useEntradaMercadoriaPage();

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
                Nova entrada
              </C.CreateButton>
              <C.CreateButton type="button" onClick={handleOpenImportModal}>
                Importar nota
              </C.CreateButton>
            </C.ToolbarGroup>

            <C.ToolbarGroup>
              <C.SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por entrada, pedido ou fornecedor"
              />
            </C.ToolbarGroup>
          </C.Toolbar>

          <C.TableArea>
            <Tabela
              search={debouncedSearch}
              refreshKey={refreshKey}
              onViewDetails={handleOpenDetails}
            />
          </C.TableArea>
        </C.Body>
      </C.Content>

      <ModalEntradaMercadoria isOpen={openModal} onClose={handleCloseModal} />
      <ModalImportarNota isOpen={openImportModal} onClose={handleCloseImportModal} />
      <ModalDetalheEntradaMercadoria
        entradaMercadoriaId={detailEntradaId}
        onClose={handleCloseDetails}
      />
    </C.Shell>
  );
};
