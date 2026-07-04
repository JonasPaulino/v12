const normalizeKey = (value) => String(value || "").trim().toLowerCase();

export const parseIniLikeResponse = (rawText) => {
  const text = String(rawText || "");
  const sections = {};
  let currentSection = "_root";
  sections[currentSection] = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";")) continue;

    const sectionMatch = line.match(/^\[(.+?)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      if (!sections[currentSection]) sections[currentSection] = {};
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    sections[currentSection][key] = value;
  }

  return sections;
};

export const findIniValue = (sections, keys = [], preferredSections = []) => {
  const normalizedKeys = keys.map(normalizeKey);
  const orderedSections = [
    ...preferredSections,
    ...Object.keys(sections || {}).filter((section) => !preferredSections.includes(section)),
  ];

  for (const section of orderedSections) {
    const values = sections?.[section] || {};
    for (const [key, value] of Object.entries(values)) {
      if (normalizedKeys.includes(normalizeKey(key))) {
        return value;
      }
    }
  }

  return null;
};

export const mapNfeReturnToStatus = ({ cStat, operation = "emitir" }) => {
  const code = String(cStat || "").trim();

  if (operation === "cancelar") {
    if (["101", "135", "155"].includes(code)) return "cancelada";
    if (code) return "erro_integracao";
    return "erro_integracao";
  }

  if (operation === "consultar") {
    if (["100", "150"].includes(code)) return "autorizada";
    if (["101", "135", "155"].includes(code)) return "cancelada";
    if (["110", "301", "302"].includes(code)) return "denegada";
    if (code) return "erro_integracao";
    return "erro_integracao";
  }

  if (["100", "150"].includes(code)) return "autorizada";
  if (["103", "104", "105", "106"].includes(code)) return "processando";
  if (code) return "rejeitada";
  return "erro_integracao";
};
