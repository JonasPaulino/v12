import styled from "styled-components";
import { SlOptions } from "react-icons/sl";

export const Stack = styled.div`
  display: grid;
  gap: 18px;
`;

export const Toolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 190px auto;
  gap: 12px;
  align-items: end;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 8px;
`;

export const Label = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 800;
  font-size: 0.92rem;
`;

export const Input = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }
`;

export const Select = styled.select`
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }
`;

export const PrimaryButton = styled.button`
  min-height: 48px;
  padding: 0 18px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: linear-gradient(135deg, #0b5fff 0%, #083b9a 100%);
  color: #fff;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

export const SecondaryButton = styled.button`
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 800;
  cursor: pointer;
`;

export const ConfigCard = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.86);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const ConfigText = styled.div`
  display: grid;
  gap: 4px;

  strong {
    color: ${({ theme }) => theme.colors.text};
  }

  span {
    color: ${({ theme }) => theme.colors.textSoft};
    font-size: 0.9rem;
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 720px) {
    width: 100%;

    button {
      flex: 1;
    }
  }
`;

export const Card = styled.section`
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.92);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  overflow: hidden;
`;

export const Scroll = styled.div`
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
  white-space: ${({ $wrap }) => ($wrap ? "normal" : "nowrap")};
`;

export const Strong = styled.strong`
  display: block;
  font-size: 0.96rem;
`;

export const Meta = styled.span`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.86rem;
`;

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  padding: 7px 11px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $status }) =>
    $status === "quitado"
      ? "rgba(31, 157, 106, 0.12)"
      : $status === "vencido"
      ? "rgba(239, 124, 20, 0.14)"
      : $status === "cancelado"
      ? "rgba(212, 73, 73, 0.12)"
      : $status === "parcial"
      ? "rgba(11, 95, 255, 0.10)"
      : "rgba(15, 23, 42, 0.06)"};
  color: ${({ $status, theme }) =>
    $status === "quitado"
      ? theme.colors.success
      : $status === "vencido"
      ? "#b05a06"
      : $status === "cancelado"
      ? theme.colors.danger
      : $status === "parcial"
      ? theme.colors.primaryStrong
      : theme.colors.textSoft};
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: capitalize;
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
`;

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 32px 18px;
  background: rgba(5, 17, 39, 0.42);
  overflow: auto;
`;

export const Modal = styled.form`
  width: min(520px, 100%);
  display: grid;
  gap: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 28px 80px rgba(5, 17, 39, 0.24);
  padding: 22px;
`;

export const ModalTitle = styled.div`
  display: grid;
  gap: 4px;

  h2 {
    margin: 0;
    color: ${({ theme }) => theme.colors.text};
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: 1.35rem;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.textSoft};
  }
`;

export const ModalGrid = styled.div`
  display: grid;
  gap: 14px;
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  @media (max-width: 560px) {
    flex-direction: column-reverse;
  }
`;
