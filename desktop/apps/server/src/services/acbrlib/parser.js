const normalizeKey = (value) => String(value || "").trim().toLowerCase();

export function parseIniLikeResponse(rawText) {
  const text = String(rawText || "");
  const sections = { _root: {} };
  let currentSection = "_root";

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
}

export function findIniValue(sections, keys = [], preferredSections = []) {
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
}

export function extractXmlTag(rawText, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  return String(rawText || "").match(regex)?.[1]?.trim() || null;
}

function extractPreferredCStat(rawText, parsed) {
  const values = [];
  const iniMatches = String(rawText || "").matchAll(/\b(?:CStat|cStat)\s*[:=]\s*"?(\d{3})"?/g);
  for (const match of iniMatches) {
    values.push(match[1]);
  }

  const xmlMatches = String(rawText || "").matchAll(/<cStat>(\d{3})<\/cStat>/gi);
  for (const match of xmlMatches) {
    values.push(match[1]);
  }

  const fromParsed = findIniValue(parsed, ["CStat", "cStat", "Status"], ["Retorno", "ENVIO", "NFE"]);
  if (fromParsed) {
    values.unshift(fromParsed);
  }

  const priority = ["100", "150", "101", "135", "155", "110", "301", "302", "104", "103", "105", "106"];
  for (const code of priority) {
    if (values.includes(code)) return code;
  }

  return values.find(Boolean) || null;
}

function extractPreferredXMotivo(rawText, parsed, cStat) {
  const values = [];
  const iniMatches = String(rawText || "").matchAll(/\b(?:XMotivo|xMotivo|Msg)\s*[:=]\s*([^\r\n]+)/g);
  for (const match of iniMatches) {
    values.push(String(match[1] || "").trim());
  }

  const xmlMatches = String(rawText || "").matchAll(/<xMotivo>([\s\S]*?)<\/xMotivo>/gi);
  for (const match of xmlMatches) {
    values.push(String(match[1] || "").trim());
  }

  const fromParsed = findIniValue(parsed, ["XMotivo", "xMotivo", "Motivo", "Msg"], [
    "Retorno",
    "ENVIO",
    "NFE",
  ]);
  if (fromParsed) {
    values.unshift(fromParsed);
  }

  if (["100", "150", "101", "135", "155"].includes(String(cStat || ""))) {
    return values.filter(Boolean).at(-1) || null;
  }

  return values.find(Boolean) || null;
}

export function safeParseInteger(value) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

export function mapNfceReturnToStatus(cStat) {
  const code = String(cStat || "").trim();
  if (["100", "150"].includes(code)) return "autorizada";
  if (["103", "104", "105", "106"].includes(code)) return "pendente";
  if (["101", "135", "155"].includes(code)) return "cancelada";
  if (code) return "rejeitada";
  return "pendente";
}

export function buildNfceResponseMetadata(rawText, vendaId) {
  const parsed = parseIniLikeResponse(rawText);
  const cStat = extractPreferredCStat(rawText, parsed);
  const xMotivo = extractPreferredXMotivo(rawText, parsed, cStat);
  const recibo =
    findIniValue(parsed, ["Recibo", "nRec", "NRec"], ["Retorno", "ENVIO"]) ||
    extractXmlTag(rawText, "nRec");
  const protocolo =
    findIniValue(parsed, ["Protocolo", "nProt", "NProt"], ["Retorno", "ENVIO"]) ||
    extractXmlTag(rawText, "nProt");
  const chaveAcesso =
    findIniValue(parsed, ["chNFe", "Chave", "chDFe"], ["Retorno", "ENVIO"]) ||
    extractXmlTag(rawText, "chNFe");
  const numero =
    findIniValue(parsed, ["nNF", "Numero"], ["Retorno", "ENVIO"]) || extractXmlTag(rawText, "nNF");
  const serie =
    findIniValue(parsed, ["serie", "Serie"], ["Retorno", "ENVIO"]) ||
    extractXmlTag(rawText, "serie");

  return {
    vendaId: Number(vendaId),
    raw: rawText,
    parsed,
    cStat: cStat || null,
    xMotivo: xMotivo || null,
    recibo: recibo || null,
    protocolo: protocolo || null,
    chaveAcesso: chaveAcesso || null,
    numero: safeParseInteger(numero),
    serie: safeParseInteger(serie),
    mappedStatus: mapNfceReturnToStatus(cStat),
  };
}
