import styled from "styled-components";
import { TabPillButtonBase, TabPillGroupBase } from "styles/tabPill";

export const Stack = styled.div`
  display: grid;
  gap: 18px;
`;

export const Card = styled.section`
  display: grid;
  gap: 20px;
  padding: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.92);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};

  @media (max-width: 640px) {
    padding: 18px;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

export const CardHeader = styled.div`
  display: grid;
  gap: 6px;
`;

export const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.15rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const CardText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.6;
`;

export const Tabs = styled(TabPillGroupBase)``;

export const TabButton = styled(TabPillButtonBase)``;

export const SectionBody = styled.div`
  display: grid;
  gap: 18px;
`;

export const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 8px;
`;

export const FieldSpan = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  font-size: 0.95rem;
`;

export const FieldHint = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.82rem;
  line-height: 1.5;
`;

export const Input = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 14px;
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
  height: 48px;
  padding: 0 14px;
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

export const ToggleList = styled.div`
  display: grid;
  gap: 12px;
`;

export const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  cursor: pointer;
`;

export const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  accent-color: ${({ theme }) => theme.colors.primary};
`;

export const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const InfoCard = styled.div`
  min-height: 92px;
  padding: 16px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(248, 251, 255, 0.92);
`;

export const InfoLabel = styled.span`
  display: block;
  margin-bottom: 10px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const InfoValue = styled.strong`
  display: block;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  line-height: 1.45;
  word-break: break-word;
`;

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 560px) {
    button {
      width: 100%;
    }
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

export const Placeholder = styled.div`
  padding: 22px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.textSoft};
  background: rgba(248, 251, 255, 0.74);
  line-height: 1.6;
`;
