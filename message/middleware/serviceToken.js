import { env } from "../config/env.js";

const verifyServiceToken = (req, res, next) => {
  const expected = String(env.serviceToken || "").trim();
  const received = String(req.get("x-service-token") || "").trim();

  if (!expected) {
    return res.status(500).json({
      success: false,
      message: "SERVICE_TOKEN não configurado.",
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
