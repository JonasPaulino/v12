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

export const NotificationButton = styled.button`
  position: relative;
  width: 48px;
  height: 48px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSoft};
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  font-size: 1.45rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primaryStrong};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  @media (max-width: 900px) {
    flex: 0 0 48px;
  }
`;

export const NotificationBadge = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.danger};
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 18px;
`;

export const NotificationItem = styled.span`
  display: grid;
  gap: 4px;
  min-width: 0;
  white-space: normal;
  opacity: ${({ $unread }) => ($unread ? 1 : 0.72)};
`;

export const NotificationTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.92rem;
`;

export const NotificationMessage = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.82rem;
  line-height: 1.35;
`;

export const NotificationTime = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.74rem;
`;
