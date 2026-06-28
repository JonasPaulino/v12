import { getCufByUf } from "../../utils/ufCodes.js";

const onlyDigits = (value) => String(value || "").replace(/\D/g, "");

const decimal = (value, scale = 2) => {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toFixed(scale) : Number(0).toFixed(scale);
};

const escapeIniValue = (value) => String(value ?? "").replace(/\r?\n/g, " ").trim();

const appendSection = (lines, name, values = {}) => {
  lines.push(`[${name}]`);
  for (const [key, rawValue] of Object.entries(values)) {
    if (rawValue === undefined || rawValue === null || rawValue === "") continue;
    lines.push(`${key}=${escapeIniValue(rawValue)}`);
  }
  lines.push("");
};

const suffix = (value) => String(value).padStart(3, "0");

const buildDhEmi = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const buildCargaPorMunicipio = (context) => {
  const descargas = context.descargas.map((descarga) => ({
    ...descarga,
    documentos: [],
  }));

  for (const documento of context.documentos) {
    const municipioCodigo = onlyDigits(documento.municipio_descarga_codigo);
    const descarga =
      descargas.find((item) => onlyDigits(item.municipio_codigo) === municipioCodigo) ||
      descargas[0];

    if (descarga) descarga.documentos.push(documento);
  }

  return descargas;
};

const appendVeiculo = (lines, sectionName, veiculo) => {
  appendSection(lines, sectionName, {
    cInt: veiculo.placa,
    placa: veiculo.placa,
    RENAVAM: onlyDigits(veiculo.renavam),
    tara: decimal(veiculo.tara_kg, 0),
    capKG: decimal(veiculo.capacidade_kg, 0),
    capM3: decimal(veiculo.capacidade_m3, 0),
    tpRod: veiculo.tipo_rodado || "01",
    tpCar: veiculo.tipo_carroceria || "00",
    UF: String(veiculo.uf || "").toUpperCase(),
  });
};

const appendDocumento = (lines, documento, descargaIndex, documentoIndex) => {
  const docSuffix = `${suffix(descargaIndex)}${suffix(documentoIndex)}`;

  if (documento.tipo_documento === "cte") {
    appendSection(lines, `infCTe${docSuffix}`, {
      chCTe: onlyDigits(documento.chave_acesso),
    });
    return;
  }

  appendSection(lines, `infNFe${docSuffix}`, {
    chNFe: onlyDigits(documento.chave_acesso),
  });
};

const appendSeguros = (lines, context) => {
  context.seguros.forEach((seguro, index) => {
    const itemSuffix = suffix(index + 1);
    const responsavelDocumento = onlyDigits(seguro.cnpj_responsavel || seguro.cpf_responsavel);

    appendSection(lines, `seg${itemSuffix}`, {
      respSeg: seguro.responsavel_seguro,
      CNPJCPF: responsavelDocumento,
    });

    appendSection(lines, `infSeg${itemSuffix}`, {
      xSeg: seguro.seguradora_nome,
      CNPJ: onlyDigits(seguro.seguradora_cnpj),
    });

    if (seguro.numero_apolice) {
      appendSection(lines, `nApol${itemSuffix}`, {
        nApol: seguro.numero_apolice,
      });
    }

    seguro.averbacoes.forEach((numeroAverbacao, averbacaoIndex) => {
      appendSection(lines, `nAver${itemSuffix}${suffix(averbacaoIndex + 1)}`, {
        nAver: numeroAverbacao,
      });
    });
  });
};

