import styled from "styled-components";

export const Container = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 32px 20px;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
    padding: 18px 18px 14px;
  }
`;

export const ButtonContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  flex: 1;
`;

export const MenuButton = styled.button`
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-size: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const PageTitle = styled.h1`
  margin: 0;
  min-width: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.4rem, 2vw, 2rem);
  overflow-wrap: anywhere;

  @media (max-width: 900px) {
    font-size: 1.8rem;
    line-height: 1.05;
  }
`;

export const ProfileContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-width: 0;

  @media (max-width: 900px) {
    width: 100%;
    justify-content: stretch;
  }
`;
