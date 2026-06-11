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
          <C.HeroTitle>Um sistema multi-filial. Desenvolvido para agilizar seu negócio.</C.HeroTitle>
          <C.HeroText>
            Organize sua empresa, com o sistema V12, cadastre seus produtos, realize vendas, emita notas fiscais de venda e devolução.
            Com o V12 você emite seus realórios e tem as informações que precisa para tomada de decisão.
          </C.HeroText>
        </C.HeroTop>

        <C.HeroCard>
          <C.HeroCardLabel>Contato</C.HeroCardLabel>
          <C.HeroCardValue>(81) 9 8416-3086</C.HeroCardValue>
        </C.HeroCard>
      </C.Hero>

      <C.FormArea>
        <C.FormCard>
          <C.Step>V12 Sistema</C.Step>
          <C.Title>Entrar no sistema</C.Title>
          <C.Subtitle>
            Informe login e senha. A filial padrao do usuario sera carregada e podera ser alterada depois no menu superior.
          </C.Subtitle>

          <C.Label>Login ou e-mail</C.Label>
          <C.Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="admin ou admin@mail.com"
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
