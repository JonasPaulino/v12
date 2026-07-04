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
  border: 1px solid rgba(206, 222, 255, 0.95);
  border-radius: 18px;
  background: linear-gradient(145deg, #ffffff 0%, #eef5ff 100%);
  color: ${({ theme }) => theme.colors.primaryStrong};
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;

  svg {
    width: 21px;
    height: 21px;
    stroke-width: 1.8;
  }

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 16px 38px rgba(11, 95, 255, 0.16);
    transform: translateY(-1px);
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
  border: 2px solid #ffffff;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.danger};
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 14px;
`;

export const NotificationBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 80;
  background: transparent;
`;

export const NotificationPanel = styled.div`
  position: fixed;
  top: 78px;
  right: 28px;
  z-index: 81;
  width: min(400px, calc(100vw - 24px));
  max-height: min(620px, calc(100vh - 96px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(206, 222, 255, 0.95);
  border-radius: 26px;
  background:
    radial-gradient(circle at top right, rgba(11, 95, 255, 0.12), transparent 34%),
    ${({ theme }) => theme.colors.surface};
  box-shadow: 0 26px 70px rgba(15, 23, 42, 0.22);

  @media (max-width: 560px) {
    top: 68px;
    right: 12px;
  }
`;

export const NotificationPanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const NotificationHeaderText = styled.div`
  display: grid;
  gap: 4px;

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 1.08rem;
  }

  span {
    color: ${({ theme }) => theme.colors.textSoft};
    font-size: 0.82rem;
  }
`;

export const NotificationMarkAllButton = styled.button`
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`;

export const NotificationList = styled.div`
  display: grid;
  gap: 8px;
  padding: 10px;
  overflow: auto;
`;

export const NotificationItem = styled.button`
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 8px;
  gap: 12px;
  align-items: start;
  padding: 12px;
  border: 1px solid ${({ $unread }) => ($unread ? "rgba(11, 95, 255, 0.22)" : "transparent")};
  border-radius: 18px;
  background: ${({ $unread }) => ($unread ? "rgba(11, 95, 255, 0.07)" : "transparent")};
  min-width: 0;
  text-align: left;
  white-space: normal;
  cursor: pointer;

  &:hover {
    background: rgba(11, 95, 255, 0.08);
  }
`;

export const NotificationGlyph = styled.span`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: ${({ $unread }) => ($unread ? "rgba(11, 95, 255, 0.14)" : "rgba(15, 23, 42, 0.06)")};
  color: ${({ $unread, theme }) => ($unread ? theme.colors.primaryStrong : theme.colors.textSoft)};

  svg {
    width: 19px;
    height: 19px;
    stroke-width: 1.8;
  }
`;

export const NotificationContent = styled.span`
  display: grid;
  gap: 5px;
  min-width: 0;
`;

export const NotificationTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.92rem;
  line-height: 1.25;
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

export const NotificationUnreadDot = styled.span`
  width: 8px;
  height: 8px;
  margin-top: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
`;

export const NotificationEmpty = styled.div`
  display: grid;
  gap: 6px;
  padding: 32px 16px 36px;
  text-align: center;

  strong {
    color: ${({ theme }) => theme.colors.text};
  }

  span {
    color: ${({ theme }) => theme.colors.textSoft};
    font-size: 0.88rem;
  }
`;
