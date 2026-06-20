import crypto from "crypto";
import { pool } from "../config/conexao.js";

const TERMINAL_STATUSES = new Set(["RECEIVED", "REFUNDED", "DELETED", "RESTORED"]);

const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");

const parseNumeric = (value, { label = "Campo" } = {}) => {
  if (value === null || value === undefined || value === "") {
    throw new Error(`${label} obrigatório.`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} inválido.`);
  }

  return Number(parsed.toFixed(2));
};

const normalizeText = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    if (required) {
      throw new Error(`${label} obrigatório.`);
    }

    return null;
  }

  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const normalizeDate = (value, { required = false, label = "Data" } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) {
      throw new Error(`${label} obrigatório.`);
    }

    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const normalized = String(value).trim();
  if (!normalized) {
    if (required) {
      throw new Error(`${label} obrigatório.`);
    }

    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
    const [day, month, year] = normalized.split("/");
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return normalized;
};

const decryptSecret = (payload) => {
  if (!payload) return null;

  const parsed = JSON.parse(String(payload));
  const key = crypto.createHash("sha256").update(String(process.env.CHAVE_TOKEN || "")).digest();
  const iv = Buffer.from(parsed.iv, "base64");
  const tag = Buffer.from(parsed.tag, "base64");
  const encrypted = Buffer.from(parsed.value, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
};

const asaasBaseUrl = (ambiente) =>
  ambiente === "production" ? "https://api.asaas.com" : "https://api-sandbox.asaas.com";

const asaasRequest = async (apiKey, ambiente, { method = "GET", path, body }) => {
  const response = await fetch(`${asaasBaseUrl(ambiente)}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  let parsed = null;

  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = rawText || null;
  }

  if (!response.ok) {
    const detailMessage =
      parsed?.errors?.[0]?.description ||
      parsed?.message ||
      parsed?.error ||
      rawText ||
      "Falha na integração com o Asaas.";

    throw new Error(detailMessage);
  }

  return parsed;
};

const setTenantContext = async (client, tenantId) => {
  await client.query("SELECT set_config('app.tenant_id', $1, false)", [String(tenantId)]);
};

const resetTenantContext = async (client) => {
  try {
    await client.query("RESET app.tenant_id");
  } catch {}
};

const buildExternalReference = ({ tenantId, financeiroTituloId, financeiroTituloParcelaId }) =>
  `v12:t${tenantId}:ft${financeiroTituloId}:fp${financeiroTituloParcelaId || 0}:${Date.now()}`;

const buildCustomerPayload = (customer) => {
  const digitsPhone = normalizeDigits(customer.telefone || customer.whatsapp);
  const payload = {
    name: customer.nome,
    cpfCnpj: normalizeDigits(customer.documento),
    email: normalizeText(customer.email, 160),
    externalReference: `v12-tenant-${customer.tenantId}-pessoa-${customer.pessoaId}`,
    notificationDisabled: true,
  };

  if (digitsPhone.length === 11) {
    payload.mobilePhone = digitsPhone;
  } else if (digitsPhone.length === 10) {
    payload.phone = digitsPhone;
  }

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== null));
};

const buildPaymentPayload = ({
  externalCustomerId,
  charge,
  externalReference,
  billingType = "PIX",
}) => ({
  customer: externalCustomerId,
  billingType,
  value: charge.valor,
  dueDate: charge.dueDate,
  description: charge.description,
  externalReference,
});

const getWebhookPaymentDate = (payment) =>
  payment?.clientPaymentDate ||
  payment?.paymentDate ||
  payment?.confirmedDate ||
  new Date().toISOString().slice(0, 10);

const hasGatewayConfig = (row) =>
  !!(
    row &&
    (
      row.gateway_ativo ||
      row.api_key_criptografada ||
      row.api_key_masked ||
      row.webhook_auth_token_criptografada ||
      row.webhook_auth_token_masked ||
      row.wallet_id ||
      row.observacao
    )
  );

