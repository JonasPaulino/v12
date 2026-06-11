import React from "react";
import * as C from "./style";
import { useLogin } from "./use";

export const Login = () => {
  const {
    username,
    password,
    setUsername,
    setPassword,
    handleKeyDown,
    handleLogin,
  } = useLogin();

  return (
    <C.Container>
      <C.Hero>
        <C.HeroTop>
          <C.Brand>V12</C.Brand>
          <C.HeroTitle>Base limpa para automacao comercial multi-filial.</C.HeroTitle>
          <C.HeroText>
            Estrutura inspirada no Boagenda, mas preparada para operar com usuarios
            vinculados a uma ou mais filiais, sem dependencia de dominio para resolver tenant.
          </C.HeroText>
        </C.HeroTop>

        <C.HeroCard>
          <C.HeroCardLabel>Fluxo atual</C.HeroCardLabel>
          <C.HeroCardValue>Login, escolha da filial e dashboard inicial.</C.HeroCardValue>
        </C.HeroCard>
      </C.Hero>

      <C.FormArea>
        <C.FormCard>
          <C.Step>Entrada direta</C.Step>
          <C.Title>Entrar no sistema</C.Title>
          <C.Subtitle>
            Informe login e senha. A filial padrao do usuario sera carregada e podera ser alterada depois no menu superior.
          </C.Subtitle>

          <C.Label>Login ou e-mail</C.Label>
          <C.Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="admin ou admin@v12.local"
            autoComplete="username"
          />

          <C.Label>Senha</C.Label>
          <C.Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sua senha"
            autoComplete="current-password"
          />

          <C.Actions>
            <C.Button type="button" onClick={handleLogin}>Acessar</C.Button>
          </C.Actions>
        </C.FormCard>
      </C.FormArea>
    </C.Container>
  );
};
