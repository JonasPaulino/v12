import styled, { css } from "styled-components";
import { SlOptions } from "react-icons/sl";
import {
  StickyTableHeadBase,
  TableContainerBase,
  TableFooterBase,
  TableFooterInfoBase,
  TableScrollBase,
} from "styles/tableShared";

export const Container = styled(TableContainerBase)``;

export const Scroll = styled(TableScrollBase)``;

export const Table = styled.table`
  width: 100%;
  min-width: ${({ $wide }) => ($wide ? "1120px" : "920px")};
  border-collapse: collapse;
`;

export const Head = styled(StickyTableHeadBase)``;

export const Body = styled.tbody``;

export const Row = styled.tr`
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

export const HeaderCell = styled.th`
  padding: 16px 14px;
  text-align: left;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: ${({ $sortable }) => ($sortable ? "pointer" : "default")};
  white-space: nowrap;
`;

export const SortFlag = styled.span`
  margin-left: 8px;
  color: ${({ $active, theme }) => ($active ? theme.colors.primaryStrong : theme.colors.textSoft)};
`;

export const Cell = styled.td`
  padding: 16px 14px;
  color: ${({ theme }) => theme.colors.text};
  vertical-align: middle;
  white-space: nowrap;

  ${({ $wrap }) =>
    $wrap &&
    css`
      white-space: normal;
    `}
`;

export const MainText = styled.strong`
  display: block;
  font-size: 0.98rem;
`;

export const MetaText = styled.span`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.88rem;
`;

export const Quantity = styled.strong`
  color: ${({ $tone, theme }) =>
    $tone === "danger"
      ? theme.colors.danger
      : $tone === "warning"
      ? "#b05a06"
      : theme.colors.text};
`;

export const TypeBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 96px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ $operation, theme }) =>
    $operation === "saida" ? theme.colors.danger : theme.colors.success};
  background: ${({ $operation }) =>
    $operation === "saida" ? "rgba(212, 73, 73, 0.12)" : "rgba(31, 157, 106, 0.12)"};
  font-weight: 700;
  font-size: 0.82rem;
`;

export const MenuButton = styled.button`
  width: 40px;
  height: 40px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSoft};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.primaryStrong};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const MenuIcon = styled(SlOptions)`
  font-size: 1rem;
`;

export const Empty = styled.div`
  padding: 36px 18px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const Footer = styled(TableFooterBase)``;

export const FooterInfo = styled(TableFooterInfoBase)``;
