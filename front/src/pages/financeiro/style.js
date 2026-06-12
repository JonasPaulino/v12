import styled from "styled-components";

export const Shell = styled.div`
  min-height: 100vh;
  display: flex;
  overflow-x: clip;
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
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

export const Body = styled.section`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 18px 18px;

  @media (max-width: 640px) {
    padding: 0 14px 22px;
  }
`;

export const Toolbar = styled.div`
  display: flex;
  gap: 14px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;

  @media (max-width: 980px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const ToolbarGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const CreateButton = styled.button`
  height: 48px;
  padding: 0 18px;
  border: 0;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(135deg, #0b5fff 0%, #083b9a 100%);
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
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

  @media (max-width: 980px) {
    width: 100%;
  }
`;

export const FilterSelect = styled.select`
  min-width: 180px;
  height: 48px;
  padding: 0 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.92);
  color: ${({ theme }) => theme.colors.text};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px rgba(11, 95, 255, 0.12);
  }

  @media (max-width: 640px) {
    width: 100%;
  }
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

export const SummaryCard = styled.div`
  padding: 18px 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.9);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  display: grid;
  gap: 8px;
`;

export const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.textSoft};
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const SummaryValue = styled.strong`
  color: ${({ theme }) => theme.colors.text};
  font-size: clamp(1.3rem, 2.4vw, 2rem);
`;

export const TableArea = styled.div`
  flex: 1;
  min-height: 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(255, 255, 255, 0.9);
  box-shadow: ${({ theme }) => theme.colors.shadowSoft};
  overflow: hidden;
`;
