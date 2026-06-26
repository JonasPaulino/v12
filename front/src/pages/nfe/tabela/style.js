import styled from "styled-components";
import { HiMiniEllipsisHorizontal } from "react-icons/hi2";

export const Container = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

export const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;

export const Table = styled.table`
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
`;

export const Head = styled.thead`
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(238, 244, 255, 0.96);
`;

export const Body = styled.tbody``;

export const Row = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const HeaderCell = styled.th`
  padding: 16px 18px;
  text-align: left;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  cursor: ${({ $sortable }) => ($sortable ? "pointer" : "default")};
  user-select: none;
`;

export const Cell = styled.td`
  padding: 16px 18px;
  color: ${({ theme }) => theme.colors.text};
  vertical-align: middle;
  white-space: ${({ $wrap }) => ($wrap ? "normal" : "nowrap")};
`;

export const SortFlag = styled.span`
  margin-left: 8px;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primaryStrong : theme.colors.textSoft};
`;

export const MainText = styled.strong`
  display: block;
  font-size: 0.98rem;
`;

export const MetaText = styled.span`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.86rem;
`;

export const Status = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 110px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  background: ${({ $tone }) => {
    if ($tone === "success") return "rgba(31, 157, 106, 0.12)";
    if ($tone === "warning") return "rgba(239, 124, 20, 0.12)";
    if ($tone === "danger") return "rgba(212, 73, 73, 0.12)";
    return "rgba(11, 95, 255, 0.12)";
  }};
  color: ${({ $tone, theme }) => {
    if ($tone === "success") return theme.colors.success;
    if ($tone === "warning") return "#b35f08";
    if ($tone === "danger") return theme.colors.danger;
    return theme.colors.primaryStrong;
  }};
`;

export const OriginTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(11, 95, 255, 0.08);
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-size: 0.82rem;
  font-weight: 700;
`;

export const Empty = styled.div`
  padding: 28px 12px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const FooterInfo = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.92rem;
`;


export const MenuButton = styled.button`
  width: 38px;
  height: 38px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSoft};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

export const MenuIcon = styled(HiMiniEllipsisHorizontal)`
  font-size: 1.2rem;
`;
