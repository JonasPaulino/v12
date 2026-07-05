import { useEffect, useState } from "react";
import { getDashboard } from "./api";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const compactCurrencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

const statusLabelMap = {
  aberta: "Em aberto",
  parcial: "Parcial",
  quitada: "Quitada",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

const toNumber = (value) => Number(value || 0);

const formatCurrency = (value) => currencyFormatter.format(toNumber(value));

const formatCompactCurrency = (value) => compactCurrencyFormatter.format(toNumber(value));

const formatDateLabel = (value) => {
  if (!value) return "--";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? "--" : shortDateFormatter.format(date);
};

const formatMonthLabel = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  return monthFormatter.format(date);
};

const formatStatusLabel = (value) => statusLabelMap[String(value || "").toLowerCase()] || value;

export const useDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const response = await getDashboard();
        if (mounted) {
          setData(response.data || null);
        }
      } catch {
        if (mounted) {
          setData(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const indicadores = data?.indicadores || {};
  const kpis = [
    {
      id: "faturamento_mes",
      label: "Faturamento do mês",
      value: formatCurrency(indicadores.faturamentoMes),
      hint: `${toNumber(indicadores.pedidosMes)} pedidos faturados em ${formatMonthLabel()}`,
      accent: "primary",
    },
    {
      id: "ticket_medio",
      label: "Ticket médio",
      value: formatCurrency(indicadores.ticketMedioMes),
      hint: "Média por pedido de venda no mês",
      accent: "secondary",
    },
    {
      id: "saldo_receber",
      label: "Saldo a receber",
      value: formatCurrency(indicadores.saldoReceber),
      hint: `${toNumber(indicadores.parcelasReceber)} parcelas em aberto`,
      accent: "success",
    },
    {
      id: "saldo_vencido",
      label: "Saldo vencido",
      value: formatCurrency(indicadores.saldoVencido),
      hint: `${toNumber(indicadores.parcelasVencidas)} parcelas vencidas`,
      accent: "danger",
    },
  ];

  return {
    data,
    loading,
    kpis,
    formatCurrency,
    formatCompactCurrency,
    formatDateLabel,
    formatStatusLabel,
  };
};
