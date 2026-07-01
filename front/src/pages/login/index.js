import React from "react";
import * as C from "./style";
import { useLogin } from "./use";
import logoColor from "../../assets/brand/v12-erp-logo-color.png";
import logoWhite from "../../assets/brand/v12-erp-logo-white.png";

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
          <C.BrandLogo src={logoWhite} alt="V12 ERP" />
          <C.HeroTitle>Um ERP multi-filial. Desenvolvido para agilizar seu negócio.</C.HeroTitle>
          <C.HeroText>
            Organize sua empresa com o V12 ERP, cadastre seus produtos, realize vendas, controle financeiro, estoque e emissão fiscal.
            Tenha relatórios e informações claras para tomar decisões no dia a dia.
          </C.HeroText>
        </C.HeroTop>

        <C.HeroCard>
          <C.HeroCardLabel>Contato</C.HeroCardLabel>
          <C.HeroCardValue>(81) 9 8416-3086</C.HeroCardValue>
        </C.HeroCard>
      </C.Hero>

      <C.FormArea>
        <C.FormCard>
          <C.FormLogo src={logoColor} alt="V12 ERP" />
          <C.Step>V12 ERP</C.Step>
          <C.Title>Entrar no sistema</C.Title>
          <C.Subtitle>
            Informe login e senha. A filial padrão do usuário será carregada e poderá ser alterada depois no menu superior.
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