class AsaasDAO {
  static async buscarGatewayConfig(client, tenantId) {
    await setTenantContext(client, tenantId);

    const { rows } = await client.query(
      `
        SELECT
          provider,
          ambiente,
          wallet_id,
          baixa_automatica_pix,
          baixa_automatica_boleto,
          api_key_criptografada,
          api_key_masked,
          webhook_auth_token_criptografada,
          webhook_auth_token_masked,
          gateway_ativo
        FROM payments.tenant_configuracao_gateway
        WHERE tenant_id = current_setting('app.tenant_id', true)::INTEGER
        LIMIT 1
      `
    );

    let row = rows[0] || null;

    if (!hasGatewayConfig(row)) {
      try {
        const legacyResult = await client.query(
          `
            SELECT
              provider,
              ambiente,
              wallet_id,
              baixa_automatica_pix,
              baixa_automatica_boleto,
              api_key_criptografada,
              api_key_masked,
              webhook_auth_token_criptografada,
              webhook_auth_token_masked,
              gateway_ativo
            FROM public.tenant_configuracao_gateway
            WHERE tenant_id = current_setting('app.tenant_id', true)::INTEGER
            LIMIT 1
          `
        );

        if (legacyResult.rows[0]) {
          row = legacyResult.rows[0];
        }
      } catch {}
    }

    if (!row) {
      throw new Error("Configuração do gateway não encontrada para a filial.");
    }

    if (!row.gateway_ativo) {
      throw new Error("A integração de contas está inativa para esta filial.");
    }

    if (row.provider !== "asaas") {
      throw new Error("Provider do gateway ainda não suportado.");
    }

    const apiKey = decryptSecret(row.api_key_criptografada);
    if (!apiKey) {
      throw new Error("API key do Asaas não configurada.");
    }

    return {
      provider: row.provider,
      ambiente: row.ambiente || "sandbox",
      walletId: row.wallet_id || "",
      baixaAutomaticaPix: row.baixa_automatica_pix !== false,
      baixaAutomaticaBoleto: row.baixa_automatica_boleto !== false,
      apiKey,
      webhookToken: decryptSecret(row.webhook_auth_token_criptografada),
    };
  }

  static async obterOuCriarCliente(client, gatewayConfig, payload) {
    const existing = await client.query(
      `
        SELECT
          gateway_customer_id,
          external_customer_id
        FROM payments.gateway_customer
        WHERE tenant_id = $1
          AND provider = 'asaas'
          AND pessoa_id = $2
        LIMIT 1
      `,
      [payload.tenantId, payload.customer.pessoaId]
    );

    if (existing.rows[0]?.external_customer_id) {
      return existing.rows[0].external_customer_id;
    }

    const customerResponse = await asaasRequest(gatewayConfig.apiKey, gatewayConfig.ambiente, {
      method: "POST",
      path: "/v3/customers",
      body: buildCustomerPayload(payload.customer),
    });

    await client.query(
      `
        INSERT INTO payments.gateway_customer (
          tenant_id,
          provider,
          pessoa_id,
          external_customer_id,
          external_reference,
          nome,
          documento,
          payload
        )
        VALUES ($1, 'asaas', $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tenant_id, provider, pessoa_id) DO UPDATE
        SET
          external_customer_id = EXCLUDED.external_customer_id,
          external_reference = EXCLUDED.external_reference,
          nome = EXCLUDED.nome,
          documento = EXCLUDED.documento,
          payload = EXCLUDED.payload
      `,
      [
        payload.tenantId,
        payload.customer.pessoaId,
        customerResponse.id,
        `v12-tenant-${payload.tenantId}-pessoa-${payload.customer.pessoaId}`,
        payload.customer.nome,
        normalizeDigits(payload.customer.documento),
        JSON.stringify(customerResponse),
      ]
    );

    return customerResponse.id;
  }

