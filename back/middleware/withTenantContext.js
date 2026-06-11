import { pool } from "../config/conexao.js";

export const withTenantContext = async (req, res, next) => {
  let client;
  let released = false;

  const resetAndRelease = async () => {
    if (!client || released) return;
    released = true;
    try {
      await client.query("RESET app.tenant_id");
    } catch (error) {
      console.error("[db] Falha ao limpar contexto do tenant:", error.message);
    } finally {
      client.release();
    }
  };

  try {
    if (!req.user?.tenantId) {
      return res.status(400).json({ error: "Tenant nao informado na sessao." });
    }

    client = await pool.connect();
    await client.query("SELECT set_config('app.tenant_id', $1, false)", [
      String(req.user.tenantId),
    ]);

    req.db = client;

    res.on("finish", resetAndRelease);
    res.on("close", resetAndRelease);
    req.on("aborted", resetAndRelease);

    return next();
  } catch (error) {
    await resetAndRelease();
    console.error("[db] Erro ao definir contexto do tenant:", error);
    return res.status(500).json({ error: "Falha ao preparar contexto da filial." });
  }
};
