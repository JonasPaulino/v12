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
  dueDate: String(parcela.vencimento).slice(0, 10),
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
    dueDate: String(first.vencimento).slice(0, 10),
    description: titulo.descricao,
    externalReference: `v12-gestao:t${titulo.titulo_id}:carne:${Date.now()}`,
  };
};

class GestaoFinanceiroDAO {
  static async listarParcelas(client, { page = 1, limit = 20, search = "", status = "" } = {}) {
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
          ft.descricao,
          ft.documento,
          ft.valor_total,
          ft.tenant_id,
          ft.contrato_id,
          ft.asaas_installment_id,
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

    const total = Number(countResult.rows[0]?.total || 0);

    return {
      data: rows,
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
    const cobraveis = parcelas.filter((parcela) => !["quitado", "cancelado"].includes(parcela.status));

    if (!cobraveis.length) {
      throw new Error("Título não possui parcelas abertas para gerar carnê.");
    }

    if (cobraveis.length < 2) {
      throw new Error("Carnê no Asaas exige duas ou mais parcelas. Para parcela única, gere o boleto individual.");
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

    const paymentResponse = await asaasRequest(config.apiKey, config.ambiente, {
      method: "POST",
      path: "/v3/payments",
      body: buildInstallmentPayload({
        customerId,
        parcelas: cobraveis,
        titulo,
      }),
    });

    const installmentId =
      paymentResponse.installment ||
      paymentResponse.installmentId ||
      paymentResponse.installment_id ||
      null;

    if (!installmentId) {
      throw new Error("O Asaas não retornou o identificador do carnê gerado.");
    }

    const paymentsResult = await asaasRequest(config.apiKey, config.ambiente, {
      path: `/v3/installments/${encodeURIComponent(installmentId)}/payments`,
    });
    const payments = Array.isArray(paymentsResult?.data) ? paymentsResult.data : [];

    if (payments.length < cobraveis.length) {
      throw new Error("O Asaas não retornou todas as parcelas do carnê gerado.");
    }

    const paymentsByDueDate = new Map(
      payments.map((payment) => [String(payment.dueDate || "").slice(0, 10), payment])
    );

    for (const parcela of cobraveis) {
      const dueDate = String(parcela.vencimento).slice(0, 10);
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

    const status = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(payment.status)
      ? "quitado"
      : String(parcela.vencimento).slice(0, 10) < new Date().toISOString().slice(0, 10)
      ? "vencido"
      : "aberto";

    await client.query(
      `
        UPDATE gestao.financeiro_parcela
        SET
          status = $2,
          valor_pago = CASE WHEN $2 = 'quitado' THEN valor ELSE valor_pago END,
          pagamento_em = CASE WHEN $2 = 'quitado' THEN COALESCE($3::date, CURRENT_DATE) ELSE pagamento_em END,
          asaas_payload = COALESCE(asaas_payload, '{}'::jsonb) || $4::jsonb
        WHERE parcela_id = $1
      `,
      [
        parcelaId,
        status,
        payment.paymentDate || payment.clientPaymentDate || payment.confirmedDate || null,
        JSON.stringify({ statusCheck: payment }),
      ]
    );

    await client.query(
      `
        UPDATE gestao.cliente_parcela
        SET
          status = CASE
            WHEN $3 = 'quitado' THEN 'paga'
            WHEN $3 = 'vencido' THEN 'vencida'
            ELSE status
          END,
          pago_em = CASE WHEN $3 = 'quitado' THEN COALESCE($4::date, CURRENT_DATE) ELSE pago_em END,
          asaas_payload = COALESCE(asaas_payload, '{}'::jsonb) || $5::jsonb
        WHERE contrato_id = $1
          AND numero_parcela = $2
      `,
      [
        parcela.contrato_id,
        parcela.numero_parcela,
        status,
        payment.paymentDate || payment.clientPaymentDate || payment.confirmedDate || null,
        JSON.stringify({ statusCheck: payment }),
      ]
    );

    await this.atualizarStatusTitulo(client, parcela.titulo_id);

    return { payment, status };
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
