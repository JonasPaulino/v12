import crypto from "crypto";

const PROFILE_CATEGORY = {
  vendedor: "vendas",
  financeiro: "financeiro",
  suporte: "suporte",
};

const normalizeText = (value, maxLength = null) => {
  const text = String(value ?? "").trim();
  return maxLength ? text.slice(0, maxLength) : text;
};

const normalizeEmail = (value) => normalizeText(value, 160).toLowerCase();

const normalizePhone = (value) => String(value ?? "").replace(/\D/g, "").slice(0, 20);

const buildProtocol = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `CHAT-${date}-${suffix}`;
};

const buildToken = () => crypto.randomUUID();

const rowToConfig = (row = {}) => ({
  chat_ativo: row.chat_ativo !== false,
  horario_inicio: row.horario_inicio || "",
  horario_fim: row.horario_fim || "",
  mensagem_fora_horario: row.mensagem_fora_horario || "",
});

const isOutsideBusinessHours = (config = {}) => {
  if (!config.horario_inicio || !config.horario_fim) return false;

  const now = new Date();
  const current = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
  const start = String(config.horario_inicio).slice(0, 5);
  const end = String(config.horario_fim).slice(0, 5);

  if (start <= end) return current < start || current > end;

  return current > end && current < start;
};

class ChatDAO {
  static allowedCategorySlugForProfile(perfil) {
    const normalized = String(perfil || "").toLowerCase();
    if (normalized === "admin") return null;
    return PROFILE_CATEGORY[normalized] || "suporte";
  }

  static async buscarConfiguracao(client) {
    const { rows } = await client.query(
      `
        SELECT chat_ativo, horario_inicio::text, horario_fim::text, mensagem_fora_horario
        FROM chat.configuracao
        WHERE configuracao_id = 1
      `
    );

    return rowToConfig(rows[0] || {});
  }

  static async salvarConfiguracao(client, payload = {}, usuarioId = null) {
    const data = {
      chat_ativo: payload.chat_ativo !== false,
      horario_inicio: normalizeText(payload.horario_inicio, 5) || null,
      horario_fim: normalizeText(payload.horario_fim, 5) || null,
      mensagem_fora_horario:
        normalizeText(payload.mensagem_fora_horario, 600) ||
        "Nosso atendimento está fora do horário no momento. Envie sua mensagem e retornaremos assim que possível.",
    };

    await client.query(
      `
        INSERT INTO chat.configuracao (
          configuracao_id,
          chat_ativo,
          horario_inicio,
          horario_fim,
          mensagem_fora_horario,
          atualizado_por,
          atualizado_em
        )
        VALUES (1, $1, $2, $3, $4, $5, NOW())
        ON CONFLICT (configuracao_id) DO UPDATE
        SET
          chat_ativo = EXCLUDED.chat_ativo,
          horario_inicio = EXCLUDED.horario_inicio,
          horario_fim = EXCLUDED.horario_fim,
          mensagem_fora_horario = EXCLUDED.mensagem_fora_horario,
          atualizado_por = EXCLUDED.atualizado_por,
          atualizado_em = NOW()
      `,
      [
        data.chat_ativo,
        data.horario_inicio,
        data.horario_fim,
        data.mensagem_fora_horario,
        usuarioId,
      ]
    );

    return this.buscarConfiguracao(client);
  }

  static async listarCategorias(client, { somenteAtivas = false } = {}) {
    const { rows } = await client.query(
      `
        SELECT categoria_id, slug, nome, descricao, ativo, ordem
        FROM chat.categoria
        WHERE ($1::boolean = FALSE OR ativo = TRUE)
        ORDER BY ordem ASC, nome ASC
      `,
      [somenteAtivas]
    );

    return rows;
  }

