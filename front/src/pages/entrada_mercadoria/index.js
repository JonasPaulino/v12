import React, { useContext, useRef } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import Tabela from "./tabela";
import { ModalEntradaMercadoria } from "./modal_entrada";
import { useEntradaMercadoriaPage } from "./use";
import * as C from "./style";

export const EntradaMercadoria = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const xmlInputRef = useRef(null);
  const {
    search,
    setSearch,
    debouncedSearch,
    openModal,
    importingXml,
    refreshKey,
    handleOpenNovo,
    handleCloseModal,
    handleImportXml,
  } = useEntradaMercadoriaPage();

  const handleSelectXml = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = "";
    handleImportXml(file);
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
              <C.CreateButton type="button" onClick={handleOpenNovo}>
                Nova entrada
              </C.CreateButton>
              <C.CreateButton
                type="button"
                onClick={() => xmlInputRef.current?.click()}
                disabled={importingXml}
              >
                {importingXml ? "Importando..." : "Importar XML"}
              </C.CreateButton>
              <input
                ref={xmlInputRef}
                type="file"
                accept=".xml,text/xml,application/xml"
                onChange={handleSelectXml}
                hidden
              />
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
            <Tabela search={debouncedSearch} refreshKey={refreshKey} />
          </C.TableArea>
        </C.Body>
      </C.Content>

      <ModalEntradaMercadoria isOpen={openModal} onClose={handleCloseModal} />
    </C.Shell>
  );
};
