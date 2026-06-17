import styled from "styled-components";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 112;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(8, 17, 37, 0.54);
  backdrop-filter: blur(4px);
`;

export const Modal = styled.div`
  width: min(1080px, 100%);
  height: min(92vh, 880px);
  max-height: min(92vh, 880px);
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

export const TitleBlock = styled.div`
  display: grid;
  gap: 4px;
`;

export const Title = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
`;

export const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const CloseButton = styled.button`
  width: 42px;
  height: 42px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  font-size: 1.4rem;
  cursor: pointer;
`;

export const Body = styled.div`
  flex: 1;
  min-height: 0;
  padding: 22px 26px 26px;
  overflow: auto;
  display: grid;
  gap: 18px;
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

export const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.5;
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 960px) {
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
  font-size: 1.15rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const EmphasisValue = styled.strong`
  font-size: 1.3rem;
  color: ${({ theme }) => theme.colors.primaryStrong};
`;

export const SummaryText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.55;
  white-space: pre-wrap;
`;

export const Form = styled.form`
  display: grid;
  gap: 18px;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const GridFour = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const HighlightGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

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

export const Select = styled.select`
  height: 48px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  outline: none;
`;

export const Input = styled.input`
  height: 48px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  outline: none;
`;

export const Textarea = styled.textarea`
  min-height: 88px;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  outline: none;
  resize: vertical;
`;

export const SectionCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
`;

export const SectionHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 0.9fr) minmax(220px, 1.3fr) minmax(120px, 0.7fr) minmax(160px, 0.8fr);
  gap: 12px;
  padding: 14px 16px;
  background: rgba(238, 244, 255, 0.86);
  font-size: 0.83rem;
  color: ${({ theme }) => theme.colors.textSoft};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const SectionRow = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 0.9fr) minmax(220px, 1.3fr) minmax(120px, 0.7fr) minmax(160px, 0.8fr);
  gap: 12px;
  padding: 14px 16px;
  align-items: flex-start;
  background: ${({ $dimmed }) => ($dimmed ? "rgba(246, 248, 252, 0.9)" : "transparent")};
  opacity: ${({ $dimmed }) => ($dimmed ? 0.72 : 1)};

  &:not(:last-child) {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

export const MovementBlock = styled.div`
  display: grid;
  gap: 4px;
`;

export const MovementTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.95rem;
`;

export const MovementMeta = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.84rem;
  line-height: 1.45;
`;

export const MovementAmount = styled.strong`
  color: ${({ theme, $dimmed }) => ($dimmed ? theme.colors.textSoft : theme.colors.text)};
  font-size: 0.98rem;
`;

export const ParcelSelectOption = styled.option``;

export const StatusChip = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 700;
  font-size: 0.82rem;
  color: ${({ $status, theme }) =>
    $status === "quitada"
      ? theme.colors.success
      : $status === "cancelada"
      ? theme.colors.textSoft
      : $status === "parcial"
      ? "#b05a06"
      : $status === "vencida"
      ? theme.colors.danger
      : theme.colors.primaryStrong};
  background: ${({ $status }) =>
    $status === "quitada"
      ? "rgba(31, 157, 106, 0.12)"
      : $status === "cancelada"
      ? "rgba(125, 140, 168, 0.14)"
      : $status === "parcial"
      ? "rgba(239, 124, 20, 0.12)"
      : $status === "vencida"
      ? "rgba(212, 73, 73, 0.12)"
      : "rgba(11, 95, 255, 0.1)"};
`;

export const Empty = styled.div`
  padding: 22px 18px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const ActionButton = styled.button`
  height: 38px;
  padding: 0 14px;
  border: 1px solid ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $danger }) => ($danger ? "rgba(212, 73, 73, 0.08)" : "#ffffff")};
  color: ${({ $danger, theme }) => ($danger ? theme.colors.danger : theme.colors.text)};
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    filter: grayscale(0.2);
  }
`;
