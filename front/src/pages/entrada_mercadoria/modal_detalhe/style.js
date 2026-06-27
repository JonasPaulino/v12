import styled from "styled-components";

export * from "../modal_entrada/style";

export const DetailsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 960px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const DetailCard = styled.div`
  display: grid;
  gap: 6px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surfaceAlt};
`;

export const DetailLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const DetailValue = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
  overflow-wrap: anywhere;
`;

export const Section = styled.section`
  display: grid;
  gap: 12px;
`;

export const SectionTitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: 1rem;
`;

export const DetailItemsTable = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  overflow: hidden;
`;

export const DetailItemsScroll = styled.div`
  overflow: auto;
`;

export const ItemsGridDetail = styled.div`
  min-width: 920px;
`;

export const ItemsHeaderDetail = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 2.2fr 0.8fr 0.9fr 1fr 1fr;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(238, 244, 255, 0.86);
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const ItemsRowDetail = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 2.2fr 0.8fr 0.9fr 1fr 1fr;
  gap: 12px;
  padding: 14px 16px;
  align-items: center;

  &:not(:last-child) {
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

export const ItemText = styled.span`
  color: ${({ theme }) => theme.colors.text};
  overflow-wrap: anywhere;
`;
