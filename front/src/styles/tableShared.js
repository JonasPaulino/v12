import styled from "styled-components";

export const TableContainerBase = styled.div`
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

export const TableScrollBase = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
`;

export const StickyTableHeadBase = styled.thead`
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(238, 244, 255, 0.96);
`;

export const TableFooterBase = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: 720px) {
    flex-direction: column;
    align-items: stretch;
    padding: 14px;
  }
`;

export const TableFooterInfoBase = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.92rem;
`;