  static async salvarCategoria(client, payload = {}) {
    const categoriaId = Number(payload.categoria_id || 0) || null;
    const slug = normalizeText(payload.slug, 40).toLowerCase();
    const nome = normalizeText(payload.nome, 80);
    const descricao = normalizeText(payload.descricao, 500);
    const ativo = payload.ativo !== false;
    const ordem = Number(payload.ordem || 0);

    if (!slug || !nome) throw new Error("Informe slug e nome da categoria.");
    if (!/^[a-z0-9_-]+$/.test(slug)) throw new Error("Slug da categoria inválido.");

    const { rows } = await client.query(
      `
        INSERT INTO chat.categoria (categoria_id, slug, nome, descricao, ativo, ordem, atualizado_em)
        VALUES (COALESCE($1::integer, nextval('chat.categoria_categoria_id_seq')), $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (categoria_id) DO UPDATE
        SET
          slug = EXCLUDED.slug,
          nome = EXCLUDED.nome,
          descricao = EXCLUDED.descricao,
          ativo = EXCLUDED.ativo,
          ordem = EXCLUDED.ordem,
          atualizado_em = NOW()
        RETURNING categoria_id, slug, nome, descricao, ativo, ordem
      `,
      [categoriaId, slug, nome, descricao || null, ativo, ordem]
    );

    return rows[0];
  }