export const buildMdfeIni = (context) => {
  const { mdfe, emitente, veiculoTracao } = context;
  const lines = [];
  const cnpjEmitente = onlyDigits(emitente.cpf_cnpj);
  const cuf = getCufByUf(mdfe.uf_inicio || emitente.uf);
  const cargasPorMunicipio = buildCargaPorMunicipio(context);
  const qNFe = context.documentos.filter((item) => item.tipo_documento !== "cte").length;
  const qCTe = context.documentos.filter((item) => item.tipo_documento === "cte").length;

  appendSection(lines, "infMDFe", {
    versao: "3.00",
    Id: "",
  });

  appendSection(lines, "Identificacao", {
    cUF: cuf,
    tpAmb: mdfe.ambiente,
    tpEmit: mdfe.tipo_emitente,
    tpTransp: mdfe.tipo_transportador,
    mod: "58",
    serie: mdfe.serie,
    nMDF: mdfe.numero,
    cMDF: String(mdfe.codigo_numerico).padStart(8, "0"),
    cDV: "0",
    modal: mdfe.modal || "1",
    dhEmi: buildDhEmi(),
    tpEmis: "1",
    procEmi: "0",
    verProc: "v12",
    UFIni: mdfe.uf_inicio,
    UFFim: mdfe.uf_fim,
  });

  appendSection(lines, "Emitente", {
    CNPJCPF: cnpjEmitente,
    IE: emitente.inscricao_estadual,
    xNome: emitente.nome_razao,
    xFant: emitente.nome_fantasia,
    xLgr: emitente.logradouro,
    nro: emitente.numero,
    xCpl: emitente.complemento,
    xBairro: emitente.bairro,
    cMun: emitente.codigo_ibge,
    xMun: emitente.cidade,
    CEP: onlyDigits(emitente.cep),
    UF: emitente.uf,
    fone: onlyDigits(emitente.telefone),
    email: emitente.email,
  });

  appendSection(lines, "infMunCarrega001", {
    cMunCarrega: mdfe.municipio_carregamento_codigo,
    xMunCarrega: mdfe.municipio_carregamento_nome,
  });

  context.percurso.forEach((item, index) => {
    appendSection(lines, `infPercurso${suffix(index + 1)}`, {
      UFPer: item.uf,
    });
  });

  appendSection(lines, "rodo", {
    RNTRC: onlyDigits(veiculoTracao.rntrc),
  });

  appendVeiculo(lines, "veicTracao", veiculoTracao);

  const proprietario = veiculoTracao.proprietario || {};
  if (onlyDigits(proprietario.cpf_cnpj)) {
    appendSection(lines, "proprietario", {
      CNPJCPF: onlyDigits(proprietario.cpf_cnpj),
      RNTRC: onlyDigits(proprietario.rntrc),
      xNome: proprietario.nome_razao,
      IE: proprietario.inscricao_estadual,
      UF: proprietario.uf,
      tpProp: proprietario.tipo_proprietario,
    });
  }

  context.condutores.forEach((condutor, index) => {
    appendSection(lines, `condutor${suffix(index + 1)}`, {
      xNome: condutor.nome,
      CPF: onlyDigits(condutor.cpf),
    });
  });

  context.reboques.forEach((reboque, index) => {
    appendVeiculo(lines, `veicReboque${suffix(index + 1)}`, reboque);
  });

  context.ciot.forEach((ciot, index) => {
    appendSection(lines, `infCIOT${suffix(index + 1)}`, {
      CIOT: onlyDigits(ciot.ciot),
      CNPJCPF: onlyDigits(ciot.cpf_cnpj_responsavel),
    });
  });

  cargasPorMunicipio.forEach((descarga, descargaIndex) => {
    appendSection(lines, `infDoc${suffix(descargaIndex + 1)}`, {
      cMunDescarga: descarga.municipio_codigo,
      xMunDescarga: descarga.municipio_nome,
    });

    descarga.documentos.forEach((documento, documentoIndex) => {
      appendDocumento(lines, documento, descargaIndex + 1, documentoIndex + 1);
    });
  });

  appendSeguros(lines, context);

  appendSection(lines, "tot", {
    qCTe,
    qNFe,
    vCarga: decimal(mdfe.valor_total_carga, 2),
    cUnid: "01",
    qCarga: decimal(mdfe.peso_bruto_kg, 4),
  });

  appendSection(lines, "infAdic", {
    infCpl: mdfe.observacao,
  });

  return `${lines.join("\n").trim()}\n`;
};
