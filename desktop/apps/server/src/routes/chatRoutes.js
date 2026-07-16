import { Router } from "express";
import {
  createChatSupportAttendance,
  getChatSupportAttendance,
  getChatSupportSnapshot,
  rateChatSupportAttendance,
  sendChatSupportMessage,
} from "../services/chatProxyService.js";

const router = Router();

router.get("/config", async (_req, res, next) => {
  try {
    const data = await getChatSupportSnapshot();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/atendimentos", async (req, res, next) => {
  try {
    const data = await createChatSupportAttendance(req.body || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/atendimentos/:token", async (req, res, next) => {
  try {
    const data = await getChatSupportAttendance(req.params.token);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/atendimentos/:token/mensagens", async (req, res, next) => {
  try {
    const data = await sendChatSupportMessage(req.params.token, req.body?.conteudo);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post("/atendimentos/:token/avaliacao", async (req, res, next) => {
  try {
    const data = await rateChatSupportAttendance(req.params.token, req.body || {});
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
