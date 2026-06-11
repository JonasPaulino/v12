import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import Tabela from "./tabela";
import { ModalUsuario } from "./modal_usuario";
import { useUsuarioPage } from "./use";
import * as C from "./style";

export const Usuario = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const {
    search,
    setSearch,
    debouncedSearch,
    openModal,
    selectedUserId,
    refreshKey,
    handleOpenNovo,
    handleEditar,
    handleCloseModal,
    handleRefreshList,
  } = useUsuarioPage();

  return (
    <C.Shell>
      <Sidebar />
      {mOpen && <C.Overlay onClick={abreFechaMenu} />}

      <C.Content>
        <Header />

        <C.Body>
          {/* <C.Intro>
            <C.IntroTitle>Usuarios por filial ativa</C.IntroTitle>
            <C.IntroText>
              Cadastro global com controle de acesso por filiais.
            </C.IntroText>
          </C.Intro> */}

          <C.Toolbar>
            <C.ToolbarGroup>
              <C.CreateButton type="button" onClick={handleOpenNovo}>
                Cadastrar usuario
              </C.CreateButton>
            </C.ToolbarGroup>

            <C.ToolbarGroup>
              <C.SearchInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar por nome, e-mail ou login"
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

      <ModalUsuario
        isOpen={openModal}
        usuarioId={selectedUserId}
        onClose={handleCloseModal}
      />
    </C.Shell>
  );
};
