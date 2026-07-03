export const DEFAULT_GESTAO_WHATSAPP_BOLETO_TEMPLATE =
  "Olá, {nome}. Seguem as cobranças da V12 ERP:\n\n{boletos}";

export const DEFAULT_GESTAO_WHATSAPP_PIX_TEMPLATE =
  "Olá, {nome}. Segue o PIX da V12 ERP. Valor: {valor}. Vencimento: {vencimento}. Copia e cola: {pix_copia_cola}";

const CONFIG_KEY = "whatsapp";

const normalizeText = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    if (required) throw new Error(`${label} obrigatório.`);
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

const buildConfigView = (data = {}) => ({
  provider: data.provider || "evolution",
  whatsapp_ativo: data.whatsapp_ativo === true,
  instance_name: data.instance_name || "",
  remetente_numero: data.remetente_numero || "",
  mensagem_boleto_padrao:
    data.mensagem_boleto_padrao || DEFAULT_GESTAO_WHATSAPP_BOLETO_TEMPLATE,
  mensagem_pix_padrao: data.mensagem_pix_padrao || DEFAULT_GESTAO_WHATSAPP_PIX_TEMPLATE,
});

class GestaoMensagemDAO {
  static renderTemplate(template = "", variables = {}) {
    return String(template || "").replace(/\{(\w+)\}/g, (_, key) =>
      variables[key] === undefined || variables[key] === null ? "" : String(variables[key])
    );
  }

  static normalizarPayloadWhatsApp(payload = {}) {
    const provider = normalizeText(payload.provider || "evolution", 30, {
      required: true,
      label: "Provider do WhatsApp",
    });

    if (provider !== "evolution") {
      throw new Error("Provider do WhatsApp inválido.");
    }

    return {
      provider,
      whatsapp_ativo: normalizeBoolean(payload.whatsapp_ativo, false),
      instance_name: normalizeText(payload.instance_name, 120, {
        label: "Nome da instância",
      }),
      remetente_numero: normalizeDigits(payload.remetente_numero),
      mensagem_boleto_padrao:
        normalizeText(payload.mensagem_boleto_padrao, null, {
          label: "Mensagem padrão do boleto",
        }) || DEFAULT_GESTAO_WHATSAPP_BOLETO_TEMPLATE,
      mensagem_pix_padrao:
        normalizeText(payload.mensagem_pix_padrao, null, {
          label: "Mensagem padrão do PIX",
        }) || DEFAULT_GESTAO_WHATSAPP_PIX_TEMPLATE,
    };
  }

  static validarConfiguracaoWhatsApp(data) {
    if (data.whatsapp_ativo && !data.instance_name) {
      throw new Error("Informe o nome da instância para ativar o WhatsApp da gestão.");
    }
  }

  static async buscarConfiguracaoWhatsApp(client) {
    const { rows } = await client.query(
      `
        SELECT valor_json
        FROM gestao.configuracao
        WHERE chave = $1
        LIMIT 1
      `,
      [CONFIG_KEY]
    );

    return buildConfigView(rows[0]?.valor_json || {});
  }

  static async salvarConfiguracaoWhatsApp(client, payload = {}, usuarioId = null) {
    const data = this.normalizarPayloadWhatsApp(payload);
    this.validarConfiguracaoWhatsApp(data);

    await client.query(
      `
        INSERT INTO gestao.configuracao (
          chave,
          valor_json,
          descricao,
          atualizado_por
        )
        VALUES ($1, $2::jsonb, $3, $4)
        ON CONFLICT (chave) DO UPDATE
        SET
          valor_json = EXCLUDED.valor_json,
          descricao = EXCLUDED.descricao,
          atualizado_por = EXCLUDED.atualizado_por
      `,
      [
        CONFIG_KEY,
        JSON.stringify(data),
        "Configuração de WhatsApp da Gestão V12",
        usuarioId,
      ]
    );

    return this.buscarConfiguracaoWhatsApp(client);
  }

  static async buscarConfiguracaoAtivaWhatsApp(client) {
    const config = await this.buscarConfiguracaoWhatsApp(client);

    if (!config.whatsapp_ativo) {
      throw new Error("A integração de WhatsApp está inativa na Gestão V12.");
    }

    if (!config.instance_name) {
      throw new Error("O nome da instância do WhatsApp da gestão não foi configurado.");
    }

    return config;
  }
}

export default GestaoMensagemDAO;
