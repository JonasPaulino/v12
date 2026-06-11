import React from "react";
import * as C from "./style";
import { useNotFound } from "./use";

export const NotFound = () => {
  const { title } = useNotFound();

  return (
    <C.Container>
      <C.Card>
        <C.Title>{title}</C.Title>
        <C.Text>A rota informada nao existe nesta base do V12.</C.Text>
        <C.LinkButton href="/dashboard">Ir para o dashboard</C.LinkButton>
      </C.Card>
    </C.Container>
  );
};
