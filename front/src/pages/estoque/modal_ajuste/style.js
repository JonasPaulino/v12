import styled, { css } from "styled-components";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(7, 16, 34, 0.42);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
`;

export const Modal = styled.div`
  width: min(760px, 100%);
  max-height: min(760px, calc(100vh - 44px));
  display: flex;
  flex-direction: column;
  border-radius: 28px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: 0 26px 80px rgba(7, 16, 34, 0.24);
  overflow: hidden;
`;

export const Header = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  padding: 24px 28px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const Title = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: clamp(1.3rem, 2vw, 1.8rem);
`;

export const Subtitle = styled.p`
  margin: 6px 0 0;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const CloseButton = styled.button`
  width: 44px;
  height: 44px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.4rem;
  cursor: pointer;
`;

export const Form = styled.form`
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const Body = styled.div`
  min-height: 0;
  overflow: auto;
  padding: 24px 28px;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
`;

export const FieldFull = styled(Field)`
  grid-column: 1 / -1;
`;

export const FieldSpan = styled.span`
  color: ${({ theme }) => theme.colors.text};
`;

export const RequiredMark = styled.span`
  margin-left: 4px;
  color: ${({ theme }) => theme.colors.danger};
`;

const inputBase = css`
  height: 48px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  outline: none;
  font: inherit;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }
`;

export const Input = styled.input`
  ${inputBase}
`;

export const Select = styled.select`
  ${inputBase}
`;

export const Textarea = styled.textarea`
  min-height: 110px;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  outline: none;
  resize: vertical;
  font: inherit;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }
`;

export const Hint = styled.p`
  margin: 16px 0 0;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.5;
`;

export const Footer = styled.footer`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 28px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

export const SecondaryButton = styled.button`
  height: 46px;
  padding: 0 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: #ffffff;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  cursor: pointer;
`;

export const PrimaryButton = styled.button`
  height: 46px;
  padding: 0 20px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(135deg, #0b5fff 0%, #083b9a 100%);
  color: #ffffff;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;
