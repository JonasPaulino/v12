import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import Tabela from "./tabela";
import { ModalPessoa } from "./modal_pessoa";
import { usePessoaPage } from "./use";
import * as C from "./style";

export const Pessoa = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    search,
    setSearch,
    debouncedSearch,
    openModal,
    selectedPessoaId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleCloseModal,
    handleRefreshList,
  } = usePessoaPage();

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
                Cadastrar pessoa
              </C.CreateButton>
            </C.ToolbarGroup>

            <C.ToolbarGroup>
              <C.SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por nome, documento, e-mail ou telefone"
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

      <ModalPessoa
        isOpen={openModal}
        pessoaId={selectedPessoaId}
        onClose={handleCloseModal}
      />
    </C.Shell>
  );
};
