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

const PAGE_CONFIG = {
  entrada: {
    showManualEntry: true,
    showImport: true,
    createLabel: "Nova entrada",
    importLabel: "Importar nota",
    searchPlaceholder: "Pesquisar por entrada, pedido ou fornecedor",
    onlyNfe: false,
    emptyMessage: "Nenhuma entrada de mercadoria encontrada.",
  },
  nfeRecebidas: {
    showManualEntry: false,
    showImport: true,
    importLabel: "Importar NF-e recebida",
    searchPlaceholder: "Pesquisar por NF-e, chave, fornecedor ou entrada",
    onlyNfe: true,
    emptyMessage: "Nenhuma NF-e recebida encontrada.",
  },
};

export const EntradaMercadoria = ({ mode = "entrada" }) => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const config = PAGE_CONFIG[mode] || PAGE_CONFIG.entrada;
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
              {config.showManualEntry && (
                <C.CreateButton type="button" onClick={handleOpenNovo}>
                  {config.createLabel}
                </C.CreateButton>
              )}
              {config.showImport && (
                <C.CreateButton type="button" onClick={handleOpenImportModal}>
                  {config.importLabel}
                </C.CreateButton>
              )}
            </C.ToolbarGroup>

            <C.ToolbarGroup>
              <C.SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={config.searchPlaceholder}
              />
            </C.ToolbarGroup>
          </C.Toolbar>

          <C.TableArea>
            <Tabela
              search={debouncedSearch}
              refreshKey={refreshKey}
              onViewDetails={handleOpenDetails}
              onlyNfe={config.onlyNfe}
              emptyMessage={config.emptyMessage}
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
