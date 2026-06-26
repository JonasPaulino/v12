import styled from "styled-components";

export const Shell = styled.div`
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  display: flex;
  overflow: hidden;
`;

export const Overlay = styled.div`
  display: none;

  @media (max-width: 900px) {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(7, 16, 34, 0.34);
    z-index: 20;
    backdrop-filter: blur(2px);
  }
`;

export const Content = styled.main`
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const Body = styled.section`
  flex: 1;
  min-height: 0;
  display: grid;
  gap: 18px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 18px 18px;
  scrollbar-gutter: stable;

  @media (max-width: 640px) {
    padding: 0 14px 22px;
    scrollbar-gutter: auto;
  }
`;

export const Intro = styled.div`
  display: grid;
  gap: 8px;
  padding: 24px 26px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.86);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
`;

export const IntroTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: clamp(1.8rem, 2.1vw, 2.5rem);
  color: ${({ theme }) => theme.colors.text};
`;

export const IntroText = styled.p`
  margin: 0;
  max-width: 920px;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.7;
`;

export const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  align-items: start;
`;

export const Form = styled.form`
  display: grid;
  gap: 18px;
`;

export const Tabs = styled.div`
  display: flex;
  gap: 10px;
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

export const SubTabs = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

export const SubTabButton = styled.button`
  height: 38px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) =>
    $active ? "rgba(11, 95, 255, 0.08)" : theme.colors.surface};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primaryStrong : theme.colors.textSoft};
  font-weight: 700;
  cursor: pointer;
`;

export const Card = styled.section`
  display: grid;
  gap: 18px;
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

export const RequiredMark = styled.span`
  margin-left: 4px;
  color: ${({ theme }) => theme.colors.danger};
  cursor: help;
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

export const Textarea = styled.textarea`
  width: 100%;
  min-height: 108px;
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  resize: vertical;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }
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

export const ToggleList = styled.div`
  display: grid;
  gap: 12px;
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

export const Aside = styled.aside`
  display: grid;
  gap: 18px;
`;

export const StatusCard = styled(Card)`
  position: sticky;
  top: 18px;

  @media (max-width: 1120px) {
    position: static;
  }
`;

export const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $ok }) =>
    $ok ? "rgba(31, 157, 106, 0.12)" : "rgba(212, 73, 73, 0.12)"};
  color: ${({ $ok, theme }) => ($ok ? theme.colors.success : theme.colors.danger)};
  font-weight: 700;
  width: fit-content;
`;

export const Checklist = styled.ul`
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 8px;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const CertificateBox = styled.div`
  display: grid;
  gap: 10px;
  padding: 16px 18px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(248, 251, 255, 0.92);
`;

export const ConnectionCard = styled.div`
  display: grid;
  gap: 18px;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(248, 251, 255, 0.72);
`;

export const FiscalToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
`;

export const SearchInput = styled(Input)`
  max-width: 420px;
  min-width: min(100%, 280px);
`;

export const TableCard = styled.div`
  display: grid;
  gap: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.82);
  overflow: hidden;
`;

export const TableScroll = styled.div`
  width: 100%;
  overflow-x: auto;
`;

export const FiscalTable = styled.table`
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;

  th,
  td {
    padding: 14px 16px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    text-align: left;
    vertical-align: middle;
  }

  th {
    color: ${({ theme }) => theme.colors.textSoft};
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: rgba(248, 251, 255, 0.92);
  }

  td {
    color: ${({ theme }) => theme.colors.text};
  }

  td strong,
  td span {
    display: block;
  }

  td span {
    margin-top: 4px;
    color: ${({ theme }) => theme.colors.textSoft};
    font-size: 0.86rem;
    line-height: 1.4;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }
`;

export const MenuButton = styled.button`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceAlt};
  }
`;

export const PaginationBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  padding: 0 16px 16px;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const PaginationActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;

  strong {
    color: ${({ theme }) => theme.colors.text};
    font-size: 0.9rem;
  }
`;

export const EmptyState = styled.div`
  padding: 18px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(248, 251, 255, 0.82);
  color: ${({ theme }) => theme.colors.textSoft};
  font-weight: 700;
`;

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(8, 17, 37, 0.54);
  backdrop-filter: blur(4px);
`;

export const FiscalModal = styled.div`
  width: min(980px, 100%);
  max-height: min(92vh, 920px);
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

export const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 26px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const ModalCloseButton = styled.button`
  width: 42px;
  height: 42px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.4rem;
  cursor: pointer;
`;

export const ModalBody = styled.div`
  display: grid;
  gap: 18px;
  padding: 22px 26px 26px;
  overflow: auto;
`;

export const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  padding: 18px 26px 24px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(248, 251, 255, 0.72);
`;

export const ConnectionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  @media (max-width: 760px) {
    flex-direction: column;
  }
`;

export const ConnectionActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

export const StatusPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $status }) =>
    $status === "open"
      ? "rgba(31, 157, 106, 0.1)"
      : $status === "connecting"
      ? "rgba(214, 145, 24, 0.12)"
      : "rgba(226, 232, 240, 0.72)"};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
`;

export const StatusDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${({ theme, $status }) =>
    $status === "open"
      ? theme.colors.success
      : $status === "connecting"
      ? "#d69118"
      : theme.colors.textSoft};
  flex: 0 0 10px;
`;

export const IconButton = styled.button`
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.1rem;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.68;
  }
`;

export const PrimaryInlineButton = styled.button`
  min-width: 148px;
  height: 42px;
  padding: 0 18px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(135deg, #0b5fff 0%, #083b9a 100%);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.68;
  }
`;

export const QrCard = styled.div`
  display: grid;
  place-items: center;
  gap: 12px;
  padding: 18px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: #ffffff;
  text-align: center;
`;

export const QrImage = styled.img`
  width: 220px;
  height: 220px;
  object-fit: contain;
`;

export const FileInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
`;

export const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
`;

export const PrimaryButton = styled.button`
  min-width: 220px;
  height: 50px;
  padding: 0 20px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(135deg, #0b5fff 0%, #083b9a 100%);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 14px 30px rgba(11, 95, 255, 0.22);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.68;
    box-shadow: none;
  }

  @media (max-width: 640px) {
    width: 100%;
    min-width: 0;
  }
`;

export const SecondaryButton = styled.button`
  min-width: 180px;
  height: 46px;
  padding: 0 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.68;
  }

  @media (max-width: 640px) {
    width: 100%;
    min-width: 0;
  }
`;

export const LoadingCard = styled(Card)`
  place-items: center;
  min-height: 280px;
  color: ${({ theme }) => theme.colors.textSoft};
`;
