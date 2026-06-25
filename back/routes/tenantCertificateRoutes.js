import express from "express";
import { previewCertificate } from "../utils/certificatePreview.js";
import { consultarCnpjBrasilApi } from "../utils/brasilApi.js";
import { consultarInscricaoEstadualAcbr } from "../utils/acbrSetup.js";

const router = express.Router();

router.post("/preview", async (req, res) => {
  try {
    const certificado = req.body?.certificado || {};
    const certificadoData = await previewCertificate({
      certificadoBase64: certificado.conteudo_base64,
      certificadoSenha: certificado.senha,
      scopeKey: `${req.user?.userId || "user"}-${Date.now()}`,
    });

    const consultaBrasilApi = await consultarCnpjBrasilApi(certificadoData.cnpj);

    let consultaInscricaoEstadual = null;
    const uf = String(consultaBrasilApi?.empresa?.uf || "").trim().toUpperCase();

    if (uf) {
      try {
        consultaInscricaoEstadual = await consultarInscricaoEstadualAcbr({
          token: req.cookies?.token,
          certificadoBase64: certificado.conteudo_base64,
          certificadoSenha: certificado.senha,
          cnpj: certificadoData.cnpj,
          uf,
          ambiente: "2",
        });

        console.log("[tenant-certificate] IE consultada", {
          cnpj: certificadoData.cnpj,
          uf,
          ie: consultaInscricaoEstadual?.empresa?.inscricao_estadual || "",
          consultaOk: consultaInscricaoEstadual?.consulta_ok || false,
          cStat: consultaInscricaoEstadual?.cStat || null,
        });
      } catch (error) {
        console.error("[tenant-certificate] Falha ao consultar IE:", error);
      }
    }

    const empresaAcbr = consultaInscricaoEstadual?.empresa || {};
    const empresaBrasilApi = consultaBrasilApi.empresa || {};
    const empresa = {
      ...empresaBrasilApi,
      inscricao_estadual:
        empresaAcbr.inscricao_estadual || empresaBrasilApi.inscricao_estadual || "",
      situacao_cadastro:
        empresaAcbr.situacao_cadastro || empresaBrasilApi.situacao_cadastro || "",
    };

    return res.json({
      success: true,
      data: {
        certificado: certificadoData,
        empresa,
        brasilapi: consultaBrasilApi.raw,
        consulta_ie: consultaInscricaoEstadual,
      },
    });
  } catch (error) {
    console.error("[tenant-certificate] Falha ao ler certificado:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível ler o certificado.",
    });
  }
});

export default router;
