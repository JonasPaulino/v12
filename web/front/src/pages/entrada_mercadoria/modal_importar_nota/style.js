import styled from "styled-components";

export * from "../modal_entrada/style";

export const SearchRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const KeySearchRow = styled(SearchRow)`
  margin-top: 0;
`;

export const RequestTable = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
`;

export const RequestPanel = styled.section`
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

export const RequestPanelHeader = styled.div`
  display: grid;
  gap: 4px;
`;

export const RequestHeader = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 0.8fr 1.3fr 0.9fr;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(238, 244, 255, 0.86);
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;

  @media (max-width: 800px) {
    display: none;
  }
`;

export const RequestRow = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 0.8fr 1.3fr 0.9fr;
  gap: 12px;
  padding: 16px;
  align-items: center;

  &:not(:last-child) {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
  }
`;

export const RequestActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 800px) {
    justify-content: flex-start;
  }
`;

export const SmallButton = styled.button`
  height: 38px;
  padding: 0 13px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $primary, theme }) =>
    $primary ? "rgba(11, 95, 255, 0.1)" : theme.colors.surface};
  color: ${({ $primary, theme }) =>
    $primary ? theme.colors.primaryStrong : theme.colors.text};
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const MainText = styled.strong`
  display: block;
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.95rem;
`;

export const MetaText = styled.span`
  display: block;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.84rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
`;

export const UploadBox = styled.div`
  min-height: 180px;
  border: 1px dashed ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(11, 95, 255, 0.04);
  display: grid;
  place-items: center;
  padding: 24px;
  text-align: center;
  cursor: pointer;
`;

export const UploadText = styled.div`
  display: grid;
  gap: 8px;
`;

export const PreviewPanel = styled.section`
  display: grid;
  gap: 16px;
`;

export const PreviewHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  @media (max-width: 720px) {
    flex-direction: column;
  }
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const SummaryCard = styled.div`
  padding: 14px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

export const ProductTable = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: visible;
  background: ${({ theme }) => theme.colors.surface};
`;

export const ProductHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 1.6fr) minmax(80px, 0.45fr) minmax(110px, 0.55fr) minmax(260px, 1.4fr);
  gap: 12px;
  padding: 14px 16px;
  background: rgba(238, 244, 255, 0.86);
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;

  @media (max-width: 900px) {
    display: none;
  }
`;

export const ProductRow = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 1.6fr) minmax(80px, 0.45fr) minmax(110px, 0.55fr) minmax(260px, 1.4fr);
  gap: 12px;
  padding: 16px;
  align-items: end;

  &:not(:last-child) {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
`;

export const PreviewActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column-reverse;
  }
`;
