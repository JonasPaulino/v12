import React from "react";
import { GestaoV12Layout } from "layouts/gestao_v12";
import * as C from "./style";

export const GestaoV12Placeholder = ({ title, subtitle, description }) => (
  <GestaoV12Layout title={title} subtitle={subtitle}>
    <C.Card>
      <C.Kicker>Gestão V12</C.Kicker>
      <C.Title>{title}</C.Title>
      <C.Text>
        {description ||
          "Esta área será implementada dentro do módulo interno de gestão, usando o schema gestao e sem misturar dados operacionais das filiais."}
      </C.Text>
    </C.Card>
  </GestaoV12Layout>
);
