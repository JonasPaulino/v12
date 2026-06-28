import styled from "styled-components";
import {
  ModalSubtitleBase,
  ModalTitleBase,
  ModalTitleBlockBase,
} from "styles/modalHeading";
import { TabPillButtonBase, TabPillGroupBase } from "styles/tabPill";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(8, 17, 37, 0.54);
  backdrop-filter: blur(4px);
`;

export const Modal = styled.div`
  width: min(1120px, 100%);
  height: min(92vh, 960px);
  max-height: min(92vh, 960px);
  display: flex;
  flex-direction: column;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.colors.shadow};
  overflow: hidden;

  @media (max-width: 640px) {
    width: 100%;
    max-height: 96vh;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding: 24px 26px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 640px) {
    padding: 18px 16px 14px;
    gap: 12px;
  }
`;

export const TitleBlock = styled(ModalTitleBlockBase)``;

export const Title = styled(ModalTitleBase)``;

export const Subtitle = styled(ModalSubtitleBase)``;

export const CloseButton = styled.button`
  width: 42px;
  height: 42px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  font-size: 1.4rem;
  cursor: pointer;
`;

export const Tabs = styled(TabPillGroupBase)`
  padding: 18px 26px 0;

  @media (max-width: 640px) {
    padding: 12px 16px 0;
  }
`;

export const TabButton = styled(TabPillButtonBase)``;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

export const Body = styled.div`
  flex: 1;
  min-height: 0;
  padding: 22px 26px 26px;
  overflow: auto;
  display: grid;
  gap: 18px;

  @media (max-width: 640px) {
    padding: 18px 16px 20px;
    gap: 14px;
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const GridThree = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 8px;
  min-width: 0;
`;

export const FieldSpan = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

export const RequiredMark = styled.span`
  margin-left: 4px;
  color: #dc2626;
  font-weight: 800;
  cursor: help;
`;

export const Input = styled.input`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  height: 48px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }
`;

export const Textarea = styled.textarea`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 108px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  outline: none;
  resize: vertical;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }
`;

export const Select = styled.select`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  height: 48px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  outline: none;
`;

export const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.5;
  font-size: 0.9rem;

  @media (max-width: 640px) {
    font-size: 0.82rem;
    line-height: 1.4;
  }
`;

export const ItemsHint = styled(Hint)`
  max-width: 420px;
`;

export const ItemsToolbar = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
`;

export const AddItemButton = styled.button`
  height: 44px;
  padding: 0 18px;
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(11, 95, 255, 0.08);
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-weight: 700;
  cursor: pointer;

  @media (max-width: 640px) {
    align-self: flex-end;
    width: auto;
    min-width: 132px;
    height: 36px;
    padding: 0 12px;
    font-size: 0.78rem;
  }
`;

export const ItemsTable = styled.div`
  min-height: 360px;
  max-width: 100%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;

  @media (max-width: 640px) {
    min-height: 0;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
  }
`;

export const ItemsScroll = styled.div`
  min-height: 100%;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable both-edges;

  @media (max-width: 640px) {
    min-height: 0;
    scrollbar-gutter: auto;
  }
`;

export const ItemsGrid = styled.div`
  min-width: 0;

  @media (max-width: 640px) {
    min-width: 760px;
  }
`;

export const ItemsHeader = styled.div`
  display: grid;
  grid-template-columns:
    minmax(220px, 2.5fr)
    minmax(72px, 0.85fr)
    minmax(104px, 1fr)
    minmax(96px, 0.9fr)
    minmax(96px, 0.9fr)
    minmax(112px, 1fr)
    minmax(88px, 0.7fr);
  gap: 12px;
  padding: 16px;
  background: rgba(238, 244, 255, 0.86);
  font-size: 0.83rem;
  color: ${({ theme }) => theme.colors.textSoft};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const ItemsHeaderCell = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
`;

export const ItemsRow = styled.div`
  display: grid;
  grid-template-columns:
    minmax(220px, 2.5fr)
    minmax(72px, 0.85fr)
    minmax(104px, 1fr)
    minmax(96px, 0.9fr)
    minmax(96px, 0.9fr)
    minmax(112px, 1fr)
    minmax(88px, 0.7fr);
  gap: 12px;
  padding: 16px;
  align-items: end;

  &:not(:last-child) {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }

  @media (max-width: 640px) {
    gap: 10px;
    padding: 12px;
  }
`;

export const InlineField = styled.label`
  display: grid;
  gap: 6px;
  min-width: 0;
`;

export const InlineLabel = styled.span`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.textSoft};
  display: none;
`;

export const RemoveItemButton = styled.button`
  height: 44px;
  border: 1px solid rgba(212, 73, 73, 0.22);
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(212, 73, 73, 0.08);
  color: ${({ theme }) => theme.colors.danger};
  font-weight: 700;
  cursor: pointer;

  @media (max-width: 640px) {
    height: 40px;
    font-size: 0.84rem;
  }
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const SummaryCard = styled.div`
  padding: 16px 18px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(248, 251, 255, 0.88);
  display: grid;
  gap: 6px;
`;

export const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const SummaryValue = styled.strong`
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const ParcelasCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
`;

export const ParcelasHeader = styled.div`
  display: grid;
  grid-template-columns: 0.8fr 1fr 1fr 1fr;
  gap: 12px;
  padding: 16px;
  background: rgba(238, 244, 255, 0.86);
  font-size: 0.83rem;
  color: ${({ theme }) => theme.colors.textSoft};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const ParcelaRow = styled.div`
  display: grid;
  grid-template-columns: 0.8fr 1fr 1fr 1fr;
  gap: 12px;
  padding: 16px;

  &:not(:last-child) {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

export const StatusChip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 700;
  font-size: 0.82rem;
  color: ${({ $tone, theme }) =>
    $tone === "danger"
      ? theme.colors.danger
      : $tone === "warning"
      ? "#b05a06"
      : theme.colors.success};
  background: ${({ $tone }) =>
    $tone === "danger"
      ? "rgba(212, 73, 73, 0.12)"
      : $tone === "warning"
      ? "rgba(239, 124, 20, 0.12)"
      : "rgba(31, 157, 106, 0.12)"};
`;

export const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 26px 24px;

  @media (max-width: 640px) {
    flex-direction: row;
    justify-content: stretch;
    padding: 0 16px 16px;
  }
`;

export const SecondaryButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  font-weight: 700;
  cursor: pointer;

  @media (max-width: 640px) {
    flex: 1;
    min-width: 0;
    height: 42px;
    padding: 0 12px;
    font-size: 0.82rem;
  }
`;

export const PrimaryButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(135deg, #0b5fff 0%, #083b9a 100%);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;

  @media (max-width: 640px) {
    flex: 1;
    min-width: 0;
    height: 42px;
    padding: 0 12px;
    font-size: 0.82rem;
  }
`;
