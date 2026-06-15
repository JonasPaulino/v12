import React from "react";
import * as C from "./style";

const DONUT_COLORS = ["#0b5fff", "#1f9d6a", "#ffb020", "#d44949", "#7c8cff", "#00a7c2"];

const renderEmpty = (message) => <C.EmptyState>{message}</C.EmptyState>;

export const LineChart = ({
  data = [],
  valueFormatter = (value) => value,
  labelFormatter = (value) => value,
  color = "#0b5fff",
}) => {
  if (!data.length) {
    return renderEmpty("Sem vendas suficientes para montar a série dos últimos dias.");
  }

  const width = 640;
  const height = 190;
  const paddingX = 18;
  const paddingTop = 20;
  const paddingBottom = 22;
  const values = data.map((item) => Number(item.total || 0));
  const maxValue = Math.max(...values, 1);
  const stepX = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : 0;
  const innerHeight = height - paddingTop - paddingBottom;

  const points = data.map((item, index) => {
    const x = paddingX + stepX * index;
    const y = paddingTop + innerHeight - (Number(item.total || 0) / maxValue) * innerHeight;
    return { x, y, label: item.data, value: Number(item.total || 0) };
  });

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${path} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  return (
    <>
      <C.SvgWrap>
        <C.Svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de linha de vendas">
          {[0, 1, 2, 3].map((step) => {
            const y = paddingTop + (innerHeight / 3) * step;
            return (
              <line
                key={step}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#d7e3ff"
                strokeDasharray="4 6"
              />
            );
          })}

          <path d={areaPath} fill="rgba(11, 95, 255, 0.10)" />
          <path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />

          {points.map((point) => (
            <g key={`${point.label}-${point.x}`}>
              <circle cx={point.x} cy={point.y} r="5" fill="#ffffff" stroke={color} strokeWidth="3" />
              <text
                x={point.x}
                y={point.y - 12}
                textAnchor="middle"
                fontSize="11"
                fill="#5f6f8f"
              >
                {valueFormatter(point.value)}
              </text>
            </g>
          ))}
        </C.Svg>
      </C.SvgWrap>

      <C.AxisLabels style={{ "--count": data.length }}>
        {data.map((item) => (
          <C.AxisLabel key={item.data}>{labelFormatter(item.data)}</C.AxisLabel>
        ))}
      </C.AxisLabels>
    </>
  );
};

export const BarChart = ({
  data = [],
  valueFormatter = (value) => value,
  quantityFormatter = (value) => value,
}) => {
  if (!data.length) {
    return renderEmpty("Nenhum produto vendido ainda para destacar neste ranking.");
  }

  const maxValue = Math.max(...data.map((item) => Number(item.total || 0)), 1);

  return (
    <C.BarList>
      {data.map((item) => {
        const total = Number(item.total || 0);
        const percentual = Math.max(8, (total / maxValue) * 100);

        return (
          <C.BarItem key={`${item.produto_id}-${item.descricao}`}>
            <C.BarHeader>
              <C.BarLabel title={item.descricao}>{item.descricao}</C.BarLabel>
              <C.BarMeta>
                {quantityFormatter(item.quantidade)} • {valueFormatter(total)}
              </C.BarMeta>
            </C.BarHeader>
            <C.BarTrack>
              <C.BarFill $width={percentual} />
            </C.BarTrack>
          </C.BarItem>
        );
      })}
    </C.BarList>
  );
};

export const DonutChart = ({
  data = [],
  valueFormatter = (value) => value,
  labelFormatter = (value) => value,
}) => {
  if (!data.length) {
    return renderEmpty("Ainda não há parcelas suficientes para compor a carteira a receber.");
  }

  const total = data.reduce((sum, item) => sum + Number(item.valor || 0), 0);
  if (total <= 0) {
    return renderEmpty("A carteira existe, mas ainda não há saldo financeiro acumulado para exibir.");
  }

  const radius = 66;
  const stroke = 18;
  const size = 180;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;

  return (
    <C.DonutLayout>
      <C.DonutWrap>
        <C.Svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Gráfico de pizza da carteira">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e8f0ff"
            strokeWidth={stroke}
          />

          {data.map((item, index) => {
            const valor = Number(item.valor || 0);
            const ratio = total > 0 ? valor / total : 0;
            const dash = ratio * circumference;
            const offset = circumference - accumulated;
            accumulated += dash;

            return (
              <circle
                key={`${item.status}-${index}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              />
            );
          })}
        </C.Svg>

        <C.DonutCenter>
          <div>
            <C.DonutCenterValue>{valueFormatter(total)}</C.DonutCenterValue>
            <C.DonutCenterLabel>saldo em carteira</C.DonutCenterLabel>
          </div>
        </C.DonutCenter>
      </C.DonutWrap>

      <C.Legend>
        {data.map((item, index) => (
          <C.LegendItem key={`${item.status}-${index}`}>
            <C.LegendDot $color={DONUT_COLORS[index % DONUT_COLORS.length]} />
            <C.LegendLabel>{labelFormatter(item.status)}</C.LegendLabel>
            <C.LegendValue>{valueFormatter(item.valor)}</C.LegendValue>
          </C.LegendItem>
        ))}
      </C.Legend>
    </C.DonutLayout>
  );
};
