const normalizeText = (value, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const normalizeBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  return ["true", "1", "sim", "yes", "on"].includes(String(value || "").trim().toLowerCase());
};

class GestaoPdvReleaseDAO {
  static async criarRelease(client, payload) {
    const {
      versao,
      canal,
      plataforma,
      status,
      obrigatorio,
      arquivoNome,
      arquivoOriginal,
      arquivoPath,
      arquivoSha256,
      tamanhoBytes,
      notas,
      criadoPor,
    } = payload;

    const finalStatus = normalizeText(status, "rascunho");
    const publicadoEm = finalStatus === "publicado" ? "NOW()" : "NULL";

    const { rows } = await client.query(
      `
        INSERT INTO gestao.pdv_release (
          versao,
          canal,
          plataforma,
          status,
          obrigatorio,
          arquivo_nome,
          arquivo_original,
          arquivo_path,
          arquivo_sha256,
          tamanho_bytes,
          notas,
          publicado_em,
          criado_por
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, ${publicadoEm}, $12
        )
        RETURNING *
      `,
      [
        normalizeText(versao),
        normalizeText(canal, "stable"),
        normalizeText(plataforma, "win32-x64"),
        finalStatus,
        normalizeBoolean(obrigatorio),
        arquivoNome,
        arquivoOriginal,
        arquivoPath,
        arquivoSha256,
        Number(tamanhoBytes || 0),
        normalizeText(notas, null),
        criadoPor || null,
      ],
    );

    return rows[0] || null;
  }

  static async listarReleases(client, { canal, plataforma, status, limit = 50 } = {}) {
    const values = [];
    const where = [];

    if (canal) {
      values.push(String(canal).trim());
      where.push(`canal = $${values.length}`);
    }

    if (plataforma) {
      values.push(String(plataforma).trim());
      where.push(`plataforma = $${values.length}`);
    }

    if (status) {
      values.push(String(status).trim());
      where.push(`status = $${values.length}`);
    }

    values.push(Math.min(Math.max(Number(limit) || 50, 1), 200));

    const { rows } = await client.query(
      `
        SELECT *
        FROM gestao.pdv_release
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY publicado_em DESC NULLS LAST, criado_em DESC, pdv_release_id DESC
        LIMIT $${values.length}
      `,
      values,
    );

    return rows;
  }

  static async buscarReleasePorId(client, releaseId) {
    const { rows } = await client.query(
      `
        SELECT *
        FROM gestao.pdv_release
        WHERE pdv_release_id = $1
        LIMIT 1
      `,
      [releaseId],
    );

    return rows[0] || null;
  }

  static async buscarReleasePublicado(client, { canal, plataforma }) {
    const { rows } = await client.query(
      `
        SELECT *
        FROM gestao.pdv_release
        WHERE canal = $1
          AND plataforma = $2
          AND status = 'publicado'
        ORDER BY publicado_em DESC NULLS LAST, criado_em DESC, pdv_release_id DESC
        LIMIT 1
      `,
      [normalizeText(canal, "stable"), normalizeText(plataforma, "win32-x64")],
    );

    return rows[0] || null;
  }

  static async publicarRelease(client, { releaseId, usuarioId }) {
    const { rows } = await client.query(
      `
        UPDATE gestao.pdv_release
        SET
          status = 'publicado',
          publicado_em = COALESCE(publicado_em, NOW()),
          criado_por = COALESCE(criado_por, $2),
          atualizado_em = NOW()
        WHERE pdv_release_id = $1
        RETURNING *
      `,
      [releaseId, usuarioId || null],
    );

    return rows[0] || null;
  }

  static async desativarRelease(client, releaseId) {
    const { rows } = await client.query(
      `
        UPDATE gestao.pdv_release
        SET
          status = 'desativado',
          atualizado_em = NOW()
        WHERE pdv_release_id = $1
        RETURNING *
      `,
      [releaseId],
    );

    return rows[0] || null;
  }
}

export default GestaoPdvReleaseDAO;
