import styled, { css } from "styled-components";
import {
  PageBodyBase,
  PageContent,
  PageShell,
  MobileOverlay,
} from "styles/pageShell";

export const Shell = PageShell;
export const Overlay = MobileOverlay;
export const Content = PageContent;
export const Body = styled(PageBodyBase)`
  gap: 18px;
`;

export const Toolbar = styled.div`
  display: flex;
  gap: 14px;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 900px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const ToolbarGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;

  @media (max-width: 680px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const inputBase = css`
  height: 48px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.92);
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }
`;

export const SearchInput = styled.input`
  ${inputBase}
  width: min(380px, 100%);
  padding: 0 18px;

  @media (max-width: 900px) {
    width: 100%;
  }
`;

export const Select = styled.select`
  ${inputBase}
  min-width: 180px;
  padding: 0 16px;
`;

export const Grid = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(340px, 0.95fr) minmax(0, 1.2fr);
  gap: 18px;

  @media (max-width: 1120px) {
    grid-template-columns: 1fr;
  }
`;

export const Panel = styled.div`
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.92);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  overflow: hidden;
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const PanelTitle = styled.div`
  display: grid;
  gap: 4px;
`;

export const Title = styled.h3`
  margin: 0;
  font-size: 1.15rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const Subtitle = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.92rem;
`;

export const List = styled.div`
  min-height: 0;
  overflow: auto;
  padding: 14px;
  display: grid;
  gap: 10px;
`;

export const Row = styled.button`
  width: 100%;
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $active }) => ($active ? "rgba(11, 95, 255, 0.08)" : "#fff")};
  text-align: left;
  cursor: pointer;
`;

export const RowTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const RowNumber = styled.strong`
  color: ${({ theme }) => theme.colors.text};
`;

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $tone }) =>
    $tone === "danger"
      ? "rgba(212, 73, 73, 0.12)"
      : $tone === "warning"
      ? "rgba(239, 124, 20, 0.12)"
      : "rgba(11, 95, 255, 0.1)"};
  color: ${({ $tone, theme }) =>
    $tone === "danger"
      ? theme.colors.danger
      : $tone === "warning"
      ? "#b05a06"
      : theme.colors.primaryStrong};
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
`;

export const RowMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.9rem;
`;

export const RowValue = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
`;

export const DetailBody = styled.div`
  min-height: 0;
  overflow: auto;
  padding: 20px;
  display: grid;
  gap: 18px;
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const StatCard = styled.div`
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.88);
`;

export const StatLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const StatValue = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
`;

export const Section = styled.div`
  display: grid;
  gap: 12px;
`;

export const SectionTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const InfoCard = styled.div`
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(248, 250, 252, 0.78);
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 620px;
`;

export const Head = styled.thead`
  background: rgba(238, 244, 255, 0.96);
`;

export const HeadCell = styled.th`
  padding: 12px 14px;
  text-align: left;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const Cell = styled.td`
  padding: 12px 14px;
  color: ${({ theme }) => theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const Empty = styled.div`
  padding: 40px 18px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const Footer = styled.div`
  padding: 14px 18px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;