  static async buscarCobrancaAberta(client, payload, billingType = "PIX") {
    const { rows } = await client.query(
      `
        SELECT
          gateway_charge_id,
          external_charge_id,
          status,
          valor,
          due_date,
          invoice_url,
          pix_payload,
          pix_encoded_image,
          pix_expiration_date,
          payload
        FROM payments.gateway_charge
        WHERE tenant_id = $1
          AND provider = 'asaas'
          AND financeiro_titulo_id = $2
          AND COALESCE(financeiro_titulo_parcela_id, 0) = COALESCE($3, 0)
          AND billing_type = $4
          AND settled = FALSE
        ORDER BY gateway_charge_id DESC
        LIMIT 1
      `,
      [
        payload.tenantId,
        payload.financeiroTituloId,
        payload.financeiroTituloParcelaId || null,
        billingType,
      ]
    );

    const charge = rows[0];
    if (!charge) return null;

    if (TERMINAL_STATUSES.has(String(charge.status || "").toUpperCase())) {
      return null;
    }

    if (Number(charge.valor || 0) !== Number(payload.charge.valor || 0)) {
      return null;
    }

    if (String(charge.due_date || "").slice(0, 10) !== String(payload.charge.dueDate || "").slice(0, 10)) {
      return null;
    }

    return charge;
  }

  static async criarPixCharge(payload) {
    return this.criarCharge(payload, "PIX");
  }

  static async criarBoletoCharge(payload) {
    return this.criarCharge(payload, "BOLETO");
  }

  static async buscarLinhaDigitavel(apiKey, ambiente, externalChargeId) {
    try {
      return await asaasRequest(apiKey, ambiente, {
        path: `/v3/payments/${externalChargeId}/identificationField`,
      });
    } catch {
      return null;
    }
  }

