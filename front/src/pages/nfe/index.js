import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import Tabela from "./tabela";
import { ModalNfe } from "./modal_nfe";
import { useNfePage } from "./use";
import * as C from "./style";

export const Nfe = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    search,
    setSearch,
    debouncedSearch,
    status,
    setStatus,
    openModal,
    refreshKey,
    supportData,
    handleOpenNovo,
    handleCloseModal,
    handleRefreshList,
  } = useNfePage();

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
                Nova NF-e
              </C.CreateButton>

              <C.SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por número, chave, pedido ou destinatário"
              />
            </C.ToolbarGroup>

            <C.ToolbarGroup>
              <C.FilterSelect value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">Todos os status</option>
                <option value="rascunho">Rascunho</option>
                <option value="processando">Processando</option>
                <option value="autorizada">Autorizada</option>
                <option value="rejeitada">Rejeitada</option>
                <option value="cancelamento_pendente">Cancelamento pendente</option>
                <option value="cancelada">Cancelada</option>
                <option value="importada">Importada</option>
                <option value="erro_integracao">Erro de integração</option>
              </C.FilterSelect>
            </C.ToolbarGroup>
          </C.Toolbar>

          <C.TableArea>
            <Tabela
              search={debouncedSearch}
              status={status}
              refreshKey={refreshKey}
              onChanged={handleRefreshList}
            />
          </C.TableArea>
        </C.Body>
      </C.Content>

      <ModalNfe isOpen={openModal} supportData={supportData} onClose={handleCloseModal} />
    </C.Shell>
  );
};
