import crypto from "crypto";

const normalizeDigits = (value) => String(value || "").replace(/\D/g, "");

const normalizeText = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    if (required) throw new Error(`${label} obrigatório.`);
    return null;
  }

  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const normalizeDate = (value, { required = false, label = "Data" } = {}) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    if (required) throw new Error(`${label} obrigatória.`);
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);

  throw new Error(`${label} inválida.`);
};

const parseMoney = (value, { required = false, label = "Valor" } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`${label} obrigatório.`);
    return null;
  }

  const normalized = String(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${label} inválido.`);

  return Number(parsed.toFixed(2));
};

const toAsaasDate = (value, label = "Data de vencimento") => {
  if (!value) throw new Error(`${label} deve ser informada.`);

  if (typeof value === "string") {
    const normalized = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(normalized)) {
      const [day, month, year] = normalized.split("/");
      return `${year}-${month}-${day}`;
    }
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  throw new Error(`${label} inválida.`);
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

const encryptSecret = (text) => {
  if (!text) return null;

  const key = crypto.createHash("sha256").update(String(process.env.CHAVE_TOKEN || "")).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(text), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    value: encrypted.toString("base64"),
  });
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
    const detail =
      parsed?.errors?.[0]?.description ||
      parsed?.message ||
      parsed?.error ||
      rawText ||
      "Falha na integração com o Asaas.";
    throw new Error(detail);
  }

  return parsed;
};

const asaasPdfRequest = async (apiKey, ambiente, { path }) => {
  const response = await fetch(`${asaasBaseUrl(ambiente)}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/pdf",
      access_token: apiKey,
    },
  });

  const contentType = response.headers.get("content-type") || "application/pdf";

  if (!response.ok) {
    const rawText = await response.text();
    let parsed = null;

    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = rawText || null;
    }

    const detail =
      parsed?.errors?.[0]?.description ||
      parsed?.message ||
      parsed?.error ||
      rawText ||
      "Falha ao baixar o carnê no Asaas.";
    throw new Error(detail);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType,
  };
};

const listarPagamentosParcelamentoAsaas = async (apiKey, ambiente, installmentId) => {
  const limit = 100;
  let offset = 0;
  const payments = [];

  while (true) {
    const result = await asaasRequest(apiKey, ambiente, {
      path: `/v3/installments/${encodeURIComponent(
        installmentId
      )}/payments?limit=${limit}&offset=${offset}`,
    });
    const data = Array.isArray(result?.data) ? result.data : [];

    payments.push(...data);

    if (!result?.hasMore || data.length === 0) break;
    offset += limit;
  }

  return payments;
};

const listarPagamentosPorInstallmentAsaas = async (apiKey, ambiente, installmentId) => {
  const limit = 100;
  let offset = 0;
  const payments = [];

  while (true) {
    const result = await asaasRequest(apiKey, ambiente, {
      path: `/v3/payments?installment=${encodeURIComponent(
        installmentId
      )}&limit=${limit}&offset=${offset}`,
    });
    const data = Array.isArray(result?.data) ? result.data : [];

    payments.push(...data);

    if (!result?.hasMore || data.length === 0) break;
    offset += limit;
  }

  return payments;
};

const mergeAsaasPayments = (...groups) => {
  const map = new Map();

  for (const group of groups) {
    for (const payment of group || []) {
      if (payment?.id) map.set(payment.id, payment);
    }
  }

  return [...map.values()].sort((a, b) => {
    const numberA = Number(a.installmentNumber || 0);
    const numberB = Number(b.installmentNumber || 0);
    if (numberA && numberB && numberA !== numberB) return numberA - numberB;
    return String(a.dueDate || "").localeCompare(String(b.dueDate || ""));
  });
};

const getConfigValue = async (client) => {
  const { rows } = await client.query(
    `
      SELECT valor_json
      FROM gestao.configuracao
      WHERE chave = 'asaas_v12'
      LIMIT 1
    `
  );

  return rows[0]?.valor_json || {};
};

const buildCustomerPayload = (pessoa) => {
  const phone = normalizeDigits(pessoa.pessoa_telefone || pessoa.pessoa_whatsapp);
  const payload = {
    name: pessoa.pessoa_nome_razao,
    cpfCnpj: normalizeDigits(pessoa.pessoa_cpf_cnpj),
    email: normalizeText(pessoa.pessoa_email, 160),
    externalReference: `v12-gestao-pessoa-${pessoa.pessoa_id}`,
    notificationDisabled: true,
  };

  if (phone.length === 11) payload.mobilePhone = phone;
  if (phone.length === 10) payload.phone = phone;

  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== null));
};

const buildPaymentPayload = ({ customerId, parcela, titulo, billingType }) => ({
  customer: customerId,
  billingType,
  value: Number(parcela.valor),
  dueDate: toAsaasDate(parcela.vencimento),
  description: `${titulo.descricao} - Parcela ${parcela.numero_parcela}`,
  externalReference: `v12-gestao:t${titulo.titulo_id}:p${parcela.parcela_id}:${Date.now()}`,
});

const buildInstallmentPayload = ({ customerId, parcelas, titulo }) => {
  const sorted = [...parcelas].sort((a, b) => Number(a.numero_parcela) - Number(b.numero_parcela));
  const first = sorted[0];
  const expectedValue = Number(first?.valor || 0);
  const sameValue = sorted.every((parcela) => Number(parcela.valor || 0) === expectedValue);

  if (!sameValue) {
    throw new Error("Para gerar carnê no Asaas, todas as parcelas do título precisam ter o mesmo valor.");
  }

  return {
    customer: customerId,
    billingType: "BOLETO",
    installmentCount: sorted.length,
    installmentValue: expectedValue,
    dueDate: toAsaasDate(first.vencimento),
    description: titulo.descricao,
    externalReference: `v12-gestao:t${titulo.titulo_id}:carne:${Date.now()}`,
  };
};