  static async criarCharge(payload, billingType = "PIX") {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const gatewayConfig = await this.buscarGatewayConfig(client, payload.tenantId);
      const currentOpenCharge = await this.buscarCobrancaAberta(client, payload, billingType);

      if (currentOpenCharge?.external_charge_id) {
        if (
          billingType === "PIX" &&
          (!currentOpenCharge.pix_payload || !currentOpenCharge.pix_encoded_image)
        ) {
          const qrResponse = await asaasRequest(gatewayConfig.apiKey, gatewayConfig.ambiente, {
            path: `/v3/payments/${currentOpenCharge.external_charge_id}/pixQrCode`,
          });

          await client.query(
            `
              UPDATE payments.gateway_charge
              SET
                pix_payload = $2,
                pix_encoded_image = $3,
                pix_expiration_date = $4,
                payload = COALESCE(payload, '{}'::jsonb) || $5::jsonb
              WHERE gateway_charge_id = $1
            `,
            [
              currentOpenCharge.gateway_charge_id,
              qrResponse.payload || null,
              qrResponse.encodedImage || null,
              qrResponse.expirationDate || null,
              JSON.stringify({ qrCode: qrResponse }),
            ]
          );

          currentOpenCharge.pix_payload = qrResponse.payload || null;
          currentOpenCharge.pix_encoded_image = qrResponse.encodedImage || null;
          currentOpenCharge.pix_expiration_date = qrResponse.expirationDate || null;
        }

        await client.query("COMMIT");
        const payloadData = currentOpenCharge.payload || {};

        return {
          reused: true,
          provider: "asaas",
          billingType,
          gatewayChargeId: currentOpenCharge.gateway_charge_id,
          externalChargeId: currentOpenCharge.external_charge_id,
          status: currentOpenCharge.status,
          invoiceUrl: currentOpenCharge.invoice_url || "",
          pix:
            billingType === "PIX"
              ? {
                  payload: currentOpenCharge.pix_payload || "",
                  encodedImage: currentOpenCharge.pix_encoded_image || "",
                  expirationDate: currentOpenCharge.pix_expiration_date || null,
                }
              : null,
          boleto:
            billingType === "BOLETO"
              ? {
                  bankSlipUrl: currentOpenCharge.invoice_url || "",
                  identificationField:
                    payloadData?.identificationField?.identificationField || "",
                }
              : null,
        };
      }

      const externalCustomerId = await this.obterOuCriarCliente(client, gatewayConfig, payload);
      const externalReference = buildExternalReference(payload);

      const paymentResponse = await asaasRequest(gatewayConfig.apiKey, gatewayConfig.ambiente, {
        method: "POST",
        path: "/v3/payments",
        body: buildPaymentPayload({
          externalCustomerId,
          charge: payload.charge,
          externalReference,
          billingType,
        }),
      });

      let qrResponse = null;
      let identificationFieldResponse = null;

      if (billingType === "PIX") {
        qrResponse = await asaasRequest(gatewayConfig.apiKey, gatewayConfig.ambiente, {
          path: `/v3/payments/${paymentResponse.id}/pixQrCode`,
        });
      }

      if (billingType === "BOLETO") {
        identificationFieldResponse = await this.buscarLinhaDigitavel(
          gatewayConfig.apiKey,
          gatewayConfig.ambiente,
          paymentResponse.id
        );
      }

      const { rows } = await client.query(
        `
          INSERT INTO payments.gateway_charge (
            tenant_id,
            provider,
            financeiro_titulo_id,
            financeiro_titulo_parcela_id,
            financeiro_forma_pagamento_id,
            pessoa_id,
            external_charge_id,
            external_customer_id,
            external_reference,
            billing_type,
            status,
            valor,
            due_date,
            invoice_url,
            pix_payload,
            pix_encoded_image,
            pix_expiration_date,
            payload
          )
          VALUES (
            $1,
            'asaas',
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11,
            $12,
            $13,
            $14,
            $15,
            $16
          )
          RETURNING gateway_charge_id
        `,
        [
          payload.tenantId,
          payload.financeiroTituloId,
          payload.financeiroTituloParcelaId || null,
          payload.financeiroFormaPagamentoId,
          payload.customer.pessoaId,
          paymentResponse.id,
          externalCustomerId,
          externalReference,
          billingType,
          paymentResponse.status || "PENDING",
          payload.charge.valor,
          payload.charge.dueDate,
          paymentResponse.bankSlipUrl || paymentResponse.invoiceUrl || "",
          qrResponse?.payload || "",
          qrResponse?.encodedImage || "",
          qrResponse?.expirationDate || null,
          JSON.stringify({
            payment: paymentResponse,
            qrCode: qrResponse,
            identificationField: identificationFieldResponse,
          }),
        ]
      );

      await client.query("COMMIT");

      return {
        reused: false,
        provider: "asaas",
        billingType,
        gatewayChargeId: rows[0].gateway_charge_id,
        externalChargeId: paymentResponse.id,
        status: paymentResponse.status || "PENDING",
        invoiceUrl: paymentResponse.bankSlipUrl || paymentResponse.invoiceUrl || "",
        pix:
          billingType === "PIX"
            ? {
                payload: qrResponse?.payload || "",
                encodedImage: qrResponse?.encodedImage || "",
                expirationDate: qrResponse?.expirationDate || null,
              }
            : null,
        boleto:
          billingType === "BOLETO"
            ? {
                bankSlipUrl: paymentResponse.bankSlipUrl || paymentResponse.invoiceUrl || "",
                identificationField:
                  identificationFieldResponse?.identificationField || "",
              }
            : null,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await resetTenantContext(client);
      client.release();
    }
  }

