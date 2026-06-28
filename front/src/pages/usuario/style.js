import styled from "styled-components";
import {
  PageBodyBase,
  PageContent,
  PageShell,
  MobileOverlay,
} from "styles/pageShell";

export const Shell = PageShell;

export const Overlay = MobileOverlay;

export const Content = PageContent;

export const Body = styled(PageBodyBase)``;

export const Toolbar = styled.div`
  display: flex;
  gap: 14px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 22px;

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

export const Intro = styled.div`
  margin-bottom: 16px;
  padding: 14px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.82);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};

  @media (max-width: 640px) {
    padding: 12px 14px;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

export const IntroTitle = styled.h2`
  margin: 0 0 4px;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.15rem, 1.4vw, 1.4rem);
`;

export const IntroText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.4;
  font-size: 0.92rem;
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
