import { pool } from "../config/conexao.js";
import ChatDAO from "../model/chatDAO.js";
import GestaoMensagemDAO from "../model/gestaoMensagemDAO.js";
import { enviarWhatsAppTexto } from "./messageGatewayService.js";

const compactText = (value, maxLength = 180) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3).trim()}...`;
};

const buildPendingChatWhatsAppMessage = (atendimento, minutos) => {
  const linhas = [
    "Novo atendimento aguardando no V12 ERP.",
    "",
    `Protocolo: ${atendimento.protocolo}`,
    `Setor: ${atendimento.categoria_nome}`,
    `Cliente: ${atendimento.cliente_nome}`,
    atendimento.cliente_telefone ? `Telefone: ${atendimento.cliente_telefone}` : null,
    `Aguardando há mais de ${minutos} minuto(s).`,
    "",
    `Assunto: ${compactText(atendimento.assunto, 120)}`,
    `Mensagem: ${compactText(atendimento.mensagem_inicial, 220)}`,
    "",
    "Acesse a Gestão V12 > Chat para iniciar o atendimento.",
  ];

  return linhas.filter(Boolean).join("\n");
};

export const enviarNotificacoesChatPendentes = async ({ limite = 20 } = {}) => {
  const client = await pool.connect();

  try {
    const { config, atendimentos } =
      await ChatDAO.listarAtendimentosPendentesNotificacaoWhatsApp(client, limite);

    if (!atendimentos.length) {
      return {
        enviados: 0,
        ignorados: 0,
        motivo: config.notificacao_whatsapp_ativa
          ? "Nenhum atendimento pendente acima do tempo configurado."
          : "Notificação por WhatsApp desativada.",
      };
    }

    const whatsAppConfig = await GestaoMensagemDAO.buscarConfiguracaoWhatsApp(client);
    if (!whatsAppConfig.whatsapp_ativo || !whatsAppConfig.instance_name) {
      return {
        enviados: 0,
        ignorados: atendimentos.length,
        motivo: "WhatsApp da Gestão V12 inativo ou sem instância configurada.",
      };
    }

    let enviados = 0;

    for (const atendimento of atendimentos) {
      await enviarWhatsAppTexto({
        instanceName: whatsAppConfig.instance_name,
        toNumber: config.notificacao_whatsapp_numero,
        text: buildPendingChatWhatsAppMessage(
          atendimento,
          config.notificacao_whatsapp_minutos
        ),
      });

      await ChatDAO.marcarNotificacaoWhatsAppEnviada(client, atendimento.atendimento_id);
      enviados += 1;
    }

    return { enviados, ignorados: 0 };
  } finally {
    client.release();
  }
};

export const startChatNotificationJob = () => {
  const enabled = String(process.env.CHAT_WHATSAPP_NOTIFICATION_JOB_ENABLED || "true")
    .trim()
    .toLowerCase() !== "false";
  if (!enabled) return null;

  const intervalMs = Math.max(
    30_000,
    Number(process.env.CHAT_WHATSAPP_NOTIFICATION_JOB_INTERVAL_MS || 60_000)
  );

  const run = async () => {
    try {
      const result = await enviarNotificacoesChatPendentes();
      if (result.enviados > 0) {
        console.log("[chat:notificacao-whatsapp] Notificações enviadas", result);
      }
    } catch (error) {
      console.error("[chat:notificacao-whatsapp] Falha ao processar notificações:", {
        message: error.message,
      });
    }
  };

  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  setTimeout(run, 15_000).unref?.();

  return timer;
};
