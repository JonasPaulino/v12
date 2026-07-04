import styled, { css } from "styled-components";
import { SlOptions } from "react-icons/sl";
import {
  MobileOverlay,
  PageBodyBase,
  PageContent,
  PageShell,
} from "styles/pageShell";
import { TabPillButtonBase, TabPillGroupBase } from "styles/tabPill";
import {
  StickyTableHeadBase,
  TableContainerBase,
  TableFooterBase,
  TableFooterInfoBase,
  TableScrollBase,
} from "styles/tableShared";
import {
  ModalSubtitleBase,
  ModalTitleBase,
  ModalTitleBlockBase,
} from "styles/modalHeading";

export const Shell = PageShell;
export const Overlay = MobileOverlay;
export const Content = PageContent;
export const Body = styled(PageBodyBase)``;

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
  height: 46px;
  padding: 0 18px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(135deg, #0b5fff 0%, #083b9a 100%);
  color: #ffffff;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 14px 30px rgba(11, 95, 255, 0.22);
`;

export const SecondaryActionButton = styled.button`
  height: 46px;
  padding: 0 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.94);
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.7;
    cursor: wait;
  }
`;

export const SearchInput = styled.input`
  width: min(430px, 100%);
  height: 46px;
  padding: 0 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.94);
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

export const Tabs = styled(TabPillGroupBase)`
  margin-bottom: 16px;
  overflow-x: auto;
`;

export const TabButton = styled(TabPillButtonBase)`
  white-space: nowrap;
`;

export const TableArea = styled.div`
  flex: 1;
  min-height: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.92);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  overflow: hidden;

  @media (max-width: 640px) {
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

export const TableContainer = styled(TableContainerBase)``;
export const Scroll = styled(TableScrollBase)``;

export const Table = styled.table`
  width: 100%;
  min-width: ${({ $compact }) => ($compact ? "760px" : "1080px")};
  border-collapse: collapse;
`;

export const Head = styled(StickyTableHeadBase)``;
export const Tbody = styled.tbody``;

export const Row = styled.tr`
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

export const HeaderCell = styled.th`
  padding: 15px 14px;
  text-align: left;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
`;

export const Cell = styled.td`
  padding: 15px 14px;
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
  font-size: 0.86rem;
`;

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  padding: 7px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  color: ${({ $tone, theme }) =>
    $tone === "success"
      ? theme.colors.success
      : $tone === "danger"
      ? theme.colors.danger
      : theme.colors.primaryStrong};
  background: ${({ $tone }) =>
    $tone === "success"
      ? "rgba(31, 157, 106, 0.12)"
      : $tone === "danger"
      ? "rgba(212, 73, 73, 0.12)"
      : "rgba(11, 95, 255, 0.10)"};
  font-weight: 800;
  font-size: 0.8rem;
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
  padding: 38px 18px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const Footer = styled(TableFooterBase)``;
export const FooterInfo = styled(TableFooterInfoBase)``;

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(15, 23, 42, 0.42);
`;

export const Modal = styled.div`
  width: min(${({ $wide }) => ($wide ? "1080px" : "680px")}, 100%);
  max-height: min(92vh, 860px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 26px 80px rgba(15, 23, 42, 0.26);

  @media (max-width: 640px) {
    width: 100%;
    max-height: 94vh;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

export const ModalHeader = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 18px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const ModalTitleBlock = ModalTitleBlockBase;
export const ModalTitle = ModalTitleBase;
export const ModalSubtitle = ModalSubtitleBase;

export const CloseButton = styled.button`
  width: 38px;
  height: 38px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 1.4rem;
  cursor: pointer;
`;

export const ModalBody = styled.div`
  min-height: 0;
  overflow: auto;
  padding: 18px 20px;
`;

export const ModalFooter = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 520px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 7px;
`;

export const FieldFull = styled(Field)`
  grid-column: 1 / -1;
`;

export const FieldSpan = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.9rem;
  font-weight: 800;
`;

export const SelectActionRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const SmallActionButton = styled.button`
  min-height: 44px;
  padding: 0 15px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-weight: 800;
  cursor: pointer;
`;

export const Input = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }
`;

export const Select = styled.select`
  width: 100%;
  height: 44px;
  padding: 0 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  outline: none;
`;

export const Textarea = styled.textarea`
  width: 100%;
  min-height: 94px;
  padding: 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  resize: vertical;
  outline: none;
`;

export const CheckboxRow = styled.label`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  font-weight: 800;
`;

export const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

export const Section = styled.section`
  display: grid;
  gap: 12px;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

export const SectionHeader = styled.div`
  display: flex;
  gap: 12px;
  justify-content: space-between;
  align-items: center;

  @media (max-width: 520px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const MiniButton = styled.button`
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-weight: 800;
  cursor: pointer;
`;

export const ArrayCard = styled.div`
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(248, 251, 255, 0.9);
`;

export const ArrayGrid = styled(Grid)`
  grid-template-columns: repeat(${({ $columns }) => $columns || 2}, minmax(0, 1fr));

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const SecondaryButton = styled.button`
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 800;
  cursor: pointer;
`;

export const PrimaryButton = styled.button`
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(135deg, #0b5fff 0%, #083b9a 100%);
  color: #ffffff;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(11, 95, 255, 0.2);

  &:disabled {
    opacity: 0.7;
    cursor: wait;
  }
`;
