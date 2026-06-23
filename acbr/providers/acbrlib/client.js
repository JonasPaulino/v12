import AcbrNfeIntegrationDAO from "../../model/acbrNfeIntegrationDAO.js";
import { decryptSecret } from "../../utils/secret.js";
import { buildNfeIni } from "./iniBuilder.js";
import { findIniValue, mapNfeReturnToStatus, parseIniLikeResponse } from "./parser.js";
import {
  configureAcbrSession,
  createAcbrSession,
  destroyAcbrSession,
  writeAcbrIni,
} from "./runtime.js";

class AcbrLibNotConfiguredError extends Error {
  constructor(message = "ACBrLib não configurada neste ambiente.") {
    super(message);
    this.name = "AcbrLibNotConfiguredError";
    this.code = "ACBRLIB_NOT_CONFIGURED";
  }
}

class AcbrLibIntegrationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "AcbrLibIntegrationError";
    this.code = "ACBRLIB_INTEGRATION_ERROR";
    this.details = details;
  }
}

const isEnabled = () => String(process.env.ACBRLIB_ENABLED || "").toLowerCase() === "true";

const safeParseInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const safeGetXml = (acbr) => {
  try {
    return acbr.obterXml(0);
  } catch {
    return null;
  }
};

const buildResponseMetadata = (rawText, operation) => {
  const parsed = parseIniLikeResponse(rawText);
  const cStat = findIniValue(parsed, ["CStat", "cStat", "Status"], [
    "Retorno",
    "ENVIO",
    "CONSULTA",
    "CANCELAMENTO",
  ]);
  const xMotivo = findIniValue(parsed, ["xMotivo", "Motivo", "Msg"], [
    "Retorno",
    "ENVIO",
    "CONSULTA",
    "CANCELAMENTO",
  ]);
  const recibo = findIniValue(parsed, ["Recibo", "nRec"]);
  const protocolo = findIniValue(parsed, ["Protocolo", "nProt"]);
  const chaveAcesso = findIniValue(parsed, ["chNFe", "Chave", "chDFe"]);
  const numero = findIniValue(parsed, ["nNF", "Numero"]);

  return {
    operation,
    raw: rawText,
    parsed,
    cStat: cStat || null,
    xMotivo: xMotivo || null,
    recibo: recibo || null,
    protocolo: protocolo || null,
    chaveAcesso: chaveAcesso || null,
    numero: safeParseInteger(numero),
    mappedStatus: mapNfeReturnToStatus({ cStat, operation }),
  };
};

