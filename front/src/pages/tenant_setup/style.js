import styled, { css } from "styled-components";

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
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 24px 18px;
  scrollbar-gutter: stable;

  @media (max-width: 640px) {
    padding: 0 14px 22px;
    scrollbar-gutter: auto;
  }
`;

export const Card = styled.div`
  display: grid;
  gap: 22px;
  padding: 28px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.9);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};

  @media (max-width: 640px) {
    padding: 18px;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

export const CardHeader = styled.div`
  display: grid;
  gap: 8px;
`;

export const CardTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 2rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const CardText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.65;
`;

export const Steps = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

export const StepButton = styled.button`
  min-width: 170px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 18px;
  border: 1px solid
    ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $active }) =>
    $active ? "rgba(11,95,255,0.08)" : "rgba(255,255,255,0.72)"};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primaryStrong : theme.colors.textSoft};
  font-weight: 700;
`;

export const StepNumber = styled.span`
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.primary};
  color: #fff;
  font-size: 0.78rem;
`;

export const Section = styled.div`
  display: grid;
  gap: 18px;
`;

export const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 18px;

  @media (max-width: 840px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.label`
  display: grid;
  gap: 8px;
`;

export const FieldFull = styled.label`
  display: grid;
  gap: 8px;
  grid-column: 1 / -1;
`;

export const FieldSpan = styled.span`
  font-size: 0.92rem;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
`;

export const RequiredMark = styled.span`
  color: ${({ theme }) => theme.colors.danger};
  margin-left: 4px;
`;

const inputStyles = css`
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  height: 48px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-family: inherit;
  font-size: 1rem;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }
`;

export const Input = styled.input`
  ${inputStyles}
`;

export const Select = styled.select`
  ${inputStyles}
`;

export const TextArea = styled.textarea`
  ${inputStyles}
  min-height: 108px;
  height: auto;
  padding: 12px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  resize: vertical;
`;

export const FileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

export const UploadControl = styled.label`
  min-height: 48px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 0 4px 0 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.08);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    padding: 12px;
    border-radius: ${({ theme }) => theme.radius.md};
  }
`;

export const UploadText = styled.span`
  min-width: 0;
  overflow: hidden;
  color: ${({ theme }) => theme.colors.text};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const UploadAction = styled.span`
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: linear-gradient(135deg, #0b5fff 0%, #083b9a 100%);
  color: #ffffff;
  font-weight: 700;
  white-space: nowrap;

  @media (max-width: 640px) {
    width: 100%;
  }
`;

export const PasswordActionRow = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;

  button {
    height: 48px;
    border-radius: ${({ theme }) => theme.radius.md};
    padding: 0 18px;
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.55;
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${({ $columns = 3 }) => $columns}, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const SummaryCard = styled.div`
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.82);
`;

export const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const SummaryValue = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  word-break: break-word;
`;

export const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
`;

export const GhostButton = styled.button`
  padding: 14px 18px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: #fff;
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
`;

export const PrimaryButton = styled.button`
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: linear-gradient(135deg, #0b5fff 0%, #083b9a 100%);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;

  @media (max-width: 720px) {
    width: 100%;
  }
`;

export const LoadingCard = styled.div`
  padding: 22px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.9);
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const PageGrid = styled.div`
  display: grid;
  gap: 18px;
`;

export const ListCard = styled.div`
  display: grid;
  gap: 18px;
  padding: 24px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.92);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
`;

export const ListHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`;

export const ListHeaderText = styled.div`
  display: grid;
  gap: 8px;
`;

export const ListKicker = styled.span`
  display: inline-flex;
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(11, 95, 255, 0.08);
  color: ${({ theme }) => theme.colors.primaryStrong};
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const SearchRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 840px) {
    align-items: stretch;
  }
`;

export const SearchInput = styled.input`
  width: min(420px, 100%);
  height: 48px;
  padding: 0 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.92);
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

export const CountText = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.94rem;
`;

export const TenantGrid = styled.div`
  display: grid;
  gap: 12px;
`;

export const TenantItem = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

export const TenantItemLeft = styled.div`
  display: grid;
  gap: 8px;
`;

export const TenantItemRight = styled.div`
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
`;

export const TenantItemTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
`;

export const TenantMeta = styled.div`
  display: grid;
  gap: 4px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.92rem;
`;

export const TenantStatusBadge = styled.span`
  display: inline-flex;
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $active }) => ($active ? "rgba(15, 168, 88, 0.12)" : "rgba(230, 66, 87, 0.12)")};
  color: ${({ $active }) => ($active ? "#0f9f52" : "#cf3b50")};
  font-size: 0.78rem;
  font-weight: 700;
`;

export const TenantMenuToggle = styled.button`
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 999px;
  background: #fff;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.15rem;
`;

export const TenantMenu = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 5;
  min-width: 200px;
  padding: 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: #fff;
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
`;

export const TenantMenuButton = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  text-align: left;
`;

export const EmptyState = styled.div`
  display: grid;
  gap: 8px;
  padding: 26px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(255, 255, 255, 0.64);
  text-align: center;
`;

export const EmptyTitle = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.02rem;
`;

export const EmptyText = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSoft};
  line-height: 1.55;
`;

export const Pagination = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const PaginationActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

export const PageButton = styled.button`
  padding: 12px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: #fff;
  color: ${({ theme, $active }) => ($active ? theme.colors.primaryStrong : theme.colors.text)};
  font-weight: 700;
`;

export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 28px 16px;
  background: rgba(7, 16, 34, 0.48);
  backdrop-filter: blur(4px);
  overflow-y: auto;
`;

export const ModalPanel = styled.div`
  width: min(1180px, 100%);
  margin: auto 0;
  display: grid;
  gap: 18px;
  padding: 24px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: rgba(255, 255, 255, 0.98);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
`;

export const ModalHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`;

export const ModalTitle = styled.div`
  display: grid;
  gap: 6px;
`;

export const ModalTitleText = styled.h3`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.8rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const ModalCloseButton = styled.button`
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: #fff;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1.1rem;
  font-weight: 700;
`;

export const ModalBody = styled.div`
  display: grid;
  gap: 18px;
`;
