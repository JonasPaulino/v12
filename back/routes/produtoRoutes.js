import express from "express";
import ProdutoDAO from "../model/produtoDAO.js";

const router = express.Router();

router.get("/listar", async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const search = String(req.query.search || "");
    let sort = {};

    try {
      sort = req.query.sort ? JSON.parse(String(req.query.sort)) : {};
    } catch {
      sort = {};
    }

    const result = await ProdutoDAO.listar(req.db, {
      page,
      limit,
      search,
      sort,
    });

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[produto] Falha ao listar produtos:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível listar os produtos.",
    });
  }
});

router.get("/support-data", async (req, res) => {
  try {
    const data = await ProdutoDAO.obterSupportData(req.db);
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[produto] Falha ao carregar dados de apoio:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar os dados auxiliares do produto.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const produtoId = Number(req.params.id);
    const data = await ProdutoDAO.buscarPorId(req.db, produtoId);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Produto não encontrado.",
      });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[produto] Falha ao buscar produto:", error);
    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar o produto.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const data = await ProdutoDAO.criar(req.db, req.body || {});
    return res.status(201).json({
      success: true,
      message: "Produto cadastrado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[produto] Falha ao criar produto:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível cadastrar o produto.",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const produtoId = Number(req.params.id);
    const data = await ProdutoDAO.atualizar(req.db, produtoId, req.body || {});

    return res.json({
      success: true,
      message: "Produto atualizado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[produto] Falha ao atualizar produto:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível atualizar o produto.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const produtoId = Number(req.params.id);
    await ProdutoDAO.excluir(req.db, produtoId);

    return res.json({
      success: true,
      message: "Produto removido com sucesso.",
    });
  } catch (error) {
    console.error("[produto] Falha ao excluir produto:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Não foi possível remover o produto.",
    });
  }
});

export default router;
