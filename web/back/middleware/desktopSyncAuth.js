const desktopSyncAuth = (req, res, next) => {
  const expectedToken = process.env.DESKTOP_SYNC_TOKEN;

  if (!expectedToken) {
    return res.status(503).json({
      success: false,
      message: "Sincronização desktop não configurada.",
    });
  }

  const header = String(req.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token || token !== expectedToken) {
    return res.status(401).json({
      success: false,
      message: "Token de sincronização inválido.",
    });
  }

  return next();
};

export default desktopSyncAuth;
