import express from "express";
import {
  configureAcbrLookupSession,
  createAcbrLookupSession,
  destroyAcbrSession,
} from "../providers/acbrlib/runtime.js";
import { parseConsultaCadastroResponse } from "../utils/consultaCadastro.js";
import { getCufByUf } from "../utils/ufCodes.js";

const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");

const router = express.Router();

router.post("/company-preview", async (req, res) => {
  let session = null;

  try {
    const certificado = req.body?.certificado || {};
    const cnpj = normalizeDigits(req.body?.cnpj || "");
    const uf = String(req.body?.uf || "").trim().toUpperCase();
    const ambiente = String(req.body?.ambiente || "2").trim() || "2";
    const cuf = getCufByUf(uf);

    if (!cnpj || cnpj.length !== 14) {
      return res.status(400).json({
        success: false,
        message: "CNPJ inválido para consulta cadastral.",
      });
    }

    if (!uf || !cuf) {
      return res.status(400).json({
        success: false,
        message: "UF inválida para consulta cadastral.",
      });
    }

    session = await createAcbrLookupSession({
      scopeKey: `consulta-cadastro-${Date.now()}`,
      certificadoBuffer: Buffer.from(String(certificado.conteudo_base64 || ""), "base64"),
      certificadoSenha: certificado.senha || "",
    });

    await configureAcbrLookupSession(session, { uf, ambiente });

    const rawResponse = session.acbr.consultaCadastro(cuf, cnpj, false);
    const parsed = parseConsultaCadastroResponse(rawResponse);

    console.log("[acbr:setup] Consulta cadastral concluída", {
      uf,
      cuf,
      cnpj,
      rawType: typeof rawResponse,
      rawLength: String(rawResponse || "").length,
      cStat: parsed?.cStat || null,
      consultaOk: parsed?.consulta_ok || false,
      inscricaoEstadual: parsed?.empresa?.inscricao_estadual || "",
    });

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error("[acbr:setup] Falha na consulta cadastral:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível consultar a inscrição estadual.",
    });
  } finally {
    await destroyAcbrSession(session);
  }
});

export default router;
