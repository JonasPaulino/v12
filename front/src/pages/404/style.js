import styled from "styled-components";

export const Container = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
`;

export const Card = styled.div`
  width: 100%;
  max-width: 520px;
  padding: 34px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.colors.shadow};
  text-align: center;

  @media (max-width: 640px) {
    padding: 26px 20px;
  }
`;

export const Title = styled.h1`
  margin: 0 0 12px;
`;

export const Text = styled.p`
  margin: 0 0 20px;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const LinkButton = styled.a`
  display: inline-flex;
  padding: 12px 18px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  font-weight: 800;
`;
