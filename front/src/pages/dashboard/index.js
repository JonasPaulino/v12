import React, { useContext } from "react";
import Header from "components/header";
import Sidebar from "components/sidebar";
import { AppContext } from "context";
import * as C from "./style";
import { useDashboard } from "./use";

export const Dashboard = () => {
  const { mOpen, abreFechaMenu } = useContext(AppContext);
  const { data } = useDashboard();

  return (
    <C.Shell>
      <Sidebar />
      {mOpen && <C.Overlay onClick={abreFechaMenu} />}

      <C.Content>
        <Header />

        <C.Body>
          <C.Intro>
            <div>
              <C.IntroTitle>
                {data?.tenant?.tenant_nome || "Dashboard inicial"} pronto para evoluir.
              </C.IntroTitle>
              <C.IntroText>
                Esta base ja entrega autenticacao por usuario global, troca de filial pelo
                header, sessao isolada pela filial ativa e layout principal pronto para
                receber os modulos de automacao comercial.
              </C.IntroText>
            </div>
          </C.Intro>

          <C.Grid>
            <C.Card>
              <C.CardLabel>Filial ativa</C.CardLabel>
              <C.CardValue>{data?.tenant?.tenant_nome || "--"}</C.CardValue>
            </C.Card>
            <C.Card>
              <C.CardLabel>Usuario</C.CardLabel>
              <C.CardValue>{data?.usuario?.usuario_nome || "--"}</C.CardValue>
            </C.Card>
            <C.Card>
              <C.CardLabel>Status da base</C.CardLabel>
              <C.CardValue>Estrutura pronta</C.CardValue>
            </C.Card>
          </C.Grid>

          <C.EmptyArea>
            <C.EmptyTitle>Dashboard propositalmente enxuto</C.EmptyTitle>
            <C.EmptyText>
              Nenhum modulo de cadastro, relatorio ou WhatsApp foi incluído nesta etapa.
              A base ficou limpa para evoluir por camadas, mantendo o tenant ativo em todas
              as futuras tabelas funcionais.
            </C.EmptyText>
          </C.EmptyArea>
        </C.Body>
      </C.Content>
    </C.Shell>
  );
};
