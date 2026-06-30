import express from "express";
import MdfeDAO from "../model/mdfeDAO.js";

const router = express.Router();

const parseSort = (value) => {
  try {
    return value ? JSON.parse(String(value)) : {};
  } catch {
    return {};
  }
};

const handleError = (res, error, fallbackMessage, status = 400) => {
  const message = error?.message || fallbackMessage;
  const duplicate = error?.code === "23505";

  return res.status(duplicate ? 409 : status).json({
    success: false,
    message: duplicate ? "Já existe um cadastro com estes dados." : message,
  });
};

router.get("/veiculos", async (req, res) => {
  try {
    const result = await MdfeDAO.listarEntidade(req.db, "veiculo", {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: String(req.query.search || ""),
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("[mdfe] Falha ao listar veículos:", error);
    return handleError(res, error, "Não foi possível listar os veículos.", 500);
  }
});

router.get("/veiculos-select", async (req, res) => {
  try {
    const data = await MdfeDAO.listarVeiculosSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[mdfe] Falha ao pesquisar veículos:", error);
    return handleError(res, error, "Não foi possível pesquisar veículos.", 500);
  }
});

router.post("/veiculos", async (req, res) => {
  try {
    const data = await MdfeDAO.salvarVeiculo(req.db, { payload: req.body || {} });
    return res.status(201).json({
      success: true,
      message: "Veículo cadastrado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[mdfe] Falha ao salvar veículo:", error);
    return handleError(res, error, "Não foi possível salvar o veículo.");
  }
});

router.put("/veiculos/:id", async (req, res) => {
  try {
    const data = await MdfeDAO.salvarVeiculo(req.db, {
      id: Number(req.params.id),
      payload: req.body || {},
    });
    return res.json({ success: true, message: "Veículo atualizado com sucesso.", data });
  } catch (error) {
    console.error("[mdfe] Falha ao atualizar veículo:", error);
    return handleError(res, error, "Não foi possível atualizar o veículo.");
  }
});

router.delete("/veiculos/:id", async (req, res) => {
  try {
    const data = await MdfeDAO.excluirEntidade(req.db, "veiculo", Number(req.params.id));
    return res.json({ success: true, message: "Veículo inativado com sucesso.", data });
  } catch (error) {
    console.error("[mdfe] Falha ao inativar veículo:", error);
    return handleError(res, error, "Não foi possível inativar o veículo.");
  }
});

router.get("/motoristas", async (req, res) => {
  try {
    const result = await MdfeDAO.listarEntidade(req.db, "motorista", {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: String(req.query.search || ""),
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("[mdfe] Falha ao listar motoristas:", error);
    return handleError(res, error, "Não foi possível listar os motoristas.", 500);
  }
});

router.get("/motoristas-select", async (req, res) => {
  try {
    const data = await MdfeDAO.listarMotoristasSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[mdfe] Falha ao pesquisar motoristas:", error);
    return handleError(res, error, "Não foi possível pesquisar motoristas.", 500);
  }
});

router.get("/pessoas-select", async (req, res) => {
  try {
    const data = await MdfeDAO.listarPessoasMotoristaSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[mdfe] Falha ao pesquisar pessoas:", error);
    return handleError(res, error, "Não foi possível pesquisar pessoas.", 500);
  }
});

router.post("/motoristas", async (req, res) => {
  try {
    const data = await MdfeDAO.salvarMotorista(req.db, { payload: req.body || {} });
    return res.status(201).json({
      success: true,
      message: "Motorista cadastrado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[mdfe] Falha ao salvar motorista:", error);
    return handleError(res, error, "Não foi possível salvar o motorista.");
  }
});

router.put("/motoristas/:id", async (req, res) => {
  try {
    const data = await MdfeDAO.salvarMotorista(req.db, {
      id: Number(req.params.id),
      payload: req.body || {},
    });
    return res.json({ success: true, message: "Motorista atualizado com sucesso.", data });
  } catch (error) {
    console.error("[mdfe] Falha ao atualizar motorista:", error);
    return handleError(res, error, "Não foi possível atualizar o motorista.");
  }
});

router.delete("/motoristas/:id", async (req, res) => {
  try {
    const data = await MdfeDAO.excluirEntidade(req.db, "motorista", Number(req.params.id));
    return res.json({ success: true, message: "Motorista inativado com sucesso.", data });
  } catch (error) {
    console.error("[mdfe] Falha ao inativar motorista:", error);
    return handleError(res, error, "Não foi possível inativar o motorista.");
  }
});

router.get("/seguradoras", async (req, res) => {
  try {
    const result = await MdfeDAO.listarEntidade(req.db, "seguradora", {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: String(req.query.search || ""),
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("[mdfe] Falha ao listar seguradoras:", error);
    return handleError(res, error, "Não foi possível listar as seguradoras.", 500);
  }
});

router.get("/seguradoras-select", async (req, res) => {
  try {
    const data = await MdfeDAO.listarSeguradorasSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[mdfe] Falha ao pesquisar seguradoras:", error);
    return handleError(res, error, "Não foi possível pesquisar seguradoras.", 500);
  }
});

router.post("/seguradoras", async (req, res) => {
  try {
    const data = await MdfeDAO.salvarSeguradora(req.db, { payload: req.body || {} });
    return res.status(201).json({
      success: true,
      message: "Seguradora cadastrada com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[mdfe] Falha ao salvar seguradora:", error);
    return handleError(res, error, "Não foi possível salvar a seguradora.");
  }
});

router.put("/seguradoras/:id", async (req, res) => {
  try {
    const data = await MdfeDAO.salvarSeguradora(req.db, {
      id: Number(req.params.id),
      payload: req.body || {},
    });
    return res.json({ success: true, message: "Seguradora atualizada com sucesso.", data });
  } catch (error) {
    console.error("[mdfe] Falha ao atualizar seguradora:", error);
    return handleError(res, error, "Não foi possível atualizar a seguradora.");
  }
});

router.delete("/seguradoras/:id", async (req, res) => {
  try {
    const data = await MdfeDAO.excluirEntidade(req.db, "seguradora", Number(req.params.id));
    return res.json({ success: true, message: "Seguradora inativada com sucesso.", data });
  } catch (error) {
    console.error("[mdfe] Falha ao inativar seguradora:", error);
    return handleError(res, error, "Não foi possível inativar a seguradora.");
  }
});

router.get("/manifestos", async (req, res) => {
  try {
    const result = await MdfeDAO.listarManifestos(req.db, {
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
      search: String(req.query.search || ""),
      sort: parseSort(req.query.sort),
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("[mdfe] Falha ao listar manifestos:", error);
    return handleError(res, error, "Não foi possível listar os MDF-e.", 500);
  }
});

router.get("/nfe-autorizadas-select", async (req, res) => {
  try {
    const data = await MdfeDAO.listarNfesAutorizadasSelect(req.db, {
      search: String(req.query.search || ""),
      limit: Number(req.query.limit || 20),
      mdfeId: req.query.mdfe_id ? Number(req.query.mdfe_id) : null,
    });

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[mdfe] Falha ao pesquisar NF-e autorizadas:", error);
    return handleError(res, error, "Não foi possível pesquisar NF-e autorizadas.", 500);
  }
});

router.get("/manifestos/:id", async (req, res) => {
  try {
    const data = await MdfeDAO.buscarManifestoPorId(req.db, Number(req.params.id));
    if (!data) {
      return res.status(404).json({ success: false, message: "MDF-e não encontrado." });
    }

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[mdfe] Falha ao buscar manifesto:", error);
    return handleError(res, error, "Não foi possível buscar o MDF-e.", 500);
  }
});

router.post("/manifestos", async (req, res) => {
  try {
    const data = await MdfeDAO.salvarManifesto(req.db, {
      payload: req.body || {},
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.status(201).json({
      success: true,
      message: "MDF-e salvo como rascunho.",
      data,
    });
  } catch (error) {
    console.error("[mdfe] Falha ao salvar manifesto:", error);
    return handleError(res, error, "Não foi possível salvar o MDF-e.");
  }
});

router.put("/manifestos/:id", async (req, res) => {
  try {
    const data = await MdfeDAO.salvarManifesto(req.db, {
      id: Number(req.params.id),
      payload: req.body || {},
      usuarioId: Number(req.user?.userId) || null,
    });

    return res.json({
      success: true,
      message: "MDF-e atualizado com sucesso.",
      data,
    });
  } catch (error) {
    console.error("[mdfe] Falha ao atualizar manifesto:", error);
    return handleError(res, error, "Não foi possível atualizar o MDF-e.");
  }
});

router.delete("/manifestos/:id", async (req, res) => {
  try {
    const data = await MdfeDAO.excluirManifesto(req.db, Number(req.params.id));
    return res.json({ success: true, message: "MDF-e excluído com sucesso.", data });
  } catch (error) {
    console.error("[mdfe] Falha ao excluir manifesto:", error);
    return handleError(res, error, "Não foi possível excluir o MDF-e.");
  }
});

export default router;
