import React, { useContext } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthMiddleware } from "middleware";
import { AppContext } from "context";
import PageWrapper from "./PageWrapper";
import { Login } from "pages/login";
import { Dashboard } from "pages/dashboard";
import { Usuario } from "pages/usuario";
import { Produto } from "pages/produto";
import { Pessoa } from "pages/pessoa";
import { Venda } from "pages/venda";
import { Compra } from "pages/compra";
import { Estoque } from "pages/estoque";
import { EntradaMercadoria } from "pages/entrada_mercadoria";
import { Devolucao } from "pages/devolucao";
import { Financeiro } from "pages/financeiro";
import { ConfiguracaoFiscal } from "pages/configuracao_fiscal";
import { Nfe } from "pages/nfe";
import { NfeRecebidas } from "pages/nfe_recebidas";
import { Mdfe } from "pages/mdfe";
import { TenantSetup } from "pages/tenant_setup";
import { NotFound } from "pages/404";

const MasterOnly = ({ children }) => {
  const { user } = useContext(AppContext);

  if (!user?.usuario_master) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export const RouteApp = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <AuthMiddleware>
            <PageWrapper title="Dashboard">
              <Dashboard />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/usuarios"
        element={
          <AuthMiddleware>
            <PageWrapper title="Usuários">
              <Usuario />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/pessoas"
        element={
          <AuthMiddleware>
            <PageWrapper title="Pessoas">
              <Pessoa />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/vendas"
        element={
          <AuthMiddleware>
            <PageWrapper title="Vendas">
              <Venda />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/compras"
        element={
          <AuthMiddleware>
            <PageWrapper title="Compras">
              <Compra />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/entradas"
        element={
          <AuthMiddleware>
            <PageWrapper title="Entradas">
              <EntradaMercadoria />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/devolucoes"
        element={
          <AuthMiddleware>
            <PageWrapper title="Devoluções">
              <Devolucao />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/contas"
        element={
          <AuthMiddleware>
            <PageWrapper title="Contas">
              <Financeiro />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/estoque"
        element={
          <AuthMiddleware>
            <PageWrapper title="Estoque">
              <Estoque />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/configuracao"
        element={
          <AuthMiddleware>
            <PageWrapper title="Configuração">
              <ConfiguracaoFiscal />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route path="/configuracao-fiscal" element={<Navigate to="/configuracao" replace />} />
      <Route
        path="/filiais/nova"
        element={
          <AuthMiddleware>
            <MasterOnly>
              <PageWrapper title="Empresas">
                <TenantSetup />
              </PageWrapper>
            </MasterOnly>
          </AuthMiddleware>
        }
      />
      <Route path="/nfe" element={<Navigate to="/nfe/emitidas" replace />} />
      <Route
        path="/nfe/emitidas"
        element={
          <AuthMiddleware>
            <PageWrapper title="NF-e emitidas">
              <Nfe />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/nfe/recebidas"
        element={
          <AuthMiddleware>
            <PageWrapper title="NF-e recebidas">
              <NfeRecebidas />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/mdfe"
        element={
          <AuthMiddleware>
            <PageWrapper title="MDF-e">
              <Mdfe />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route
        path="/nfe/manifestacoes"
        element={<Navigate to="/nfe/recebidas" replace />}
      />
      <Route
        path="/produtos"
        element={
          <AuthMiddleware>
            <PageWrapper title="Produtos">
              <Produto />
            </PageWrapper>
          </AuthMiddleware>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
