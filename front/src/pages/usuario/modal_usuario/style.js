import styled from "styled-components";
import {
  ModalSubtitleBase,
  ModalTitleBase,
  ModalTitleBlockBase,
} from "styles/modalHeading";

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
  width: min(860px, 100%);
  max-height: min(92vh, 860px);
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

export const Tabs = styled.div`
  display: flex;
  gap: 10px;
  padding: 18px 26px 0;
  flex-wrap: wrap;
`;

export const TabButton = styled.button`
  height: 42px;
  padding: 0 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) =>
    $active ? "rgba(11, 95, 255, 0.1)" : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primaryStrong : theme.colors.textSoft};
  font-weight: 700;
  cursor: pointer;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

export const Body = styled.div`
  padding: 22px 26px 26px;
  overflow: auto;
  display: grid;
  gap: 18px;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 8px;
`;

export const FieldSpan = styled.span`
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

export const Input = styled.input`
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

export const CheckboxLine = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
`;

export const Select = styled.select`
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
`;

export const TenantList = styled.div`
  display: grid;
  gap: 12px;
`;

export const TenantCard = styled.label`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: start;
  padding: 16px 18px;
  border: 1px solid ${({ theme, $checked }) =>
    $checked ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $checked }) =>
    $checked ? "rgba(11, 95, 255, 0.06)" : "rgba(248, 251, 255, 0.76)"};
  opacity: ${({ $disabled }) => ($disabled ? 0.92 : 1)};
`;

export const TenantInfo = styled.div`
  display: grid;
  gap: 4px;
`;

export const TenantName = styled.strong`
  color: ${({ theme }) => theme.colors.text};
`;

export const TenantMeta = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.92rem;
`;

export const AlertBox = styled.div`
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 186, 8, 0.12);
  color: ${({ theme }) => theme.colors.text};
`;

export const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 26px 24px;

  @media (max-width: 640px) {
    flex-direction: column-reverse;
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
`;
