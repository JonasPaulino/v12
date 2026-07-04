import express from "express";

const router = express.Router();

const acbrBaseUrl = () =>
  String(process.env.ACBR_SERVICE_URL || "http://acbr:4100").replace(/\/+$/, "");

const contentDispositionFileName = (value, fallback) => {
  const match = String(value || "").match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
};

const proxyNfePdf = async (req, res, { acbrPath, fallbackFileName, fallbackMessage }) => {
  try {
    const response = await fetch(`${acbrBaseUrl()}${acbrPath}`, {
      method: "GET",
      headers: {
        Cookie: req.headers.cookie || "",
        Accept: "application/pdf, application/json",
      },
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const body = contentType.includes("application/json")
        ? await response.json().catch(() => null)
        : null;
      const text = body ? "" : await response.text().catch(() => "");

      return res.status(response.status).json({
        success: false,
        message: body?.message || text || fallbackMessage,
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const disposition = response.headers.get("content-disposition");
    const filename = contentDispositionFileName(disposition, fallbackFileName);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.end(buffer);
  } catch (error) {
    console.error("[reports:nfe] Falha ao buscar PDF na ACBrLib:", error);
    return res.status(500).json({
      success: false,
      message: fallbackMessage,
    });
  }
};

router.get("/:id/danfe", async (req, res) =>
  proxyNfePdf(req, res, {
    acbrPath: `/nfe/${encodeURIComponent(req.params.id)}/danfe`,
    fallbackFileName: `danfe-nfe-${req.params.id}.pdf`,
    fallbackMessage: "Não foi possível gerar o DANFE pela ACBrLib.",
  })
);

router.get("/:id/previa", async (req, res) =>
  proxyNfePdf(req, res, {
    acbrPath: `/nfe/${encodeURIComponent(req.params.id)}/previa`,
    fallbackFileName: `previa-nfe-${req.params.id}.pdf`,
    fallbackMessage: "Não foi possível gerar a prévia da NF-e pela ACBrLib.",
  })
);

export default router;
