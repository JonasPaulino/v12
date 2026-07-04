import styled from "styled-components";
import { SlOptions } from "react-icons/sl";
import { IoChevronDownOutline } from "react-icons/io5";

export const Stack = styled.div`
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 18px;
`;

export const Toolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px auto;
  gap: 12px;
  align-items: end;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.div`
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

export const MultiSelect = styled.div`
  position: relative;
`;

export const MultiSelectButton = styled.button`
  width: 100%;
  min-height: 48px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font: inherit;
  text-align: left;
  cursor: pointer;
  outline: none;

  &:focus,
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }
`;

export const MultiSelectValue = styled.span`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
`;

export const MultiSelectPlaceholder = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const MultiSelectTag = styled.span`
  max-width: 92px;
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border-radius: 8px;
  background: rgba(11, 95, 255, 0.1);
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-size: 0.84rem;
  font-weight: 800;
  white-space: nowrap;
`;

export const TagRemove = styled.button`
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: rgba(11, 95, 255, 0.14);
  }
`;

export const MultiSelectArrow = styled(IoChevronDownOutline)`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 1.12rem;
  transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
  transition: transform 0.16s ease;
`;

export const MultiSelectPanel = styled.div`
  position: absolute;
  z-index: 20;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  display: grid;
  padding: 6px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 18px 50px rgba(5, 17, 39, 0.18);
`;

export const MultiSelectOption = styled.button`
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  background: ${({ $active }) => ($active ? "rgba(11, 95, 255, 0.1)" : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.colors.primaryStrong : theme.colors.text)};
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: rgba(15, 23, 42, 0.06);
  }
`;

export const OptionCheck = styled.span`
  width: 18px;
  height: 18px;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: 5px;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : "#ffffff")};
  opacity: ${({ $active }) => ($active ? 1 : 0.65)};

  &::after {
    content: "";
    width: 8px;
    height: 4px;
    border-left: 2px solid #ffffff;
    border-bottom: 2px solid #ffffff;
    opacity: ${({ $active }) => ($active ? 1 : 0)};
    transform: rotate(-45deg) translate(1px, -1px);
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

export const Card = styled.section`
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.92);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  overflow: hidden;
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
