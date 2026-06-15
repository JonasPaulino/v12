import styled from "styled-components";

export const EmptyState = styled.div`
  flex: 1;
  min-height: 170px;
  display: grid;
  place-items: center;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.colors.textSoft};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  text-align: center;
  padding: 18px;
`;

export const SvgWrap = styled.div`
  flex: 1;
  width: 100%;
  min-height: 170px;
  display: flex;
  align-items: center;
`;

export const Svg = styled.svg`
  width: 100%;
  height: auto;
  display: block;
`;

export const AxisLabels = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(var(--count, 1), minmax(0, 1fr));
  gap: 8px;
`;

export const AxisLabel = styled.span`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.textSoft};
  text-align: center;
`;

export const BarList = styled.div`
  flex: 1;
  display: grid;
  align-content: start;
  gap: 14px;
`;

export const BarItem = styled.div`
  display: grid;
  gap: 8px;
`;

export const BarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const BarLabel = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const BarMeta = styled.span`
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const BarTrack = styled.div`
  width: 100%;
  height: 12px;
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.radius.pill};
  overflow: hidden;
`;

export const BarFill = styled.div`
  height: 100%;
  width: ${({ $width }) => `${$width}%`};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: linear-gradient(90deg, #0b5fff 0%, #58a6ff 100%);
`;

export const DonutLayout = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 180px) minmax(0, 1fr);
  gap: 14px;
  align-items: center;

  @media (max-width: 740px) {
    grid-template-columns: 1fr;
    justify-items: center;
  }
`;

export const DonutWrap = styled.div`
  position: relative;
  width: 180px;
  height: 180px;
`;

export const DonutCenter = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  text-align: center;
  pointer-events: none;
`;

export const DonutCenterValue = styled.strong`
  display: block;
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 1.25rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const DonutCenterLabel = styled.span`
  display: block;
  margin-top: 4px;
  font-size: 0.76rem;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const Legend = styled.div`
  display: grid;
  gap: 12px;
  align-content: start;
`;

export const LegendItem = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
`;

export const LegendDot = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

export const LegendLabel = styled.span`
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const LegendValue = styled.strong`
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.textSoft};
`;
