import styled from "styled-components";

export const Shell = styled.div`
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  display: flex;
  overflow: hidden;
`;

export const Overlay = styled.div`
  display: none;

  @media (max-width: 900px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(7, 16, 34, 0.34);
    z-index: 20;
    backdrop-filter: blur(2px);
  }
`;

export const Content = styled.main`
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const Body = styled.section`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 18px 18px;
  scrollbar-gutter: stable;

  @media (max-width: 640px) {
    padding: 0 14px 22px;
    scrollbar-gutter: auto;
  }
`;

export const Toolbar = styled.div`
  display: flex;
  gap: 14px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;

  @media (max-width: 840px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const ToolbarGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const CreateButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(135deg, #0b5fff 0%, #083b9a 100%);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 14px 30px rgba(11, 95, 255, 0.22);
`;

export const SearchInput = styled.input`
  width: min(420px, 100%);
  height: 48px;
  padding: 0 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.92);
  color: ${({ theme }) => theme.colors.text};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }

  @media (max-width: 840px) {
    width: 100%;
  }
`;

export const Tabs = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  overflow-x: auto;
`;

export const TabButton = styled.button`
  height: 44px;
  padding: 0 18px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $active }) => ($active ? "rgba(11, 95, 255, 0.1)" : "#ffffff")};
  color: ${({ $active, theme }) => ($active ? theme.colors.primaryStrong : theme.colors.text)};
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
`;

export const TableArea = styled.div`
  flex: 1;
  min-height: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.9);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  overflow: hidden;

  @media (max-width: 640px) {
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;