const persistSuccess = async (client, { context, userId, metadata, preXml, postXml, eventType }) => {
  await client.query("BEGIN");

  try {
    await AcbrNfeIntegrationDAO.atualizarNfe(client, context.nfe.nfe_id, {
      status: metadata.mappedStatus,
      status_sefaz: metadata.cStat,
      recibo: metadata.recibo,
      protocolo: metadata.protocolo,
      chave_acesso: metadata.chaveAcesso || context.nfe.chave_acesso || null,
      numero: metadata.numero || context.nfe.numero,
    });

    await AcbrNfeIntegrationDAO.registrarEvento(client, {
      nfeId: context.nfe.nfe_id,
      usuarioId: userId,
      tipoEvento: eventType,
      status: metadata.mappedStatus === "autorizada" || metadata.mappedStatus === "cancelada" ? "sucesso" : "falha",
      mensagem: metadata.xMotivo || `Retorno da operação ${metadata.operation}.`,
      respostaJson: metadata,
    });

    await AcbrNfeIntegrationDAO.salvarXml(client, {
      nfeId: context.nfe.nfe_id,
      tipoXml: "pre_envio",
      chaveAcesso: metadata.chaveAcesso || context.nfe.chave_acesso || null,
      conteudoXml: preXml,
    });

    await AcbrNfeIntegrationDAO.salvarXml(client, {
      nfeId: context.nfe.nfe_id,
      tipoXml:
        metadata.operation === "cancelar"
          ? "cancelamento"
          : metadata.mappedStatus === "autorizada"
            ? "autorizado"
            : "retorno_autorizacao",
      chaveAcesso: metadata.chaveAcesso || context.nfe.chave_acesso || null,
      conteudoXml: postXml,
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
};

const persistFailure = async (client, { context, userId, eventType, error, responseText, preXml }) => {
  await client.query("BEGIN");

  try {
    await AcbrNfeIntegrationDAO.atualizarNfe(client, context.nfe.nfe_id, {
      status: "erro_integracao",
      status_sefaz: null,
    });

    await AcbrNfeIntegrationDAO.registrarEvento(client, {
      nfeId: context.nfe.nfe_id,
      usuarioId: userId,
      tipoEvento: eventType,
      status: "falha",
      mensagem: error.message || "Falha na integração com ACBrLib.",
      respostaJson: responseText ? { raw: responseText } : null,
    });

    await AcbrNfeIntegrationDAO.salvarXml(client, {
      nfeId: context.nfe.nfe_id,
      tipoXml: "pre_envio",
      chaveAcesso: context.nfe.chave_acesso || null,
      conteudoXml: preXml,
    });

    await client.query("COMMIT");
  } catch (persistError) {
    await client.query("ROLLBACK");
    throw persistError;
  }
};

class AcbrLibProvider {
  static ensureConfigured() {
    if (!isEnabled()) {
      throw new AcbrLibNotConfiguredError();
    }
  }

  static async emitirNfe({ client, nfeId, tenantId, userId = null }) {
    this.ensureConfigured();

    await client.query("BEGIN");
    let context;

    try {
      await AcbrNfeIntegrationDAO.reservarNumero(client, nfeId);
      context = await AcbrNfeIntegrationDAO.carregarContexto(client, nfeId);
      AcbrNfeIntegrationDAO.validarContexto(context);

      await AcbrNfeIntegrationDAO.atualizarNfe(client, nfeId, {
        status: "processando",
      });

      await AcbrNfeIntegrationDAO.registrarEvento(client, {
        nfeId,
        usuarioId: userId,
        tipoEvento: "emissao_iniciada",
        status: "processando",
        mensagem: "Processo de emissão iniciado na ACBrLib.",
        payloadJson: { tenantId, numero: context.nfe.numero },
      });

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }

    const session = await createAcbrSession({
      tenantId,
      nfeId,
      certificadoBuffer: context.certificado.conteudo_pfx,
      certificadoSenha: decryptSecret(context.certificado.senha_criptografada),
    });

    let preXml = null;
    let lastReturn = null;

    try {
      await configureAcbrSession(session, context);

      const iniContent = buildNfeIni(context);
      const iniPath = await writeAcbrIni(session, iniContent);

      session.acbr.limparLista();
      session.acbr.carregarINI(iniPath);
      preXml = safeGetXml(session.acbr);
      session.acbr.assinar();
      session.acbr.validar();

      const rawResponse = session.acbr.enviar(1, false, true, false);
      const postXml = safeGetXml(session.acbr);
      const metadata = buildResponseMetadata(rawResponse, "emitir");

      await persistSuccess(client, {
        context,
        userId,
        metadata,
        preXml,
        postXml,
        eventType: "emissao_retorno",
      });

      return {
        success: metadata.mappedStatus === "autorizada",
        ...metadata,
      };
    } catch (error) {
      try {
        lastReturn = session.acbr?.ultimoRetorno?.() || null;
      } catch {
        lastReturn = null;
      }

      await persistFailure(client, {
        context,
        userId,
        eventType: "emissao_retorno",
        error,
        responseText: lastReturn,
        preXml,
      });

      throw new AcbrLibIntegrationError(
        lastReturn || error.message || "Falha ao emitir NF-e com a ACBrLib.",
        { nfeId, tenantId }
      );
    } finally {
      await destroyAcbrSession(session);
    }
  }

  static async consultarStatus({ client, nfeId, tenantId, userId = null }) {
    this.ensureConfigured();

    const context = await AcbrNfeIntegrationDAO.carregarContexto(client, nfeId);
    AcbrNfeIntegrationDAO.validarContexto(context);

    if (!context.nfe.chave_acesso) {
      throw new AcbrLibIntegrationError("A NF-e ainda não possui chave de acesso para consulta.", {
        nfeId,
        tenantId,
      });
    }

    const session = await createAcbrSession({
      tenantId,
      nfeId,
      certificadoBuffer: context.certificado.conteudo_pfx,
      certificadoSenha: decryptSecret(context.certificado.senha_criptografada),
    });

    try {
      await configureAcbrSession(session, context);
      const rawResponse = session.acbr.consultar(context.nfe.chave_acesso, true);
      const metadata = buildResponseMetadata(rawResponse, "consultar");

      await persistSuccess(client, {
        context,
        userId,
        metadata,
        preXml: null,
        postXml: null,
        eventType: "consulta_status_retorno",
      });

      return metadata;
    } catch (error) {
      const lastReturn = session.acbr?.ultimoRetorno?.() || null;

      await persistFailure(client, {
        context,
        userId,
        eventType: "consulta_status_retorno",
        error,
        responseText: lastReturn,
        preXml: null,
      });

      throw new AcbrLibIntegrationError(
        lastReturn || error.message || "Falha ao consultar o status da NF-e.",
        { nfeId, tenantId }
      );
    } finally {
      await destroyAcbrSession(session);
    }
  }

  static async cancelarNfe({ client, nfeId, tenantId, justificativa, userId = null }) {
    this.ensureConfigured();

    const context = await AcbrNfeIntegrationDAO.carregarContexto(client, nfeId);
    AcbrNfeIntegrationDAO.validarContexto(context);

    if (!context.nfe.chave_acesso) {
      throw new AcbrLibIntegrationError("A NF-e ainda não possui chave de acesso para cancelamento.", {
        nfeId,
        tenantId,
      });
    }

    if (!String(justificativa || "").trim()) {
      throw new AcbrLibIntegrationError("Informe a justificativa do cancelamento.", {
        nfeId,
        tenantId,
      });
    }

    const session = await createAcbrSession({
      tenantId,
      nfeId,
      certificadoBuffer: context.certificado.conteudo_pfx,
      certificadoSenha: decryptSecret(context.certificado.senha_criptografada),
    });

    try {
      await configureAcbrSession(session, context);
      const rawResponse = session.acbr.cancelar(
        context.nfe.chave_acesso,
        justificativa,
        context.emitente.cpf_cnpj.replace(/\D/g, ""),
        1
      );
      const metadata = buildResponseMetadata(rawResponse, "cancelar");

      await persistSuccess(client, {
        context,
        userId,
        metadata,
        preXml: null,
        postXml: null,
        eventType: "cancelamento_retorno",
      });

      return metadata;
    } catch (error) {
      const lastReturn = session.acbr?.ultimoRetorno?.() || null;

      await persistFailure(client, {
        context,
        userId,
        eventType: "cancelamento_retorno",
        error,
        responseText: lastReturn,
        preXml: null,
      });

      throw new AcbrLibIntegrationError(
        lastReturn || error.message || "Falha ao cancelar a NF-e.",
        { nfeId, tenantId }
      );
    } finally {
      await destroyAcbrSession(session);
    }
  }
}

export { AcbrLibProvider, AcbrLibNotConfiguredError, AcbrLibIntegrationError };
