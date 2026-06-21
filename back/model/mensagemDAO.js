import { TENANT_CONTEXT_SQL } from "../utils/sql.js";

export const DEFAULT_WHATSAPP_BOLETO_TEMPLATE =
  "Olá, {nome}. Seguem os boletos do título #{titulo_id}. {boletos}";

export const DEFAULT_WHATSAPP_PIX_TEMPLATE =
  "Olá, {nome}. Segue o PIX do título #{titulo_id}, parcela {parcela}. Valor: {valor}. Vencimento: {vencimento}. Copia e cola: {pix_copia_cola}";

const normalizeText = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    if (required) {
      throw new Error(`${label} obrigatório não informado.`);
    }

    return null;
  }

  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const normalizeBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "yes"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no"].includes(normalized)) return false;

  return defaultValue;
};

const normalizeDigits = (value) => String(value ?? "").replace(/\D/g, "");

const buildWhatsAppView = (row = {}) => ({
  provider: row.provider || "evolution",
  whatsapp_ativo: !!row.whatsapp_ativo,
  instance_name: row.instance_name || "",
  remetente_numero: row.remetente_numero || "",
  auto_enviar_boleto_venda: row.auto_enviar_boleto_venda === true,
  auto_enviar_pix_venda: row.auto_enviar_pix_venda === true,
  mensagem_boleto_padrao: row.mensagem_boleto_padrao || DEFAULT_WHATSAPP_BOLETO_TEMPLATE,
  mensagem_pix_padrao: row.mensagem_pix_padrao || DEFAULT_WHATSAPP_PIX_TEMPLATE,
});

class MensagemDAO {
  static async buscarConfiguracaoWhatsApp(client) {
    const { rows } = await client.query(
      `
        SELECT
          provider,
          whatsapp_ativo,
          instance_name,
          remetente_numero,
          auto_enviar_boleto_venda,
          auto_enviar_pix_venda,
          mensagem_boleto_padrao,
          mensagem_pix_padrao
        FROM message.tenant_configuracao_whatsapp
        WHERE tenant_id = ${TENANT_CONTEXT_SQL}
        LIMIT 1
      `
    );

    return buildWhatsAppView(rows[0] || {});
  }

  static normalizarPayloadWhatsApp(payload = {}) {
    const provider = normalizeText(payload.provider, 30, {
      required: true,
      label: "Provider do WhatsApp",
    });

    if (!["evolution"].includes(provider)) {
      throw new Error("Provider do WhatsApp inválido.");
    }

    return {
      provider,
      whatsapp_ativo: normalizeBoolean(payload.whatsapp_ativo, false),
      instance_name: normalizeText(payload.instance_name, 120, {
        label: "Nome da instância",
      }),
      remetente_numero: normalizeDigits(payload.remetente_numero),
      auto_enviar_boleto_venda: normalizeBoolean(
        payload.auto_enviar_boleto_venda,
        false
      ),
      auto_enviar_pix_venda: normalizeBoolean(payload.auto_enviar_pix_venda, false),
      mensagem_boleto_padrao:
        normalizeText(payload.mensagem_boleto_padrao, null, {
          label: "Mensagem padrão do boleto",
        }) || DEFAULT_WHATSAPP_BOLETO_TEMPLATE,
      mensagem_pix_padrao:
        normalizeText(payload.mensagem_pix_padrao, null, {
          label: "Mensagem padrão do PIX",
        }) || DEFAULT_WHATSAPP_PIX_TEMPLATE,
    };
  }

  static validarConfiguracaoWhatsApp(data) {
    if (data.whatsapp_ativo && !data.instance_name) {
      throw new Error("Informe o nome da instância para ativar o WhatsApp.");
    }
  }

  static async salvarConfiguracaoWhatsApp(client, payload = {}) {
    const data = this.normalizarPayloadWhatsApp(payload);
    this.validarConfiguracaoWhatsApp(data);

    await client.query(
      `
        INSERT INTO message.tenant_configuracao_whatsapp (
          tenant_id,
          provider,
          whatsapp_ativo,
          instance_name,
          remetente_numero,
          auto_enviar_boleto_venda,
          auto_enviar_pix_venda,
          mensagem_boleto_padrao,
          mensagem_pix_padrao
        )
        VALUES (
          ${TENANT_CONTEXT_SQL},
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        )
        ON CONFLICT (tenant_id) DO UPDATE
        SET
          provider = EXCLUDED.provider,
          whatsapp_ativo = EXCLUDED.whatsapp_ativo,
          instance_name = EXCLUDED.instance_name,
          remetente_numero = EXCLUDED.remetente_numero,
          auto_enviar_boleto_venda = EXCLUDED.auto_enviar_boleto_venda,
          auto_enviar_pix_venda = EXCLUDED.auto_enviar_pix_venda,
          mensagem_boleto_padrao = EXCLUDED.mensagem_boleto_padrao,
          mensagem_pix_padrao = EXCLUDED.mensagem_pix_padrao
      `,
      [
        data.provider,
        data.whatsapp_ativo,
        data.instance_name,
        data.remetente_numero || null,
        data.auto_enviar_boleto_venda,
        data.auto_enviar_pix_venda,
        data.mensagem_boleto_padrao,
        data.mensagem_pix_padrao,
      ]
    );

    return this.buscarConfiguracaoWhatsApp(client);
  }

  static async buscarConfiguracaoAtivaWhatsApp(client) {
    const config = await this.buscarConfiguracaoWhatsApp(client);

    if (!config.whatsapp_ativo) {
      throw new Error("A integração de WhatsApp está inativa para esta filial.");
    }

    if (!config.instance_name) {
      throw new Error("O nome da instância do WhatsApp não foi configurado.");
    }

    return config;
  }

  static renderTemplate(template, variables = {}) {
    const base = String(template || "").trim();

    return base.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
      const value = variables[key];
      return value === undefined || value === null ? "" : String(value);
    });
  }
}

export default MensagemDAO;
