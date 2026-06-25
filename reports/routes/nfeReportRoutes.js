import express from "express";
import NfeReportDAO from "../model/nfeReportDAO.js";
import { buildDanfeHtml } from "../service/danfeHtmlService.js";
import { renderHtmlToPdf } from "../service/pdfService.js";

const router = express.Router();

router.get("/:id/danfe", async (req, res) => {
  const format = String(req.query.format || "pdf").toLowerCase();

  try {
    const dados = await NfeReportDAO.buscarDanfe(req.db, req.params.id);
    if (!dados) {
      return res.status(404).json({
        success: false,
        message: "NF-e não encontrada.",
      });
    }

    if (String(dados.nfe.status || "").toLowerCase() !== "autorizada") {
      return res.status(400).json({
        success: false,
        message: "DANFE disponível apenas para NF-e autorizada.",
      });
    }

    if (!dados.nfe.xml_autorizado) {
      return res.status(400).json({
        success: false,
        message: "A NF-e autorizada ainda não possui XML salvo.",
      });
    }

    const html = buildDanfeHtml(dados);

    if (format === "html") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(html);
    }

    const buffer = await renderHtmlToPdf(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="danfe-nfe-${dados.nfe.numero || dados.nfe.nfe_id}.pdf"`
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(buffer);
  } catch (error) {
    console.error("[reports:nfe] Falha ao gerar DANFE:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível gerar o DANFE.",
    });
  }
});

export default router;
