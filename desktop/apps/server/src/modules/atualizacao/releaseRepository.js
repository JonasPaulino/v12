import { getDb } from "../../db/connection.js";

const parseJson = (value, fallback = {}) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const mapRelease = (row) =>
  row
    ? {
        ...row,
        obrigatorio: row.obrigatorio === 1,
        tamanho_bytes: Number(row.tamanho_bytes || 0),
        payload: parseJson(row.payload_json),
      }
    : null;

export function upsertReleaseUpdate(release, { status = "disponivel", arquivoLocal = null } = {}) {
  const db = getDb();
  const releaseId = String(release.release_id || release.pdv_release_id || "").trim();

  if (!releaseId) {
    throw new Error("Release sem identificador.");
  }

  db.prepare(
    `
      INSERT INTO release_update (
        release_id,
        versao,
        canal,
        plataforma,
        status,
        obrigatorio,
        arquivo_nome,
        arquivo_original,
        arquivo_local,
        arquivo_sha256,
        tamanho_bytes,
        notas,
        publicado_em,
        payload_json,
        atualizado_em
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(release_id) DO UPDATE SET
        versao = excluded.versao,
        canal = excluded.canal,
        plataforma = excluded.plataforma,
        status = excluded.status,
        obrigatorio = excluded.obrigatorio,
        arquivo_nome = excluded.arquivo_nome,
        arquivo_original = excluded.arquivo_original,
        arquivo_local = COALESCE(excluded.arquivo_local, release_update.arquivo_local),
        arquivo_sha256 = excluded.arquivo_sha256,
        tamanho_bytes = excluded.tamanho_bytes,
        notas = excluded.notas,
        publicado_em = excluded.publicado_em,
        payload_json = excluded.payload_json,
        atualizado_em = CURRENT_TIMESTAMP
    `,
  ).run(
    releaseId,
    release.versao,
    release.canal || "stable",
    release.plataforma || "win32-x64",
    status,
    release.obrigatorio ? 1 : 0,
    release.arquivo_nome || null,
    release.arquivo_original || null,
    arquivoLocal,
    release.arquivo_sha256 || null,
    Number(release.tamanho_bytes || 0),
    release.notas || null,
    release.publicado_em || null,
    JSON.stringify(release),
  );

  return getReleaseUpdateByReleaseId(releaseId);
}

export function markReleaseDownloaded({ releaseId, arquivoLocal }) {
  getDb()
    .prepare(
      `
        UPDATE release_update
        SET
          status = 'baixado',
          arquivo_local = ?,
          baixado_em = CURRENT_TIMESTAMP,
          ultimo_erro = NULL,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE release_id = ?
      `,
    )
    .run(arquivoLocal, String(releaseId));

  return getReleaseUpdateByReleaseId(releaseId);
}

export function markReleaseInstalled(releaseId) {
  getDb()
    .prepare(
      `
        UPDATE release_update
        SET
          status = 'instalando',
          instalado_em = CURRENT_TIMESTAMP,
          ultimo_erro = NULL,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE release_id = ?
      `,
    )
    .run(String(releaseId));

  return getReleaseUpdateByReleaseId(releaseId);
}

export function markReleaseError({ releaseId, error }) {
  getDb()
    .prepare(
      `
        UPDATE release_update
        SET
          status = 'erro',
          ultimo_erro = ?,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE release_id = ?
      `,
    )
    .run(String(error || "Falha no release."), String(releaseId));

  return getReleaseUpdateByReleaseId(releaseId);
}

export function getReleaseUpdateByReleaseId(releaseId) {
  return mapRelease(
    getDb()
      .prepare(
        `
          SELECT *
          FROM release_update
          WHERE release_id = ?
          LIMIT 1
        `,
      )
      .get(String(releaseId)),
  );
}

export function getLatestReleaseUpdate() {
  return mapRelease(
    getDb()
      .prepare(
        `
          SELECT *
          FROM release_update
          ORDER BY atualizado_em DESC, release_update_id DESC
          LIMIT 1
        `,
      )
      .get(),
  );
}