  static async criarAtendimento(client, payload = {}, user = null) {
    const config = await this.buscarConfiguracao(client);
    if (!config.chat_ativo) throw new Error("O chat está indisponível no momento.");

    const categoriaId = Number(payload.categoria_id || 0);
    const nome = normalizeText(payload.nome || user?.usuario_nome, 160);
    const email = normalizeEmail(payload.email || user?.usuario_email);
    const telefone = normalizePhone(payload.telefone);
    const assunto = normalizeText(payload.assunto, 180);
    const mensagem = normalizeText(payload.mensagem, 3000);

    if (!categoriaId) throw new Error("Selecione o setor de atendimento.");
    if (!nome) throw new Error("Informe seu nome.");
    if (!assunto) throw new Error("Informe o assunto.");
    if (!mensagem) throw new Error("Digite uma mensagem.");

    const categoria = await client.query(
      `
        SELECT categoria_id, nome
        FROM chat.categoria
        WHERE categoria_id = $1
          AND ativo = TRUE
        LIMIT 1
      `,
      [categoriaId]
    );

    if (!categoria.rowCount) throw new Error("Categoria de atendimento inválida.");

    const token = buildToken();
    const protocolo = buildProtocol();
    const tenantId = user?.tenantId ? Number(user.tenantId) : null;
    const usuarioId = user?.userId ? Number(user.userId) : null;

    const { rows } = await client.query(
      `
        INSERT INTO chat.atendimento (
          protocolo,
          client_token,
          categoria_id,
          tenant_id,
          usuario_id,
          cliente_nome,
          cliente_email,
          cliente_telefone,
          assunto
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
      [protocolo, token, categoriaId, tenantId, usuarioId, nome, email || null, telefone || null, assunto]
    );

    const atendimento = rows[0];

    await this.adicionarMensagemSistema(
      client,
      atendimento.atendimento_id,
      `Atendimento iniciado para ${categoria.rows[0].nome}.`
    );
    await this.adicionarMensagem(
      client,
      atendimento.atendimento_id,
      {
        autorTipo: "cliente",
        autorNome: nome,
        usuarioId,
        conteudo: mensagem,
      }
    );

    if (isOutsideBusinessHours(config) && config.mensagem_fora_horario) {
      await this.adicionarMensagemSistema(client, atendimento.atendimento_id, config.mensagem_fora_horario);
    }

    return this.buscarAtendimentoPublico(client, token);
  }

  static async adicionarMensagemSistema(client, atendimentoId, conteudo) {
    return this.adicionarMensagem(client, atendimentoId, {
      autorTipo: "sistema",
      autorNome: "Sistema V12",
      conteudo,
    });
  }

  static async adicionarMensagem(client, atendimentoId, payload = {}) {
    const conteudo = normalizeText(payload.conteudo, 3000);
    if (!conteudo) throw new Error("Digite uma mensagem.");

    const { rows } = await client.query(
      `
        INSERT INTO chat.mensagem (atendimento_id, autor_tipo, autor_nome, usuario_id, conteudo)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING mensagem_id, atendimento_id, autor_tipo, autor_nome, usuario_id, conteudo, criado_em
      `,
      [
        atendimentoId,
        payload.autorTipo || "cliente",
        payload.autorNome || "Cliente",
        payload.usuarioId || null,
        conteudo,
      ]
    );

    await client.query(
      `
        UPDATE chat.atendimento
        SET atualizado_em = NOW()
        WHERE atendimento_id = $1
      `,
      [atendimentoId]
    );

    return rows[0];
  }

  static async buscarAtendimentoPorToken(client, token) {
    const { rows } = await client.query(
      `
        SELECT
          a.*,
          c.slug AS categoria_slug,
          c.nome AS categoria_nome,
          u.usuario_nome AS atendente_nome
        FROM chat.atendimento a
        JOIN chat.categoria c ON c.categoria_id = a.categoria_id
        LEFT JOIN usuario u ON u.usuario_id = a.atendente_usuario_id
        WHERE a.client_token = $1
        LIMIT 1
      `,
      [String(token || "")]
    );

    return rows[0] || null;
  }

  static async calcularPosicaoFila(client, atendimento) {
    if (!atendimento || atendimento.status !== "aguardando") return 0;

    const { rows } = await client.query(
      `
        SELECT COUNT(*)::int AS posicao
        FROM chat.atendimento
        WHERE categoria_id = $1
          AND status = 'aguardando'
          AND criado_em <= $2
      `,
      [atendimento.categoria_id, atendimento.criado_em]
    );

    return rows[0]?.posicao || 1;
  }

  static async listarMensagens(client, atendimentoId) {
    const { rows } = await client.query(
      `
        SELECT mensagem_id, atendimento_id, autor_tipo, autor_nome, usuario_id, conteudo, criado_em
        FROM chat.mensagem
        WHERE atendimento_id = $1
        ORDER BY criado_em ASC, mensagem_id ASC
      `,
      [atendimentoId]
    );

    return rows;
  }

  static async buscarAtendimentoPublico(client, token) {
    const atendimento = await this.buscarAtendimentoPorToken(client, token);
    if (!atendimento) throw new Error("Atendimento não encontrado.");

    const [mensagens, posicao_fila] = await Promise.all([
      this.listarMensagens(client, atendimento.atendimento_id),
      this.calcularPosicaoFila(client, atendimento),
    ]);

    return {
      atendimento,
      mensagens,
      posicao_fila,
    };
  }

  static async enviarMensagemCliente(client, token, conteudo, user = null) {
    const atendimento = await this.buscarAtendimentoPorToken(client, token);
    if (!atendimento) throw new Error("Atendimento não encontrado.");
    if (atendimento.status === "encerrado") throw new Error("Este atendimento já foi encerrado.");

    await this.adicionarMensagem(client, atendimento.atendimento_id, {
      autorTipo: "cliente",
      autorNome: atendimento.cliente_nome || user?.usuario_nome || "Cliente",
      usuarioId: user?.userId || atendimento.usuario_id || null,
      conteudo,
    });

    return this.buscarAtendimentoPublico(client, token);
  }

  static async avaliarAtendimento(client, token, payload = {}) {
    const nota = Number(payload.nota || 0);
    const comentario = normalizeText(payload.comentario, 1000);
    if (nota < 1 || nota > 5) throw new Error("Informe uma nota de 1 a 5.");

    const { rows } = await client.query(
      `
        UPDATE chat.atendimento
        SET
          avaliacao_nota = $2,
          avaliacao_comentario = $3,
          avaliado_em = NOW(),
          atualizado_em = NOW()
        WHERE client_token = $1
          AND status = 'encerrado'
        RETURNING atendimento_id, protocolo, avaliacao_nota, avaliacao_comentario, avaliado_em
      `,
      [token, nota, comentario || null]
    );

    if (!rows[0]) throw new Error("Atendimento encerrado não encontrado para avaliação.");
    return rows[0];
  }

  static async buscarPerfilGestao(client, usuarioId) {
    const { rows } = await client.query(
      `
        SELECT COALESCE(gi.perfil, CASE WHEN u.usuario_master THEN 'admin' ELSE 'suporte' END) AS perfil
        FROM usuario u
        LEFT JOIN gestao.usuario_interno gi ON gi.usuario_id = u.usuario_id
        WHERE u.usuario_id = $1
        LIMIT 1
      `,
      [usuarioId]
    );

    return rows[0]?.perfil || "suporte";
  }

  static async listarAtendimentosGestao(client, usuarioId, { status = "", search = "" } = {}) {
    const perfil = await this.buscarPerfilGestao(client, usuarioId);
    const allowedSlug = this.allowedCategorySlugForProfile(perfil);
    const params = [];
    const filters = [];

    if (allowedSlug) {
      params.push(allowedSlug);
      filters.push(`c.slug = $${params.length}`);
    }

    const statusValues = String(status || "")
      .split(",")
      .map((item) => normalizeText(item, 30))
      .filter((item) => ["aguardando", "em_atendimento", "encerrado"].includes(item));
    if (statusValues.length) {
      params.push(statusValues);
      filters.push(`a.status = ANY($${params.length}::varchar[])`);
    }

    const searchValue = normalizeText(search, 120);
    if (searchValue) {
      params.push(`%${searchValue}%`);
      filters.push(`
        (
          a.protocolo ILIKE $${params.length}
          OR a.cliente_nome ILIKE $${params.length}
          OR a.assunto ILIKE $${params.length}
          OR c.nome ILIKE $${params.length}
        )
      `);
    }

    const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const { rows } = await client.query(
      `
        SELECT
          a.atendimento_id,
          a.protocolo,
          a.categoria_id,
          c.slug AS categoria_slug,
          c.nome AS categoria_nome,
          a.cliente_nome,
          a.cliente_email,
          a.assunto,
          a.status,
          a.atendente_usuario_id,
          u.usuario_nome AS atendente_nome,
          a.criado_em,
          a.atualizado_em,
          a.primeira_resposta_em,
          a.encerrado_em,
          a.avaliacao_nota,
          (
            SELECT m.conteudo
            FROM chat.mensagem m
            WHERE m.atendimento_id = a.atendimento_id
            ORDER BY m.criado_em DESC, m.mensagem_id DESC
            LIMIT 1
          ) AS ultima_mensagem
        FROM chat.atendimento a
        JOIN chat.categoria c ON c.categoria_id = a.categoria_id
        LEFT JOIN usuario u ON u.usuario_id = a.atendente_usuario_id
        ${whereSql}
        ORDER BY
          CASE a.status
            WHEN 'aguardando' THEN 1
            WHEN 'em_atendimento' THEN 2
            ELSE 3
          END,
          a.atualizado_em DESC
        LIMIT 200
      `,
      params
    );

    return rows;
  }

  static async buscarAtendimentoGestao(client, usuarioId, atendimentoId) {
    const perfil = await this.buscarPerfilGestao(client, usuarioId);
    const allowedSlug = this.allowedCategorySlugForProfile(perfil);
    const params = [atendimentoId];
    const allowedSql = allowedSlug ? `AND c.slug = $2` : "";
    if (allowedSlug) params.push(allowedSlug);

    const { rows } = await client.query(
      `
        SELECT
          a.*,
          c.slug AS categoria_slug,
          c.nome AS categoria_nome,
          u.usuario_nome AS atendente_nome
        FROM chat.atendimento a
        JOIN chat.categoria c ON c.categoria_id = a.categoria_id
        LEFT JOIN usuario u ON u.usuario_id = a.atendente_usuario_id
        WHERE a.atendimento_id = $1
          ${allowedSql}
        LIMIT 1
      `,
      params
    );

    const atendimento = rows[0] || null;
    if (!atendimento) throw new Error("Atendimento não encontrado para seu perfil.");

    return {
      atendimento,
      mensagens: await this.listarMensagens(client, atendimento.atendimento_id),
    };
  }

  static async responderGestao(client, usuario, atendimentoId, conteudo) {
    const detail = await this.buscarAtendimentoGestao(client, usuario.userId, atendimentoId);
    const atendimento = detail.atendimento;
    if (atendimento.status === "encerrado") throw new Error("Este atendimento já foi encerrado.");

    if (atendimento.status === "aguardando") {
      await client.query(
        `
          UPDATE chat.atendimento
          SET
            status = 'em_atendimento',
            atendente_usuario_id = $2,
            primeira_resposta_em = COALESCE(primeira_resposta_em, NOW()),
            atualizado_em = NOW()
          WHERE atendimento_id = $1
        `,
        [atendimentoId, usuario.userId]
      );
    }

    await this.adicionarMensagem(client, atendimentoId, {
      autorTipo: "atendente",
      autorNome: usuario.usuario_nome || usuario.username || "Atendente",
      usuarioId: usuario.userId,
      conteudo,
    });

    return this.buscarAtendimentoGestao(client, usuario.userId, atendimentoId);
  }

  static async transferirGestao(client, usuario, atendimentoId, categoriaId, motivo = "") {
    const detail = await this.buscarAtendimentoGestao(client, usuario.userId, atendimentoId);
    const atendimento = detail.atendimento;
    if (atendimento.status === "encerrado") throw new Error("Este atendimento já foi encerrado.");

    const categoria = await client.query(
      `
        SELECT categoria_id, nome
        FROM chat.categoria
        WHERE categoria_id = $1
          AND ativo = TRUE
        LIMIT 1
      `,
      [Number(categoriaId || 0)]
    );
    if (!categoria.rowCount) throw new Error("Categoria de destino inválida.");

    await client.query(
      `
        INSERT INTO chat.transferencia (
          atendimento_id,
          categoria_origem_id,
          categoria_destino_id,
          usuario_id,
          motivo
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [atendimentoId, atendimento.categoria_id, categoriaId, usuario.userId, normalizeText(motivo, 1000) || null]
    );

    await client.query(
      `
        UPDATE chat.atendimento
        SET
          categoria_id = $2,
          status = 'aguardando',
          atendente_usuario_id = NULL,
          atualizado_em = NOW()
        WHERE atendimento_id = $1
      `,
      [atendimentoId, categoriaId]
    );

    await this.adicionarMensagemSistema(
      client,
      atendimentoId,
      `Atendimento transferido para ${categoria.rows[0].nome}.`
    );

    return this.buscarAtendimentoGestao(client, usuario.userId, atendimentoId);
  }

  static async encerrarGestao(client, usuario, atendimentoId) {
    const detail = await this.buscarAtendimentoGestao(client, usuario.userId, atendimentoId);
    if (detail.atendimento.status === "encerrado") return detail;

    await client.query(
      `
        UPDATE chat.atendimento
        SET
          status = 'encerrado',
          atendente_usuario_id = COALESCE(atendente_usuario_id, $2),
          encerrado_em = NOW(),
          atualizado_em = NOW()
        WHERE atendimento_id = $1
      `,
      [atendimentoId, usuario.userId]
    );

    await this.adicionarMensagemSistema(
      client,
      atendimentoId,
      "Atendimento encerrado. Avalie a conversa para finalizar."
    );

    return this.buscarAtendimentoGestao(client, usuario.userId, atendimentoId);
  }
}

export default ChatDAO;
