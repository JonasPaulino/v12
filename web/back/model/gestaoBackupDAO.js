import { decryptSecret, encryptSecret } from "../utils/secret.js";

const CONFIG_KEY = "backup_google_drive";

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "sim", "yes", "t"].includes(normalized)) return true;
  if (["false", "0", "nao", "não", "no", "f"].includes(normalized)) return false;
  return fallback;
};

const normalizeText = (value, maxLength = null) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return "";
  return maxLength ? normalized.slice(0, maxLength) : normalized;
};

const maskSecret = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (normalized.length <= 12) return "********";
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`;
};

const parseJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
};

async function getConfigValue(client) {
  const { rows } = await client.query(
    `
      SELECT valor_json
      FROM gestao.configuracao
      WHERE chave = $1
      LIMIT 1
    `,
    [CONFIG_KEY]
  );

  return parseJson(rows[0]?.valor_json, {});
}

class GestaoBackupDAO {
  static async buscarConfiguracaoGoogleDrive(client) {
    const config = await getConfigValue(client);
    const envCredential =
      process.env.GESTAO_BACKUP_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ||
      process.env.GESTAO_BACKUP_GOOGLE_SERVICE_ACCOUNT_JSON ||
      "";
    const envFolderId = process.env.GESTAO_BACKUP_GOOGLE_DRIVE_FOLDER_ID || "";

    const credentialEncrypted = config.credential_criptografada || null;
    const credential = credentialEncrypted ? decryptSecret(credentialEncrypted) : envCredential;
    const folderId = normalizeText(config.folder_id || envFolderId, 255);

    return {
      ativo: normalizeBoolean(config.ativo, false) || !!envCredential,
      folderId,
      credential,
      credentialMasked: config.credential_masked || maskSecret(envCredential),
      scope:
        config.scope ||
        process.env.GESTAO_BACKUP_GOOGLE_SCOPE ||
        "https://www.googleapis.com/auth/drive.file",
    };
  }

  static async salvarConfiguracaoGoogleDrive(client, data = {}, usuarioId = null) {
    const current = await getConfigValue(client);
    const credential = normalizeText(data.credential || data.credencial);
    const nextValue = {
      ...current,
      ativo: normalizeBoolean(data.ativo, false),
      folder_id: normalizeText(data.folder_id || data.folderId, 255),
      scope:
        normalizeText(data.scope, 255) ||
        current.scope ||
        "https://www.googleapis.com/auth/drive.file",
    };

    if (credential) {
      nextValue.credential_criptografada = encryptSecret(credential);
      nextValue.credential_masked = maskSecret(credential);
    }

    await client.query(
      `
        INSERT INTO gestao.configuracao (chave, valor_json, descricao, atualizado_por)
        VALUES ($1, $2::jsonb, 'Configuração de backup fiscal no Google Drive.', $3)
        ON CONFLICT (chave) DO UPDATE
        SET
          valor_json = EXCLUDED.valor_json,
          atualizado_por = EXCLUDED.atualizado_por
      `,
      [CONFIG_KEY, JSON.stringify(nextValue), usuarioId || null]
    );

    return this.buscarConfiguracaoGoogleDrive(client);
  }

  static async buscarBackupPorHash(client, { tenantId, arquivoSha256 }) {
    const { rows } = await client.query(
      `
        SELECT
          pdv_backup_fiscal_id,
          tenant_id,
          status,
          arquivo_nome,
          arquivo_sha256,
          tamanho_bytes,
          drive_file_id,
          drive_web_view_link,
          erro,
          recebido_em,
          enviado_drive_em
        FROM pdv.backup_fiscal
        WHERE tenant_id = $1
          AND arquivo_sha256 = $2
        LIMIT 1
      `,
      [tenantId, arquivoSha256]
    );

    return rows[0] || null;
  }

  static async registrarBackupRecebido(
    client,
    { tenantId, terminal, terminalCodigo, terminalNome, arquivoNome, arquivoSha256, tamanhoBytes, manifest }
  ) {
    const { rows } = await client.query(
      `
        INSERT INTO pdv.backup_fiscal (
          tenant_id,
          pdv_terminal_id,
          terminal_codigo,
          terminal_nome,
          status,
          arquivo_nome,
          arquivo_sha256,
          tamanho_bytes,
          manifest_json
        )
        VALUES ($1, $2, $3, $4, 'recebido', $5, $6, $7, $8::jsonb)
        ON CONFLICT (tenant_id, arquivo_sha256) DO UPDATE
        SET
          terminal_codigo = COALESCE(EXCLUDED.terminal_codigo, pdv.backup_fiscal.terminal_codigo),
          terminal_nome = COALESCE(EXCLUDED.terminal_nome, pdv.backup_fiscal.terminal_nome),
          manifest_json = EXCLUDED.manifest_json,
          atualizado_em = NOW()
        RETURNING *
      `,
      [
        tenantId,
        terminal?.pdv_terminal_id || null,
        normalizeText(terminalCodigo, 40) || null,
        normalizeText(terminalNome, 120) || null,
        normalizeText(arquivoNome, 180),
        arquivoSha256,
        Number(tamanhoBytes || 0),
        JSON.stringify(manifest || {}),
      ]
    );

    return rows[0];
  }

  static async substituirItensBackup(client, { tenantId, backupId, itens = [] }) {
    await client.query(`DELETE FROM pdv.backup_fiscal_item WHERE pdv_backup_fiscal_id = $1`, [
      backupId,
    ]);

    for (const item of itens) {
      await client.query(
        `
          INSERT INTO pdv.backup_fiscal_item (
            tenant_id,
            pdv_backup_fiscal_id,
            origem_tipo,
            origem_chave,
            caminho_relativo,
            tamanho_bytes,
            sha256
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (tenant_id, origem_tipo, origem_chave, sha256) DO NOTHING
        `,
        [
          tenantId,
          backupId,
          normalizeText(item.tipo || item.origem_tipo, 40),
          normalizeText(item.origem_chave || item.origemChave),
          normalizeText(item.caminho_relativo || item.relativePath),
          Number(item.tamanho_bytes || item.tamanhoBytes || 0),
          normalizeText(item.sha256, 64),
        ]
      );
    }
  }

  static async marcarBackupEnviadoDrive(client, { backupId, driveFile, payload }) {
    const { rows } = await client.query(
      `
        UPDATE pdv.backup_fiscal
        SET
          status = 'concluido',
          drive_file_id = $2,
          drive_web_view_link = $3,
          drive_payload_json = $4::jsonb,
          enviado_drive_em = NOW(),
          atualizado_em = NOW(),
          erro = NULL
        WHERE pdv_backup_fiscal_id = $1
        RETURNING *
      `,
      [
        backupId,
        driveFile?.id || null,
        driveFile?.webViewLink || null,
        JSON.stringify(payload || driveFile || {}),
      ]
    );

    return rows[0];
  }

  static async marcarBackupErro(client, { backupId, erro }) {
    const { rows } = await client.query(
      `
        UPDATE pdv.backup_fiscal
        SET
          status = 'erro',
          erro = $2,
          atualizado_em = NOW()
        WHERE pdv_backup_fiscal_id = $1
        RETURNING *
      `,
      [backupId, String(erro || "").slice(0, 4000)]
    );

    return rows[0];
  }
}

export default GestaoBackupDAO;
