import { getConfigValue, setConfigValue } from "./configLocalService.js";

const PRINTER_CONFIG_KEY = "printer.config";

export const DEFAULT_PRINTER_CONFIG = {
  enabled: false,
  deviceName: "",
  layout: "thermal-80",
  paperWidth: 80,
  silent: false,
  copies: 1,
};

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeInteger(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function normalizePrinterConfig(config = {}) {
  const layout = ["thermal-58", "thermal-80", "a4"].includes(config.layout)
    ? config.layout
    : DEFAULT_PRINTER_CONFIG.layout;

  return {
    enabled: normalizeBoolean(config.enabled, DEFAULT_PRINTER_CONFIG.enabled),
    deviceName: String(config.deviceName || "").trim(),
    layout,
    paperWidth:
      layout === "thermal-58"
        ? 58
        : layout === "thermal-80"
          ? 80
          : normalizeInteger(config.paperWidth, DEFAULT_PRINTER_CONFIG.paperWidth, {
              min: 58,
              max: 210,
            }),
    silent: normalizeBoolean(config.silent, DEFAULT_PRINTER_CONFIG.silent),
    copies: normalizeInteger(config.copies, DEFAULT_PRINTER_CONFIG.copies, { min: 1, max: 10 }),
  };
}

export function getPrinterConfig() {
  const raw = getConfigValue(PRINTER_CONFIG_KEY);

  if (!raw) {
    return { ...DEFAULT_PRINTER_CONFIG };
  }

  try {
    return normalizePrinterConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PRINTER_CONFIG };
  }
}

export function savePrinterConfig(config = {}) {
  const normalized = normalizePrinterConfig(config);
  setConfigValue(PRINTER_CONFIG_KEY, JSON.stringify(normalized));
  return normalized;
}