const asaasPaidStatuses = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

class GestaoFinanceiroDAO {
  static async listarParcelas(
    client,
    { page = 1, limit = 20, search = "", status = "", syncAsaas = false } = {}
  ) {
    await client.query(
      `
        UPDATE gestao.financeiro_parcela fp
        SET status = 'vencido'
        FROM gestao.financeiro_titulo ft
        WHERE ft.titulo_id = fp.titulo_id
          AND ft.excluido = FALSE
          AND fp.status = 'aberto'
          AND fp.vencimento < CURRENT_DATE
      `
    );

    await client.query(
      `
        UPDATE gestao.financeiro_titulo ft
        SET status = 'vencido'
        WHERE ft.excluido = FALSE
          AND ft.status IN ('aberto', 'parcial')
          AND EXISTS (
            SELECT 1
            FROM gestao.financeiro_parcela fp
            WHERE fp.titulo_id = ft.titulo_id
              AND fp.status = 'vencido'
          )
      `
    );

    await client.query(
      `
        UPDATE gestao.cliente_parcela
        SET status = 'vencida'
        WHERE status IN ('aberta', 'gerada')
          AND vencimento < CURRENT_DATE
      `
    );

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const offset = (safePage - 1) * safeLimit;
    const values = [];
    const filters = ["ft.excluido = FALSE"];

    if (search) {
      values.push(`%${search}%`);
      filters.push(`
        (
          p.nome_razao ILIKE $${values.length}
          OR p.nome_fantasia ILIKE $${values.length}
          OR p.cpf_cnpj ILIKE $${values.length}
          OR ft.descricao ILIKE $${values.length}
          OR ft.documento ILIKE $${values.length}
        )
      `);
    }

    if (status) {
      values.push(status);
      filters.push("fp.status = $" + values.length);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const countResult = await client.query(
      `
        SELECT COUNT(*)::INTEGER AS total
        FROM gestao.financeiro_parcela fp
        JOIN gestao.financeiro_titulo ft ON ft.titulo_id = fp.titulo_id
        LEFT JOIN gestao.pessoa p ON p.pessoa_id = ft.pessoa_id
        ${where}
      `,
      values
    );

    values.push(safeLimit, offset);
    const { rows } = await client.query(
      `
        SELECT
          fp.parcela_id,
          fp.titulo_id,
          fp.numero_parcela,
          fp.valor,
          fp.valor_pago,
          fp.vencimento,
          fp.pagamento_em,
          fp.status,
          fp.forma_cobranca,
          fp.asaas_charge_id,
          fp.asaas_invoice_url,
          fp.asaas_payload,
          (fp.asaas_charge_id IS NOT NULL AND fp.status <> 'cancelado') AS tem_cobranca_ativa,
          ft.descricao,
          ft.documento,
          ft.valor_total,
          ft.tenant_id,
          ft.contrato_id,
          ft.asaas_installment_id,
          EXISTS (
            SELECT 1
            FROM gestao.financeiro_parcela fpa
            WHERE fpa.titulo_id = ft.titulo_id
              AND fpa.asaas_charge_id IS NOT NULL
              AND fpa.status <> 'cancelado'
          ) AS carne_tem_cobranca_ativa,
          p.pessoa_id,
          p.nome_razao AS pessoa_nome,
          p.nome_fantasia AS pessoa_fantasia,
          p.cpf_cnpj AS pessoa_documento,
          t.tenant_nome
        FROM gestao.financeiro_parcela fp
        JOIN gestao.financeiro_titulo ft ON ft.titulo_id = fp.titulo_id
        LEFT JOIN gestao.pessoa p ON p.pessoa_id = ft.pessoa_id
        LEFT JOIN tenant t ON t.tenant_id = ft.tenant_id
        ${where}
        ORDER BY fp.vencimento ASC, fp.parcela_id DESC
        LIMIT $${values.length - 1}
        OFFSET $${values.length}
      `,
      values
    );

    if (syncAsaas) {
      await this.sincronizarStatusParcelasAsaas(
        client,
        rows.filter((row) => row.asaas_charge_id && row.status !== "quitado")
      );
    }

    const total = Number(countResult.rows[0]?.total || 0);

    return {
      data: syncAsaas ? await this.buscarParcelasPorIds(client, rows.map((row) => row.parcela_id)) : rows,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.max(Math.ceil(total / safeLimit), 1),
    };
  }

  static async buscarParcelaContexto(client, parcelaId) {
    const { rows } = await client.query(
      `
        SELECT
          fp.*,
          ft.descricao,
          ft.documento,
          ft.pessoa_id AS titulo_pessoa_id,
          ft.tenant_id,
          ft.contrato_id,
          p.pessoa_id AS pessoa_id,
          p.nome_razao AS pessoa_nome_razao,
          p.nome_fantasia AS pessoa_nome_fantasia,
          p.cpf_cnpj AS pessoa_cpf_cnpj,
          p.email AS pessoa_email,
          p.telefone AS pessoa_telefone,
          p.whatsapp AS pessoa_whatsapp,
          p.asaas_customer_id
        FROM gestao.financeiro_parcela fp
        JOIN gestao.financeiro_titulo ft ON ft.titulo_id = fp.titulo_id
        LEFT JOIN gestao.pessoa p ON p.pessoa_id = ft.pessoa_id
        WHERE fp.parcela_id = $1
          AND ft.excluido = FALSE
        LIMIT 1
      `,
      [parcelaId]
    );

    return rows[0] || null;
  }

  static async buscarParcelasPorIds(client, parcelaIds = []) {
    const ids = parcelaIds.map(Number).filter(Boolean);
    if (!ids.length) return [];

    const { rows } = await client.query(
      `
        SELECT
          fp.parcela_id,
          fp.titulo_id,
          fp.numero_parcela,
          fp.valor,
          fp.valor_pago,
          fp.vencimento,
          fp.pagamento_em,
          fp.status,
          fp.forma_cobranca,
          fp.asaas_charge_id,
          fp.asaas_invoice_url,
          fp.asaas_payload,
          (fp.asaas_charge_id IS NOT NULL AND fp.status <> 'cancelado') AS tem_cobranca_ativa,
          ft.descricao,
          ft.documento,
          ft.valor_total,
          ft.tenant_id,
          ft.contrato_id,
          ft.asaas_installment_id,
          EXISTS (
            SELECT 1
            FROM gestao.financeiro_parcela fpa
            WHERE fpa.titulo_id = ft.titulo_id
              AND fpa.asaas_charge_id IS NOT NULL
              AND fpa.status <> 'cancelado'
          ) AS carne_tem_cobranca_ativa,
          p.pessoa_id,
          p.nome_razao AS pessoa_nome,
          p.nome_fantasia AS pessoa_fantasia,
          p.cpf_cnpj AS pessoa_documento,
          t.tenant_nome
        FROM gestao.financeiro_parcela fp
        JOIN gestao.financeiro_titulo ft ON ft.titulo_id = fp.titulo_id
        LEFT JOIN gestao.pessoa p ON p.pessoa_id = ft.pessoa_id
        LEFT JOIN tenant t ON t.tenant_id = ft.tenant_id
        WHERE fp.parcela_id = ANY($1::int[])
        ORDER BY fp.vencimento ASC, fp.parcela_id DESC
      `,
      [ids]
    );

    const order = new Map(ids.map((id, index) => [id, index]));
    return rows.sort((a, b) => order.get(Number(a.parcela_id)) - order.get(Number(b.parcela_id)));
  }

  static async sincronizarStatusParcelasAsaas(client, parcelas = []) {
    if (!parcelas.length) return;

    const config = await this.buscarConfiguracaoAsaas(client);
    if (!config.ativo || !config.apiKey) return;

    const parcelasParaSincronizar = parcelas.slice(0, 20);

    for (const parcela of parcelasParaSincronizar) {
      try {
        const payment = await asaasRequest(config.apiKey, config.ambiente, {
          path: `/v3/payments/${parcela.asaas_charge_id}`,
        });
        await this.aplicarStatusPagamentoAsaas(client, parcela, payment);
      } catch (error) {
        console.error("[gestao:financeiro] Falha ao sincronizar cobrança Asaas:", {
          parcelaId: parcela.parcela_id,
          chargeId: parcela.asaas_charge_id,
          message: error.message,
        });
      }
    }
  }

  static async aplicarStatusPagamentoAsaas(client, parcela, payment) {
    const status = asaasPaidStatuses.has(payment.status)
      ? "quitado"
      : toAsaasDate(parcela.vencimento) < todayIsoDate()
      ? "vencido"
      : "aberto";
    const pagamentoEm = payment.paymentDate || payment.clientPaymentDate || payment.confirmedDate || null;

    await client.query(
      `
        UPDATE gestao.financeiro_parcela
        SET
          status = $2::varchar,
          valor_pago = CASE WHEN $2::text = 'quitado' THEN valor ELSE valor_pago END,
          pagamento_em = CASE WHEN $2::text = 'quitado' THEN COALESCE($3::date, CURRENT_DATE) ELSE pagamento_em END,
          asaas_payload = COALESCE(asaas_payload, '{}'::jsonb) || $4::jsonb
        WHERE parcela_id = $1
      `,
      [
        parcela.parcela_id,
        status,
        pagamentoEm,
        JSON.stringify({ statusCheck: payment, sincronizadoEm: new Date().toISOString() }),
      ]
    );

    await client.query(
      `
        UPDATE gestao.cliente_parcela
        SET
          status = CASE
            WHEN $3::text = 'quitado' THEN 'paga'
            WHEN $3::text = 'vencido' THEN 'vencida'
            ELSE status
          END,
          pago_em = CASE WHEN $3::text = 'quitado' THEN COALESCE($4::date, CURRENT_DATE) ELSE pago_em END,
          asaas_payload = COALESCE(asaas_payload, '{}'::jsonb) || $5::jsonb
        WHERE contrato_id = $1
          AND numero_parcela = $2
      `,
      [
        parcela.contrato_id,
        parcela.numero_parcela,
        status,
        pagamentoEm,
        JSON.stringify({ statusCheck: payment, sincronizadoEm: new Date().toISOString() }),
      ]
    );

    await this.atualizarStatusTitulo(client, parcela.titulo_id);

    return { payment, status };
  }

  static async buscarTituloContexto(client, tituloId) {
    const tituloResult = await client.query(
      `
        SELECT
          ft.*,
          p.pessoa_id AS pessoa_id,
          p.nome_razao AS pessoa_nome_razao,
          p.nome_fantasia AS pessoa_nome_fantasia,
          p.cpf_cnpj AS pessoa_cpf_cnpj,
          p.email AS pessoa_email,
          p.telefone AS pessoa_telefone,
          p.whatsapp AS pessoa_whatsapp,
          p.asaas_customer_id
        FROM gestao.financeiro_titulo ft
        LEFT JOIN gestao.pessoa p ON p.pessoa_id = ft.pessoa_id
        WHERE ft.titulo_id = $1
          AND ft.excluido = FALSE
        LIMIT 1
      `,
      [tituloId]
    );

    const titulo = tituloResult.rows[0] || null;
    if (!titulo) return null;

    const parcelasResult = await client.query(
      `
        SELECT *
        FROM gestao.financeiro_parcela
        WHERE titulo_id = $1
        ORDER BY numero_parcela ASC
      `,
      [tituloId]
    );

    return {
      titulo,
      parcelas: parcelasResult.rows,
    };
  }

  static async buscarConfiguracaoAsaas(client) {
    const config = await getConfigValue(client);
    const envApiKey = process.env.GESTAO_ASAAS_API_KEY || "";
    const apiKeyEncrypted = config.api_key_criptografada || null;
    const apiKey = apiKeyEncrypted ? decryptSecret(apiKeyEncrypted) : envApiKey;

    return {
      ativo: config.ativo === true || !!envApiKey,
      ambiente: config.ambiente || process.env.GESTAO_ASAAS_AMBIENTE || "sandbox",
      apiKey,
      apiKeyMasked:
        config.api_key_masked ||
        (envApiKey ? `${envApiKey.slice(0, 6)}...${envApiKey.slice(-4)}` : ""),
    };
  }

  static async salvarConfiguracaoAsaas(client, data, usuarioId) {
    const ambiente = data.ambiente === "production" ? "production" : "sandbox";
    const apiKey = normalizeText(data.api_key, 255);
    const current = await getConfigValue(client);
    const nextValue = {
      ...current,
      ativo: data.ativo === true,
      ambiente,
    };

    if (apiKey) {
      nextValue.api_key_criptografada = encryptSecret(apiKey);
      nextValue.api_key_masked = `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
    }

    await client.query(
      `
        INSERT INTO gestao.configuracao (chave, valor_json, descricao, atualizado_por)
        VALUES ('asaas_v12', $1::jsonb, 'Configuração da conta Asaas própria da Gestão V12.', $2)
        ON CONFLICT (chave) DO UPDATE
        SET
          valor_json = EXCLUDED.valor_json,
          atualizado_por = EXCLUDED.atualizado_por
      `,
      [JSON.stringify(nextValue), usuarioId || null]
    );

    return this.buscarConfiguracaoAsaas(client);
  }

  static async obterOuCriarClienteAsaas(client, config, parcela) {
    if (parcela.asaas_customer_id) return parcela.asaas_customer_id;

    const pessoaId = parcela.pessoa_id || parcela.titulo_pessoa_id;
    const documento = normalizeDigits(parcela.pessoa_cpf_cnpj);
    let customer = null;

    if (documento) {
      try {
        const search = await asaasRequest(config.apiKey, config.ambiente, {
          path: `/v3/customers?cpfCnpj=${documento}`,
        });
        customer = search?.data?.[0] || null;
      } catch {}
    }

    if (!customer?.id) {
      customer = await asaasRequest(config.apiKey, config.ambiente, {
        method: "POST",
        path: "/v3/customers",
        body: buildCustomerPayload({
          pessoa_id: pessoaId,
          pessoa_nome_razao: parcela.pessoa_nome_razao,
          pessoa_cpf_cnpj: parcela.pessoa_cpf_cnpj,
          pessoa_email: parcela.pessoa_email,
          pessoa_telefone: parcela.pessoa_telefone,
          pessoa_whatsapp: parcela.pessoa_whatsapp,
        }),
      });
    }

    await client.query(
      `
        UPDATE gestao.pessoa
        SET asaas_customer_id = $2
        WHERE pessoa_id = $1
      `,
      [pessoaId, customer.id]
    );

    return customer.id;
  }

  static async gerarCobranca(client, parcelaId, { tipo = "boleto", forceNew = false } = {}) {
    const parcela = await this.buscarParcelaContexto(client, parcelaId);
    if (!parcela) throw new Error("Parcela não encontrada.");
    if (parcela.status === "quitado") throw new Error("Parcela já quitada.");

    const billingType = tipo === "pix" ? "PIX" : "BOLETO";
    const config = await this.buscarConfiguracaoAsaas(client);
    if (!config.ativo || !config.apiKey) {
      throw new Error("Configuração Asaas da Gestão V12 não está ativa.");
    }

    if (parcela.asaas_charge_id && parcela.asaas_invoice_url && !forceNew) {
      return {
        reused: true,
        parcela,
        charge: parcela.asaas_payload || {},
        invoiceUrl: parcela.asaas_invoice_url,
      };
    }

    const customerId = await this.obterOuCriarClienteAsaas(client, config, parcela);
    const paymentResponse = await asaasRequest(config.apiKey, config.ambiente, {
      method: "POST",
      path: "/v3/payments",
      body: buildPaymentPayload({
        customerId,
        parcela,
        titulo: {
          titulo_id: parcela.titulo_id,
          descricao: parcela.descricao,
        },
        billingType,
      }),
    });

    let pixResponse = null;
    let boletoResponse = null;

    if (billingType === "PIX") {
      pixResponse = await asaasRequest(config.apiKey, config.ambiente, {
        path: `/v3/payments/${paymentResponse.id}/pixQrCode`,
      });
    }

    if (billingType === "BOLETO") {
      try {
        boletoResponse = await asaasRequest(config.apiKey, config.ambiente, {
          path: `/v3/payments/${paymentResponse.id}/identificationField`,
        });
      } catch {}
    }

    const payload = {
      billingType,
      payment: paymentResponse,
      pix: pixResponse,
      boleto: boletoResponse,
    };

    await client.query(
      `
        UPDATE gestao.financeiro_parcela
        SET
          forma_cobranca = $2,
          asaas_charge_id = $3,
          asaas_invoice_url = $4,
          asaas_payload = $5::jsonb,
          status = CASE WHEN status = 'vencido' AND vencimento >= CURRENT_DATE THEN 'aberto' ELSE status END
        WHERE parcela_id = $1
      `,
      [
        parcelaId,
        tipo === "pix" ? "pix" : "boleto",
        paymentResponse.id,
        paymentResponse.bankSlipUrl || paymentResponse.invoiceUrl || "",
        JSON.stringify(payload),
      ]
    );

    await client.query(
      `
        UPDATE gestao.cliente_parcela
        SET
          forma_cobranca = $3,
          status = 'gerada',
          asaas_charge_id = $4,
          asaas_invoice_url = $5,
          asaas_payload = $6::jsonb
        WHERE contrato_id = $1
          AND numero_parcela = $2
      `,
      [
        parcela.contrato_id,
        parcela.numero_parcela,
        tipo === "pix" ? "pix" : "boleto",
        paymentResponse.id,
        paymentResponse.bankSlipUrl || paymentResponse.invoiceUrl || "",
        JSON.stringify(payload),
      ]
    );

    return {
      reused: false,
      parcela,
      charge: payload,
      invoiceUrl: paymentResponse.bankSlipUrl || paymentResponse.invoiceUrl || "",
    };
  }

  static async gerarCarneTitulo(client, tituloId) {
    const contexto = await this.buscarTituloContexto(client, tituloId);
    if (!contexto) throw new Error("Título financeiro não encontrado.");

    const { titulo, parcelas } = contexto;
    const parcelasOrdenadas = [...parcelas].sort(
      (a, b) => Number(a.numero_parcela) - Number(b.numero_parcela)
    );
    const parcelasNaoElegiveis = parcelasOrdenadas.filter((parcela) =>
      ["quitado", "cancelado"].includes(parcela.status)
    );
    const parcelasVencidas = parcelasOrdenadas.filter(
      (parcela) => toAsaasDate(parcela.vencimento) < todayIsoDate()
    );

    if (!parcelasOrdenadas.length) {
      throw new Error("Título não possui parcelas abertas para gerar carnê.");
    }

    if (parcelasOrdenadas.length < 2) {
      throw new Error("Carnê no Asaas exige duas ou mais parcelas. Para parcela única, gere o boleto individual.");
    }

    if (parcelasNaoElegiveis.length) {
      throw new Error(
        "Carnê deve ser gerado com todas as parcelas do título. Este título já possui parcela quitada ou cancelada; use boleto individual para as parcelas pendentes."
      );
    }

    if (parcelasVencidas.length) {
      const numeros = parcelasVencidas.map((parcela) => parcela.numero_parcela).join(", ");
      throw new Error(
        `Carnê não pode ser gerado com parcelas vencidas. Atualize o vencimento das parcelas ${numeros} antes de gerar o carnê.`
      );
    }

    if (titulo.asaas_installment_id) {
      return {
        reused: true,
        installmentId: titulo.asaas_installment_id,
      };
    }

    if (parcelas.some((parcela) => parcela.asaas_charge_id)) {
      throw new Error(
        "Este título já possui cobranças individuais. Cancele ou trate essas cobranças antes de gerar um carnê único."
      );
    }

    const config = await this.buscarConfiguracaoAsaas(client);
    if (!config.ativo || !config.apiKey) {
      throw new Error("Configuração Asaas da Gestão V12 não está ativa.");
    }

    const customerId = await this.obterOuCriarClienteAsaas(client, config, {
      pessoa_id: titulo.pessoa_id,
      titulo_pessoa_id: titulo.pessoa_id,
      pessoa_nome_razao: titulo.pessoa_nome_razao,
      pessoa_cpf_cnpj: titulo.pessoa_cpf_cnpj,
      pessoa_email: titulo.pessoa_email,
      pessoa_telefone: titulo.pessoa_telefone,
      pessoa_whatsapp: titulo.pessoa_whatsapp,
      asaas_customer_id: titulo.asaas_customer_id,
    });

    const installmentPayload = buildInstallmentPayload({
      customerId,
      parcelas: parcelasOrdenadas,
      titulo,
    });

    console.log("[gestao:financeiro:carne] Gerando carnê Asaas", {
      tituloId,
      contratoId: titulo.contrato_id,
      parcelas: parcelasOrdenadas.length,
      primeiraParcela: parcelasOrdenadas[0]?.numero_parcela || null,
      ultimaParcela: parcelasOrdenadas.at(-1)?.numero_parcela || null,
      dueDate: installmentPayload.dueDate,
      installmentCount: installmentPayload.installmentCount,
      installmentValue: installmentPayload.installmentValue,
    });

    const paymentResponse = await asaasRequest(config.apiKey, config.ambiente, {
      method: "POST",
      path: "/v3/payments",
      body: installmentPayload,
    });

    const installmentId =
      paymentResponse.installment ||
      paymentResponse.installmentId ||
      paymentResponse.installment_id ||
      null;

    if (!installmentId) {
      throw new Error("O Asaas não retornou o identificador do carnê gerado.");
    }

    const paymentsByInstallmentEndpoint = await listarPagamentosParcelamentoAsaas(
      config.apiKey,
      config.ambiente,
      installmentId
    );
    const paymentsByPaymentEndpoint = await listarPagamentosPorInstallmentAsaas(
      config.apiKey,
      config.ambiente,
      installmentId
    );
    const payments = mergeAsaasPayments(
      [paymentResponse],
      paymentsByInstallmentEndpoint,
      paymentsByPaymentEndpoint
    );

    console.log("[gestao:financeiro:carne] Parcelas retornadas pelo Asaas", {
      tituloId,
      installmentId,
      esperado: parcelasOrdenadas.length,
      retornado: payments.length,
      endpointParcelamento: paymentsByInstallmentEndpoint.length,
      endpointPagamentos: paymentsByPaymentEndpoint.length,
      numeros: payments.map((payment) => payment.installmentNumber || null),
      vencimentos: payments.map((payment) => payment.dueDate || null),
    });

    if (payments.length < parcelasOrdenadas.length) {
      throw new Error(
        `O Asaas retornou ${payments.length} de ${parcelasOrdenadas.length} parcelas do carnê gerado. Confira o parcelamento no Asaas antes de tentar novamente.`
      );
    }

    const paymentsByDueDate = new Map(
      payments.map((payment) => [String(payment.dueDate || "").slice(0, 10), payment])
    );

    for (const parcela of parcelasOrdenadas) {
      const dueDate = toAsaasDate(parcela.vencimento);
      const payment =
        paymentsByDueDate.get(dueDate) || payments[Number(parcela.numero_parcela || 1) - 1];

      if (!payment?.id) {
        throw new Error(`Não foi possível vincular a parcela ${parcela.numero_parcela} ao carnê.`);
      }

      const boletoResponse =
        payment.billingType === "BOLETO"
          ? await asaasRequest(config.apiKey, config.ambiente, {
              path: `/v3/payments/${payment.id}/identificationField`,
            }).catch(() => null)
          : null;

      const payload = {
        billingType: "BOLETO",
        installmentId,
        payment,
        boleto: boletoResponse,
      };

      await client.query(
        `
          UPDATE gestao.financeiro_parcela
          SET
            forma_cobranca = 'boleto',
            asaas_charge_id = $2,
            asaas_invoice_url = $3,
            asaas_payload = $4::jsonb,
            status = CASE WHEN status = 'vencido' AND vencimento >= CURRENT_DATE THEN 'aberto' ELSE status END
          WHERE parcela_id = $1
        `,
        [
          parcela.parcela_id,
          payment.id,
          payment.bankSlipUrl || payment.invoiceUrl || "",
          JSON.stringify(payload),
        ]
      );

      await client.query(
        `
          UPDATE gestao.cliente_parcela
          SET
            forma_cobranca = 'boleto',
            status = 'gerada',
            asaas_charge_id = $3,
            asaas_invoice_url = $4,
            asaas_payload = $5::jsonb
          WHERE contrato_id = $1
            AND numero_parcela = $2
        `,
        [
          titulo.contrato_id,
          parcela.numero_parcela,
          payment.id,
          payment.bankSlipUrl || payment.invoiceUrl || "",
          JSON.stringify(payload),
        ]
      );
    }

    await client.query(
      `
        UPDATE gestao.financeiro_titulo
        SET asaas_installment_id = $2
        WHERE titulo_id = $1
      `,
      [tituloId, installmentId]
    );

    return {
      reused: false,
      installmentId,
      payment: paymentResponse,
      payments,
    };
  }

  static async baixarCarneTitulo(client, tituloId) {
    const contexto = await this.buscarTituloContexto(client, tituloId);
    if (!contexto) throw new Error("Título financeiro não encontrado.");

    const installmentId = contexto.titulo.asaas_installment_id;
    if (!installmentId) throw new Error("Título ainda não possui carnê gerado no Asaas.");

    const config = await this.buscarConfiguracaoAsaas(client);
    if (!config.ativo || !config.apiKey) {
      throw new Error("Configuração Asaas da Gestão V12 não está ativa.");
    }

    return asaasPdfRequest(config.apiKey, config.ambiente, {
      path: `/v3/installments/${encodeURIComponent(installmentId)}/paymentBook`,
    });
  }

  static async cancelarCarneTitulo(client, tituloId) {
    const contexto = await this.buscarTituloContexto(client, tituloId);
    if (!contexto) throw new Error("Título financeiro não encontrado.");

    const { titulo, parcelas } = contexto;
    const installmentId = titulo.asaas_installment_id;
    if (!installmentId) throw new Error("Título ainda não possui carnê gerado no Asaas.");

    const parcelasEmAberto = parcelas.filter(
      (parcela) => parcela.status !== "quitado" && Number(parcela.valor_pago || 0) <= 0
    );

    if (!parcelasEmAberto.length) {
      throw new Error("Não há parcelas em aberto para cancelar neste carnê.");
    }

    const config = await this.buscarConfiguracaoAsaas(client);
    if (!config.ativo || !config.apiKey) {
      throw new Error("Configuração Asaas da Gestão V12 não está ativa.");
    }

    const cancelamentoResponse = await asaasRequest(config.apiKey, config.ambiente, {
      method: "DELETE",
      path: `/v3/installments/${encodeURIComponent(installmentId)}/payments`,
    });

    const cancelamentoPayload = {
      carneCancelado: {
        installmentId,
        response: cancelamentoResponse,
        canceladoEm: new Date().toISOString(),
      },
    };

    await client.query(
      `
        UPDATE gestao.financeiro_parcela
        SET
          asaas_charge_id = NULL,
          asaas_invoice_url = NULL,
          asaas_payload = COALESCE(asaas_payload, '{}'::jsonb) || $2::jsonb,
          status = CASE WHEN status = 'vencido' AND vencimento >= CURRENT_DATE THEN 'aberto' ELSE status END
        WHERE titulo_id = $1
          AND status <> 'quitado'
          AND valor_pago <= 0
      `,
      [tituloId, JSON.stringify(cancelamentoPayload)]
    );

    await client.query(
      `
        UPDATE gestao.cliente_parcela
        SET
          status = CASE WHEN status IN ('gerada', 'vencida') THEN 'aberta' ELSE status END,
          asaas_charge_id = NULL,
          asaas_invoice_url = NULL,
          asaas_payload = COALESCE(asaas_payload, '{}'::jsonb) || $3::jsonb
        WHERE contrato_id = $1
          AND numero_parcela = ANY($2::int[])
          AND status <> 'paga'
      `,
      [
        titulo.contrato_id,
        parcelasEmAberto.map((parcela) => Number(parcela.numero_parcela)),
        JSON.stringify(cancelamentoPayload),
      ]
    );

    if (parcelasEmAberto.length === parcelas.length) {
      await client.query(
        `
          UPDATE gestao.financeiro_titulo
          SET asaas_installment_id = NULL
          WHERE titulo_id = $1
        `,
        [tituloId]
      );
    }

    await this.atualizarStatusTitulo(client, tituloId);

    return {
      installmentId,
      parcelasCanceladas: parcelasEmAberto.length,
      cancelamento: cancelamentoResponse,
    };
  }

  static async cancelarCobrancaParcela(client, parcelaId) {
    const parcela = await this.buscarParcelaContexto(client, parcelaId);
    if (!parcela) throw new Error("Parcela não encontrada.");
    if (!parcela.asaas_charge_id) throw new Error("Parcela ainda não possui cobrança Asaas.");
    if (parcela.status === "quitado" || Number(parcela.valor_pago || 0) > 0) {
      throw new Error("Não é possível cancelar uma parcela já baixada ou paga.");
    }

    const config = await this.buscarConfiguracaoAsaas(client);
    if (!config.ativo || !config.apiKey) {
      throw new Error("Configuração Asaas da Gestão V12 não está ativa.");
    }

    const payment = await asaasRequest(config.apiKey, config.ambiente, {
      path: `/v3/payments/${parcela.asaas_charge_id}`,
    });

    if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(payment.status)) {
      throw new Error("A cobrança já consta como paga no Asaas. Atualize o status antes de alterar.");
    }

    const cancelamentoResponse = await asaasRequest(config.apiKey, config.ambiente, {
      method: "DELETE",
      path: `/v3/payments/${encodeURIComponent(parcela.asaas_charge_id)}`,
    });

    const cancelamentoPayload = {
      cobrancaCancelada: {
        chargeId: parcela.asaas_charge_id,
        response: cancelamentoResponse,
        canceladoEm: new Date().toISOString(),
      },
    };

    await client.query(
      `
        UPDATE gestao.financeiro_parcela
        SET
          asaas_charge_id = NULL,
          asaas_invoice_url = NULL,
          asaas_payload = COALESCE(asaas_payload, '{}'::jsonb) || $2::jsonb,
          status = CASE WHEN status = 'vencido' AND vencimento >= CURRENT_DATE THEN 'aberto' ELSE status END
        WHERE parcela_id = $1
      `,
      [parcelaId, JSON.stringify(cancelamentoPayload)]
    );

    await client.query(
      `
        UPDATE gestao.cliente_parcela
        SET
          status = CASE WHEN status IN ('gerada', 'vencida') THEN 'aberta' ELSE status END,
          asaas_charge_id = NULL,
          asaas_invoice_url = NULL,
          asaas_payload = COALESCE(asaas_payload, '{}'::jsonb) || $4::jsonb
        WHERE contrato_id = $1
          AND numero_parcela = $2
          AND asaas_charge_id = $3
      `,
      [
        parcela.contrato_id,
        parcela.numero_parcela,
        parcela.asaas_charge_id,
        JSON.stringify(cancelamentoPayload),
      ]
    );

    await this.atualizarStatusTitulo(client, parcela.titulo_id);

    return {
      chargeId: parcela.asaas_charge_id,
      cancelamento: cancelamentoResponse,
    };
  }

  static async gerarCarneSaldoRestante(client, tituloId) {
    const contexto = await this.buscarTituloContexto(client, tituloId);
    if (!contexto) throw new Error("Título financeiro não encontrado.");

    const { titulo, parcelas } = contexto;
    const parcelasPendentes = parcelas
      .filter((parcela) => parcela.status !== "quitado" && Number(parcela.valor_pago || 0) <= 0)
      .sort((a, b) => Number(a.numero_parcela) - Number(b.numero_parcela));

    if (!parcelasPendentes.length) {
      throw new Error("Não há parcelas pendentes para gerar novo carnê.");
    }

    if (parcelasPendentes.some((parcela) => parcela.asaas_charge_id)) {
      throw new Error("Cancele as cobranças em aberto antes de gerar novo carnê do saldo restante.");
    }

    if (parcelasPendentes.length < 2) {
      throw new Error("Saldo restante possui apenas uma parcela. Gere boleto individual para essa parcela.");
    }

    const valorTotal = parcelasPendentes.reduce((sum, parcela) => sum + Number(parcela.valor || 0), 0);
    const origemPayload = {
      renegociacaoSaldo: {
        titulo_origem_id: titulo.titulo_id,
        parcelas_origem: parcelasPendentes.map((parcela) => ({
          parcela_id: parcela.parcela_id,
          numero_parcela: parcela.numero_parcela,
          valor: Number(parcela.valor || 0),
          vencimento: toAsaasDate(parcela.vencimento),
        })),
        criadoEm: new Date().toISOString(),
      },
    };

    const insertTitulo = await client.query(
      `
        INSERT INTO gestao.financeiro_titulo (
          pessoa_id,
          tenant_id,
          contrato_id,
          tipo,
          origem,
          descricao,
          documento,
          valor_total,
          data_emissao,
          status,
          observacao
        )
        VALUES (
          $1,
          $2,
          $3,
          'receber',
          'renegociacao_contrato_v12',
          $4,
          $5,
          $6,
          CURRENT_DATE,
          'aberto',
          $7
        )
        RETURNING titulo_id
      `,
      [
        titulo.pessoa_id,
        titulo.tenant_id,
        titulo.contrato_id,
        `${titulo.descricao} - saldo restante`,
        `${titulo.documento || `TITULO-${titulo.titulo_id}`}-SALDO`,
        valorTotal,
        `Saldo restante gerado a partir do título ${titulo.titulo_id}.`,
      ]
    );

    const novoTituloId = Number(insertTitulo.rows[0].titulo_id);

    for (const [index, parcela] of parcelasPendentes.entries()) {
      await client.query(
        `
          INSERT INTO gestao.financeiro_parcela (
            titulo_id,
            numero_parcela,
            valor,
            vencimento,
            status,
            forma_cobranca,
            asaas_payload
          )
          VALUES ($1, $2, $3, $4, 'aberto', 'boleto', $5::jsonb)
        `,
        [
          novoTituloId,
          index + 1,
          Number(parcela.valor || 0),
          toAsaasDate(parcela.vencimento),
          JSON.stringify(origemPayload),
        ]
      );
    }

    await client.query(
      `
        UPDATE gestao.financeiro_parcela
        SET
          status = 'cancelado',
          asaas_payload = COALESCE(asaas_payload, '{}'::jsonb) || $2::jsonb
        WHERE parcela_id = ANY($1::int[])
      `,
      [parcelasPendentes.map((parcela) => Number(parcela.parcela_id)), JSON.stringify(origemPayload)]
    );

    await this.atualizarStatusTitulo(client, titulo.titulo_id);
    const carne = await this.gerarCarneTitulo(client, novoTituloId);

    return {
      tituloOrigemId: titulo.titulo_id,
      novoTituloId,
      parcelas: parcelasPendentes.length,
      valorTotal,
      carne,
    };
  }

  static async atualizarStatusCobranca(client, parcelaId) {
    const parcela = await this.buscarParcelaContexto(client, parcelaId);
    if (!parcela) throw new Error("Parcela não encontrada.");
    if (!parcela.asaas_charge_id) throw new Error("Parcela ainda não possui cobrança Asaas.");

    const config = await this.buscarConfiguracaoAsaas(client);
    if (!config.ativo || !config.apiKey) {
      throw new Error("Configuração Asaas da Gestão V12 não está ativa.");
    }

    const payment = await asaasRequest(config.apiKey, config.ambiente, {
      path: `/v3/payments/${parcela.asaas_charge_id}`,
    });

    return this.aplicarStatusPagamentoAsaas(client, parcela, payment);
  }

  static async registrarBaixaManual(client, parcelaId, data = {}) {
    const parcela = await this.buscarParcelaContexto(client, parcelaId);
    if (!parcela) throw new Error("Parcela não encontrada.");

    const valorPago = parseMoney(data.valor_pago || parcela.valor, {
      required: true,
      label: "Valor pago",
    });
    const pagamentoEm = normalizeDate(data.pagamento_em || new Date().toISOString().slice(0, 10), {
      required: true,
      label: "Data de pagamento",
    });

    await client.query(
      `
        UPDATE gestao.financeiro_parcela
        SET
          valor_pago = $2,
          pagamento_em = $3,
          status = CASE WHEN $2 >= valor THEN 'quitado' ELSE 'parcial' END,
          asaas_payload = COALESCE(asaas_payload, '{}'::jsonb) || $4::jsonb
        WHERE parcela_id = $1
      `,
      [
        parcelaId,
        valorPago,
        pagamentoEm,
        JSON.stringify({
          baixaManual: {
            valor_pago: valorPago,
            pagamento_em: pagamentoEm,
            observacao: normalizeText(data.observacao, 500),
          },
        }),
      ]
    );

    await client.query(
      `
        UPDATE gestao.cliente_parcela
        SET
          status = CASE WHEN $3 >= valor THEN 'paga' ELSE status END,
          pago_em = $4,
          asaas_payload = COALESCE(asaas_payload, '{}'::jsonb) || $5::jsonb
        WHERE contrato_id = $1
          AND numero_parcela = $2
      `,
      [
        parcela.contrato_id,
        parcela.numero_parcela,
        valorPago,
        pagamentoEm,
        JSON.stringify({
          baixaManual: {
            valor_pago: valorPago,
            pagamento_em: pagamentoEm,
            observacao: normalizeText(data.observacao, 500),
          },
        }),
      ]
    );

    await this.atualizarStatusTitulo(client, parcela.titulo_id);
  }

  static async atualizarStatusTitulo(client, tituloId) {
    const { rows } = await client.query(
      `
        SELECT
          COUNT(*)::INTEGER AS total,
          COUNT(*) FILTER (WHERE status = 'quitado')::INTEGER AS quitadas,
          COUNT(*) FILTER (WHERE status = 'cancelado')::INTEGER AS canceladas,
          COUNT(*) FILTER (WHERE status = 'vencido')::INTEGER AS vencidas
        FROM gestao.financeiro_parcela
        WHERE titulo_id = $1
      `,
      [tituloId]
    );

    const row = rows[0] || {};
    const total = Number(row.total || 0);
    const quitadas = Number(row.quitadas || 0);
    const canceladas = Number(row.canceladas || 0);
    const vencidas = Number(row.vencidas || 0);
    const status =
      total > 0 && quitadas === total
        ? "quitado"
        : total > 0 && canceladas === total
        ? "cancelado"
        : vencidas > 0
        ? "vencido"
        : quitadas > 0
        ? "parcial"
        : "aberto";

    await client.query(
      `
        UPDATE gestao.financeiro_titulo
        SET status = $2
        WHERE titulo_id = $1
      `,
      [tituloId, status]
    );
  }
}

export default GestaoFinanceiroDAO;
