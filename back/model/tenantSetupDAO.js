import crypto from "crypto";
import { hashPassword } from "../utils/password.js";
import { previewCertificate } from "../utils/certificatePreview.js";

const normalizeText = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    if (required) throw new Error(`${label} obrigatório.`);
    return null;
  }

  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const normalizeDigits = (value, maxLength, { required = false, label = "Campo" } = {}) => {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (!digits) {
    if (required) throw new Error(`${label} obrigatório.`);
    return null;
  }

  return maxLength ? digits.slice(0, maxLength) : digits;
};

const parseInteger = (value, { required = false, min = 1, label = "Campo" } = {}) => {
  if (value === undefined || value === null || value === "") {
    if (required) throw new Error(`${label} obrigatório.`);
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < min) {
    throw new Error(`${label} inválido.`);
  }

  return parsed;
};

const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

const buildUniqueTenantSlug = async (client, baseValue) => {
  const baseSlug = slugify(baseValue) || `filial-${Date.now()}`;
  let currentSlug = baseSlug;
  let suffix = 1;

  while (true) {
    const { rows } = await client.query(
      `
        SELECT 1
        FROM tenant
        WHERE tenant_slug = $1
        LIMIT 1
      `,
      [currentSlug]
    );

    if (!rows[0]) return currentSlug;

    suffix += 1;
    currentSlug = `${baseSlug.slice(0, 64)}-${suffix}`;
  }
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

const seedCondicoesPagamento = async (client, tenantId) => {
  await client.query(
    `
      INSERT INTO financeiro_condicao_pagamento (
        tenant_id,
        descricao,
        tipo,
        quantidade_parcelas,
        dias_primeiro_vencimento,
        intervalo_dias,
        percentual_entrada,
        gera_boleto,
        ativo,
        padrao
      )
      VALUES
        ($1, 'A vista', 'receber', 1, 0, 30, 0, FALSE, TRUE, TRUE),
        ($1, '30 dias', 'receber', 1, 30, 30, 0, FALSE, TRUE, FALSE),
        ($1, '2x 30/60', 'receber', 2, 30, 30, 0, FALSE, TRUE, FALSE),
        ($1, '3x 30/60/90', 'receber', 3, 30, 30, 0, FALSE, TRUE, FALSE),
        ($1, 'Boleto à vista', 'receber', 1, 0, 30, 0, TRUE, TRUE, FALSE),
        ($1, 'Boleto 30 dias', 'receber', 1, 30, 30, 0, TRUE, TRUE, FALSE),
        ($1, 'Boleto 2x 30/60', 'receber', 2, 30, 30, 0, TRUE, TRUE, FALSE),
        ($1, 'Boleto 3x 30/60/90', 'receber', 3, 30, 30, 0, TRUE, TRUE, FALSE),
        ($1, 'A vista fornecedor', 'pagar', 1, 0, 30, 0, FALSE, TRUE, FALSE)
    `,
    [tenantId]
  );
};

const seedFormasPagamento = async (client, tenantId) => {
  await client.query(
    `
      INSERT INTO financeiro_forma_pagamento (
        tenant_id,
        descricao,
        tipo,
        ativo,
        padrao,
        ordem
      )
      VALUES
        ($1, 'Dinheiro', 'ambos', TRUE, TRUE, 1),
        ($1, 'Pix', 'ambos', TRUE, FALSE, 2),
        ($1, 'Cartao de debito', 'receber', TRUE, FALSE, 3),
        ($1, 'Cartao de credito', 'receber', TRUE, FALSE, 4),
        ($1, 'Transferencia', 'ambos', TRUE, FALSE, 5)
    `,
    [tenantId]
  );
};

class TenantSetupDAO {
  static normalizarPayload(payload = {}) {
    const empresa = payload.empresa || {};
    const usuario = payload.usuario || {};
    const certificado = payload.certificado || {};
    const fiscal = payload.fiscal || {};

    const tenantNome = normalizeText(empresa.tenant_nome, 150, {
      required: true,
      label: "Nome da filial",
    });
    const documento = normalizeDigits(empresa.cnpj, 14, {
      required: true,
      label: "CNPJ",
    });
    const razaoSocial = normalizeText(empresa.nome_razao, 180, {
      required: true,
      label: "Razão social",
    });

    const senha = normalizeText(usuario.password, 120, {
      required: true,
      label: "Senha do usuário",
    });

    if (senha.length < 6) {
      throw new Error("A senha do usuário precisa ter pelo menos 6 caracteres.");
    }

    return {
      empresa: {
        tenant_nome: tenantNome,
        nome_razao: razaoSocial,
        nome_fantasia: normalizeText(empresa.nome_fantasia, 180),
        cnpj: documento,
        inscricao_estadual: normalizeText(empresa.inscricao_estadual, 20),
        inscricao_municipal: normalizeText(empresa.inscricao_municipal, 20),
        email: normalizeText(empresa.email, 150),
        telefone: normalizeText(empresa.telefone, 20),
        cep: normalizeText(empresa.cep, 9),
        logradouro: normalizeText(empresa.logradouro, 180),
        numero: normalizeText(empresa.numero, 20),
        complemento: normalizeText(empresa.complemento, 120),
        bairro: normalizeText(empresa.bairro, 100),
        cidade: normalizeText(empresa.cidade, 100),
        uf: normalizeText(empresa.uf, 2),
        codigo_ibge: normalizeText(empresa.codigo_ibge, 10),
        pais: normalizeText(empresa.pais, 60) || "Brasil",
      },
      usuario: {
        nome: normalizeText(usuario.nome, 150, {
          required: true,
          label: "Nome do usuário admin",
        }),
        email: normalizeText(usuario.email, 150, {
          required: true,
          label: "E-mail do usuário admin",
        }),
        username: normalizeText(usuario.username, 80, {
          required: true,
          label: "Login do usuário admin",
        }),
        password: senha,
      },
      certificado: {
        nome_arquivo: normalizeText(certificado.nome_arquivo, 180, {
          required: true,
          label: "Arquivo do certificado",
        }),
        senha: normalizeText(certificado.senha, 180, {
          required: true,
          label: "Senha do certificado",
        }),
        conteudo_base64: normalizeText(certificado.conteudo_base64, null, {
          required: true,
          label: "Conteúdo do certificado",
        }),
      },
      fiscal: {
        ambiente_nfe: normalizeText(fiscal.ambiente_nfe, 1) || "2",
        crt: normalizeText(fiscal.crt, 1) || "1",
        serie_nfe_padrao: parseInteger(fiscal.serie_nfe_padrao ?? 1, {
          required: true,
          label: "Série padrão",
        }),
        proximo_numero_nfe: parseInteger(fiscal.proximo_numero_nfe ?? 1, {
          required: true,
          label: "Próximo número da NF-e",
        }),
        cnae: normalizeText(fiscal.cnae, 7),
        natureza_operacao_padrao:
          normalizeText(fiscal.natureza_operacao_padrao, 120) || "Venda de mercadoria",
      },
    };
  }

  static async validarDuplicidades(client, data) {
    const checks = await Promise.all([
      client.query(
        `
          SELECT tenant_id
          FROM tenant
          WHERE REGEXP_REPLACE(COALESCE(tenant_documento, ''), '\\D', '', 'g') = $1
          LIMIT 1
        `,
        [data.empresa.cnpj]
      ),
      client.query(
        `
          SELECT pessoa_id
          FROM pessoa
          WHERE REGEXP_REPLACE(COALESCE(pessoa_cpf_cnpj, ''), '\\D', '', 'g') = $1
            AND pessoa_excluido = FALSE
          LIMIT 1
        `,
        [data.empresa.cnpj]
      ),
      client.query(
        `
          SELECT usuario_id
          FROM usuario
          WHERE usuario_excluido = FALSE
            AND (
              UPPER(usuario_email) = UPPER($1)
              OR UPPER(usuario_username) = UPPER($2)
            )
          LIMIT 1
        `,
        [data.usuario.email, data.usuario.username]
      ),
    ]);

    if (checks[0].rows[0]) {
      throw new Error("Já existe uma filial cadastrada com este CNPJ.");
    }

    if (checks[1].rows[0]) {
      throw new Error("Já existe uma pessoa cadastrada com este CNPJ.");
    }

    if (checks[2].rows[0]) {
      throw new Error("O e-mail ou login do usuário admin já está em uso.");
    }
  }

  static async criarFilial(client, payload, usuarioCriadorId = null) {
    const data = this.normalizarPayload(payload);
    await this.validarDuplicidades(client, data);

    const tenantSlug = await buildUniqueTenantSlug(
      client,
      data.empresa.nome_fantasia || data.empresa.nome_razao || data.empresa.tenant_nome
    );

      const certificadoBuffer = Buffer.from(data.certificado.conteudo_base64, "base64");
      if (!certificadoBuffer.length) {
        throw new Error("Conteúdo do certificado inválido.");
      }

      const certificadoPreview = await previewCertificate({
        certificadoBase64: data.certificado.conteudo_base64,
        certificadoSenha: data.certificado.senha,
        scopeKey: `tenant-create-${Date.now()}`,
      });

    await client.query("BEGIN");

    try {
      const pessoaResult = await client.query(
        `
          INSERT INTO pessoa (
            pessoa_tipo,
            pessoa_nome_razao,
            pessoa_nome_fantasia,
            pessoa_cpf_cnpj,
            pessoa_inscricao_estadual,
            pessoa_inscricao_municipal,
            pessoa_email,
            pessoa_telefone,
            pessoa_ativo,
            pessoa_excluido
          )
          VALUES ('J', $1, $2, $3, $4, $5, $6, $7, TRUE, FALSE)
          RETURNING pessoa_id
        `,
        [
          data.empresa.nome_razao,
          data.empresa.nome_fantasia,
          data.empresa.cnpj,
          data.empresa.inscricao_estadual,
          data.empresa.inscricao_municipal,
          data.empresa.email,
          data.empresa.telefone,
        ]
      );

      const pessoaId = Number(pessoaResult.rows[0].pessoa_id);

      const tenantResult = await client.query(
        `
          INSERT INTO tenant (
            tenant_nome,
            tenant_slug,
            tenant_documento,
            tenant_ativo,
            pessoa_id
          )
          VALUES ($1, $2, $3, TRUE, $4)
          RETURNING tenant_id
        `,
        [data.empresa.tenant_nome, tenantSlug, data.empresa.cnpj, pessoaId]
      );

      const tenantId = Number(tenantResult.rows[0].tenant_id);

      await client.query(
        `
          INSERT INTO pessoa_tenant (pessoa_id, tenant_id, principal, ativo)
          VALUES ($1, $2, TRUE, TRUE)
        `,
        [pessoaId, tenantId]
      );

      await client.query(
        `
          INSERT INTO pessoa_endereco (
            pessoa_id,
            tenant_id,
            endereco_tipo,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            uf,
            codigo_ibge,
            pais
          )
          VALUES (
            $1,
            $2,
            'principal',
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            $11
          )
        `,
        [
          pessoaId,
          tenantId,
          data.empresa.cep,
          data.empresa.logradouro,
          data.empresa.numero,
          data.empresa.complemento,
          data.empresa.bairro,
          data.empresa.cidade,
          data.empresa.uf,
          data.empresa.codigo_ibge,
          data.empresa.pais,
        ]
      );

      const usuarioResult = await client.query(
        `
          INSERT INTO usuario (
            tenant_id_default,
            pessoa_id,
            usuario_nome,
            usuario_email,
            usuario_username,
            usuario_senha,
            usuario_ativo,
            usuario_primeiro_login,
            usuario_excluido,
            usuario_master
          )
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, FALSE, FALSE, FALSE)
          RETURNING usuario_id
        `,
        [
          tenantId,
          null,
          data.usuario.nome,
          data.usuario.email,
          data.usuario.username,
          hashPassword(data.usuario.password),
        ]
      );

      const usuarioId = Number(usuarioResult.rows[0].usuario_id);

      await client.query(
        `
          INSERT INTO usuario_tenant (
            tenant_id,
            usuario_id,
            perfil,
            ativo,
            ultimo_acesso_em
          )
          VALUES ($1, $2, 'admin', TRUE, NOW())
        `,
        [tenantId, usuarioId]
      );

      if (usuarioCriadorId) {
        await client.query(
          `
            INSERT INTO usuario_tenant (
              tenant_id,
              usuario_id,
              perfil,
              ativo,
              ultimo_acesso_em
            )
            VALUES ($1, $2, 'admin', TRUE, NOW())
            ON CONFLICT (tenant_id, usuario_id) DO UPDATE
            SET
              perfil = EXCLUDED.perfil,
              ativo = TRUE
          `,
          [tenantId, usuarioCriadorId]
        );
      }

      await client.query(
        `
          INSERT INTO tenant_configuracao_fiscal (
            tenant_id,
            ambiente_nfe,
            serie_nfe_padrao,
            proximo_numero_nfe,
            crt,
            cnae,
            natureza_operacao_padrao,
            nfe_habilitada
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
        `,
        [
          tenantId,
          data.fiscal.ambiente_nfe,
          data.fiscal.serie_nfe_padrao,
          data.fiscal.proximo_numero_nfe,
          data.fiscal.crt,
          data.fiscal.cnae,
          data.fiscal.natureza_operacao_padrao,
        ]
      );

      await client.query(
        `
          INSERT INTO tenant_certificado_a1 (
            tenant_id,
            nome_arquivo,
            conteudo_pfx,
            senha_criptografada,
            tamanho_arquivo,
            validade_em,
            importado_em
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `,
        [
          tenantId,
          data.certificado.nome_arquivo,
          certificadoBuffer,
          encryptSecret(data.certificado.senha),
          certificadoBuffer.length,
          certificadoPreview.validade_em,
        ]
      );

      await client.query(
        `
          INSERT INTO tabela_preco (tenant_id, nome, padrao, ativo, excluido)
          VALUES ($1, 'Tabela Padrão', TRUE, TRUE, FALSE)
        `,
        [tenantId]
      );

      await client.query(
        `
          INSERT INTO deposito (tenant_id, nome, padrao, ativo, excluido)
          VALUES ($1, 'Depósito Padrão', TRUE, TRUE, FALSE)
        `,
        [tenantId]
      );

      await seedCondicoesPagamento(client, tenantId);
      await seedFormasPagamento(client, tenantId);

      await client.query(
        `
          INSERT INTO payments.tenant_configuracao_gateway (
            tenant_id,
            provider,
            ambiente,
            gateway_ativo,
            auto_criar_cliente,
            baixa_automatica_pix,
            baixa_automatica_boleto
          )
          VALUES ($1, 'asaas', 'sandbox', FALSE, TRUE, TRUE, TRUE)
        `,
        [tenantId]
      );

      await client.query(
        `
          INSERT INTO message.tenant_configuracao_whatsapp (
            tenant_id,
            provider,
            whatsapp_ativo,
            auto_enviar_boleto_venda,
            auto_enviar_pix_venda,
            mensagem_boleto_padrao,
            mensagem_pix_padrao
          )
          VALUES (
            $1,
            'evolution',
            FALSE,
            FALSE,
            FALSE,
            'Olá, {nome}. Seguem os boletos do título #{titulo_id}. {boletos}',
            'Olá, {nome}. Segue o PIX do título #{titulo_id}, parcela {parcela}. Valor: {valor}. Vencimento: {vencimento}. Copia e cola: {pix_copia_cola}'
          )
        `,
        [tenantId]
      );

      await client.query("COMMIT");

      return {
        tenant_id: tenantId,
        tenant_nome: data.empresa.tenant_nome,
        tenant_slug: tenantSlug,
        pessoa_id: pessoaId,
        usuario_id: usuarioId,
        tenant_ativo: true,
        certificado_validade_em: certificadoPreview.validade_em,
        created_by: usuarioCriadorId,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
}

export default TenantSetupDAO;