  static async registrarWebhook({ headers = {}, body = {} }) {
    const payment = body?.payment || {};
    const externalEventId = normalizeText(body?.id, 120, {
      required: true,
      label: "Evento do webhook",
    });
    const eventName = normalizeText(body?.event, 80, {
      required: true,
      label: "Tipo do evento",
    });
    const externalChargeId = normalizeText(payment?.id, 80, {
      required: true,
      label: "Cobrança externa",
    });

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const existingEvent = await client.query(
        `
          SELECT gateway_event_id
          FROM payments.gateway_event
          WHERE provider = 'asaas'
            AND external_event_id = $1
          LIMIT 1
        `,
        [externalEventId]
      );

      if (existingEvent.rows[0]?.gateway_event_id) {
        await client.query("COMMIT");
        return { processed: true, duplicated: true };
      }

      const chargeResult = await client.query(
        `
          SELECT
            gateway_charge_id,
            tenant_id,
            financeiro_titulo_id,
            financeiro_titulo_parcela_id,
            financeiro_forma_pagamento_id,
            valor,
            settled
          FROM payments.gateway_charge
          WHERE provider = 'asaas'
            AND external_charge_id = $1
          LIMIT 1
        `,
        [externalChargeId]
      );

      const charge = chargeResult.rows[0];

      await client.query(
        `
          INSERT INTO payments.gateway_event (
            tenant_id,
            provider,
            external_event_id,
            external_charge_id,
            event_name,
            payload
          )
          VALUES ($1, 'asaas', $2, $3, $4, $5)
        `,
        [charge?.tenant_id || null, externalEventId, externalChargeId, eventName, JSON.stringify(body)]
      );

      if (!charge) {
        await client.query("COMMIT");
        return { processed: true, ignored: true };
      }

      const gatewayConfig = await this.buscarGatewayConfig(client, Number(charge.tenant_id));
      const receivedWebhookToken = String(headers["asaas-access-token"] || "").trim();

      if (!receivedWebhookToken || receivedWebhookToken !== String(gatewayConfig.webhookToken || "")) {
        throw new Error("Webhook do Asaas recusado por token inválido.");
      }

      await client.query(
        `
          UPDATE payments.gateway_charge
          SET
            status = $2,
            payload = COALESCE(payload, '{}'::jsonb) || $3::jsonb
          WHERE gateway_charge_id = $1
        `,
        [
          charge.gateway_charge_id,
          payment?.status || eventName,
          JSON.stringify({ lastWebhook: body }),
        ]
      );

      const billingType = String(payment?.billingType || "").toUpperCase();
      const deveBaixarAutomaticamente =
        billingType === "PIX"
          ? gatewayConfig.baixaAutomaticaPix
          : billingType === "BOLETO"
          ? gatewayConfig.baixaAutomaticaBoleto
          : false;

      if (eventName === "PAYMENT_RECEIVED" && !charge.settled && deveBaixarAutomaticamente) {
        const callbackResponse = await fetch(
          `${String(process.env.BACKEND_URL || "").replace(/\/$/, "")}/integracoes/pagamentos/asaas/baixa-automatica`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-service-token": String(process.env.BACKEND_SERVICE_TOKEN || ""),
            },
            body: JSON.stringify({
              tenant_id: Number(charge.tenant_id),
              financeiro_titulo_id: Number(charge.financeiro_titulo_id),
              financeiro_titulo_parcela_id: charge.financeiro_titulo_parcela_id
                ? Number(charge.financeiro_titulo_parcela_id)
                : null,
              financeiro_forma_pagamento_id: charge.financeiro_forma_pagamento_id
                ? Number(charge.financeiro_forma_pagamento_id)
                : null,
              valor_baixa: Number(charge.valor || 0),
              data_baixa: getWebhookPaymentDate(payment),
              observacao: `Baixa automática Asaas ${billingType || "COBRANÇA"}. Cobrança ${externalChargeId}. Evento ${externalEventId}.${Number(payment?.interestValue || 0) > 0 ? ` Juros/encargos informados pelo Asaas: ${Number(payment.interestValue).toFixed(2)}.` : ""}`,
            }),
          }
        );

        const callbackText = await callbackResponse.text();
        let callbackBody = null;

        try {
          callbackBody = callbackText ? JSON.parse(callbackText) : null;
        } catch {
          callbackBody = callbackText || null;
        }

