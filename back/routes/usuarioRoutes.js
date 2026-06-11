import express from "express";
import { pool } from "../config/conexao.js";
import usuarioDAO from "../model/usuarioDAO.js";

const router = express.Router();

router.get("/listar", async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const search = String(req.query.search || "");
  let sort = {};

  try {
    sort = req.query.sort ? JSON.parse(String(req.query.sort)) : {};
  } catch {
    sort = {};
  }

  try {
    const result = await usuarioDAO.listar(pool, {
      page,
      limit,
      search,
      sort,
      tenantId: req.user.tenantId,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[usuario] Falha ao listar usuarios:", error);
    return res.status(500).json({
      success: false,
      message: "Nao foi possivel listar os usuarios.",
    });
  }
});

router.get("/support-data", async (req, res) => {
  try {
    const tenants = await usuarioDAO.listarFiliaisGerenciaveis(pool, req.user.userId);

    return res.json({
      success: true,
      tenantAtualId: req.user.tenantId,
      manageableTenants: tenants,
    });
  } catch (error) {
    console.error("[usuario] Falha ao carregar apoio do formulario:", error);
    return res.status(500).json({
      success: false,
      message: "Nao foi possivel carregar as filiais disponiveis.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await usuarioDAO.buscarPorId(pool, {
      usuarioId: Number(req.params.id),
      currentTenantId: Number(req.user.tenantId),
      actorUserId: Number(req.user.userId),
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Usuario nao encontrado.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[usuario] Falha ao buscar usuario:", error);
    return res.status(500).json({
      success: false,
      message: "Nao foi possivel carregar o usuario.",
    });
  }
});

router.post("/", async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const data = await usuarioDAO.criar(client, {
      actorUserId: Number(req.user.userId),
      currentTenantId: Number(req.user.tenantId),
      payload: req.body || {},
    });

    return res.status(201).json({
      success: true,
      message: "Usuario cadastrado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[usuario] Falha ao criar usuario:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Nao foi possivel criar o usuario.",
    });
  } finally {
    client?.release();
  }
});

router.put("/:id", async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    const data = await usuarioDAO.atualizar(client, {
      actorUserId: Number(req.user.userId),
      currentTenantId: Number(req.user.tenantId),
      usuarioId: Number(req.params.id),
      payload: req.body || {},
    });

    return res.json({
      success: true,
      message: "Usuario atualizado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[usuario] Falha ao atualizar usuario:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Nao foi possivel atualizar o usuario.",
    });
  } finally {
    client?.release();
  }
});

router.delete("/:id", async (req, res) => {
  let client;

  try {
    client = await pool.connect();
    await usuarioDAO.excluir(client, {
      actorUserId: Number(req.user.userId),
      currentTenantId: Number(req.user.tenantId),
      usuarioId: Number(req.params.id),
    });

    return res.json({
      success: true,
      message: "Usuario removido com sucesso.",
    });
  } catch (error) {
    console.error("[usuario] Falha ao excluir usuario:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Nao foi possivel excluir o usuario.",
    });
  } finally {
    client?.release();
  }
});

export default router;
