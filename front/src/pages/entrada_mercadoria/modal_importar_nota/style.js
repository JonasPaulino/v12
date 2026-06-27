import styled from "styled-components";

export * from "../modal_entrada/style";

export const SearchRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const RequestTable = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
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