        if (!callbackResponse.ok) {
          throw new Error(
            callbackBody?.message ||
              callbackBody?.error ||
              "O backend principal recusou a baixa automática."
          );
        }

        await client.query(
          `
            UPDATE payments.gateway_charge
            SET
              settled = TRUE,
              settled_at = NOW(),
              status = $2
            WHERE gateway_charge_id = $1
          `,
          [charge.gateway_charge_id, payment?.status || "RECEIVED"]
        );
      }

      await client.query(
        `
          UPDATE payments.gateway_event
          SET
            processed = TRUE,
            processed_at = NOW()
          WHERE provider = 'asaas'
            AND external_event_id = $1
        `,
        [externalEventId]
      );

      await client.query("COMMIT");
      return { processed: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      await resetTenantContext(client);
      client.release();
    }
  }

  static validarPayloadInterno(payload = {}, billingType = "PIX") {
    const tenantId = Number(payload?.tenantId);
    const financeiroTituloId = Number(payload?.financeiroTituloId);
    const financeiroFormaPagamentoId =
      payload?.financeiroFormaPagamentoId === null ||
      payload?.financeiroFormaPagamentoId === undefined ||
      payload?.financeiroFormaPagamentoId === ""
        ? null
        : Number(payload?.financeiroFormaPagamentoId);
    const pessoaId = Number(payload?.customer?.pessoaId);

    if (!Number.isInteger(tenantId) || tenantId <= 0) {
      throw new Error(
        `Tenant inválido para a cobrança ${billingType === "BOLETO" ? "boleto" : "PIX"}.`
      );
    }

    if (!Number.isInteger(financeiroTituloId) || financeiroTituloId <= 0) {
      throw new Error(
        `Título financeiro inválido para a cobrança ${billingType === "BOLETO" ? "boleto" : "PIX"}.`
      );
    }

    if (
      billingType !== "BOLETO" &&
      (!Number.isInteger(financeiroFormaPagamentoId) || financeiroFormaPagamentoId <= 0)
    ) {
      throw new Error("Forma de pagamento inválida para a cobrança.");
    }

    if (!Number.isInteger(pessoaId) || pessoaId <= 0) {
      throw new Error("Pessoa inválida para a cobrança.");
    }

    const nome = normalizeText(payload?.customer?.nome, 180, {
      required: true,
      label: "Nome do cliente",
    });
    const documento = normalizeDigits(payload?.customer?.documento);

    if (!documento) {
      throw new Error("Documento do cliente obrigatório para gerar a cobrança.");
    }

    return {
      tenantId,
      financeiroTituloId,
      financeiroTituloParcelaId: payload?.financeiroTituloParcelaId
        ? Number(payload.financeiroTituloParcelaId)
        : null,
      financeiroFormaPagamentoId:
        Number.isInteger(financeiroFormaPagamentoId) && financeiroFormaPagamentoId > 0
          ? financeiroFormaPagamentoId
          : null,
      customer: {
        tenantId,
        pessoaId,
        nome,
        documento,
        email: normalizeText(payload?.customer?.email, 160),
        telefone: normalizeText(payload?.customer?.telefone, 20),
        whatsapp: normalizeText(payload?.customer?.whatsapp, 20),
      },
      charge: {
        valor: parseNumeric(payload?.charge?.valor, {
          label: billingType === "BOLETO" ? "Valor do boleto" : "Valor da cobrança PIX",
        }),
        dueDate: normalizeDate(payload?.charge?.dueDate, {
          required: true,
          label: billingType === "BOLETO" ? "Vencimento do boleto" : "Vencimento da cobrança PIX",
        }),
        description: normalizeText(payload?.charge?.description, 500, {
          required: true,
          label: billingType === "BOLETO" ? "Descrição do boleto" : "Descrição da cobrança PIX",
        }),
      },
    };
  }
}

export default AsaasDAO;
