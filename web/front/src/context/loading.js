import React, { useContext } from "react";
import styled from "styled-components";
import { AppContext } from "./index";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 20, 44, 0.36);
  backdrop-filter: blur(6px);
  z-index: 9999;
`;

const Card = styled.div`
  min-width: 240px;
  padding: 24px 28px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.colors.shadow};
  text-align: center;
`;

const Spinner = styled.div`
  width: 42px;
  height: 42px;
  margin: 0 auto 16px;
  border: 4px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const Text = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSoft};
`;

const Loading = () => {
  const { loading } = useContext(AppContext);

  if (!loading?.active) return null;

  return (
    <Overlay>
      <Card>
        <Spinner />
        <Text>{loading.message || "Carregando..."}</Text>
      </Card>
    </Overlay>
  );
};

export default Loading;
