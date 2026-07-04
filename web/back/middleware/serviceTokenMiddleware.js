const verifyServiceToken = (req, res, next) => {
  const expected = String(process.env.PAYMENTS_SERVICE_TOKEN || "").trim();
  const received = String(req.get("x-service-token") || "").trim();

  if (!expected) {
    return res.status(500).json({
      success: false,
      message: "PAYMENTS_SERVICE_TOKEN não configurado.",
    });
  }

  if (!received || received !== expected) {
    return res.status(401).json({
      success: false,
      message: "Token interno inválido.",
    });
  }

  return next();
};

export default verifyServiceToken;
