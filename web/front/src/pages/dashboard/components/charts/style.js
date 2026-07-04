import styled from "styled-components";

export const EmptyState = styled.div`
  flex: 1;
  min-height: 150px;
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
  min-height: 0;
  max-height: 210px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 2px 4px;
`;

export const Svg = styled.svg`
  width: 100%;
  height: 100%;
  max-height: 210px;
  display: block;
`;

export const AxisLabels = styled.div`
  flex-shrink: 0;
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(var(--count, 1), minmax(0, 1fr));
  gap: 6px;
`;

export const AxisLabel = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.72rem;
  color: ${({ theme }) => theme.colors.textSoft};
  text-align: center;
`;

export const BarList = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  align-content: start;
  gap: 12px;
  overflow-y: auto;
  padding-right: 2px;
`;

export const BarItem = styled.div`
  display: grid;
  gap: 7px;
  min-width: 0;
`;

export const BarHeader = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
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
  white-space: nowrap;
  font-size: 0.74rem;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const BarTrack = styled.div`
  width: 100%;
  height: 10px;
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
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 156px) minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  overflow: hidden;

  @media (max-width: 740px) {
    grid-template-columns: 1fr;
    justify-items: center;
  }
`;

export const DonutWrap = styled.div`
  position: relative;
  width: 156px;
  height: 156px;
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
  font-size: 1.02rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const DonutCenterLabel = styled.span`
  display: block;
  margin-top: 3px;
  font-size: 0.68rem;
  color: ${({ theme }) => theme.colors.textSoft};
`;

export const Legend = styled.div`
  display: grid;
  gap: 9px;
  align-content: start;
  min-width: 0;
`;

export const LegendItem = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  min-width: 0;
`;

export const LegendDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

export const LegendLabel = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.84rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const LegendValue = styled.strong`
  white-space: nowrap;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.textSoft};
`;
