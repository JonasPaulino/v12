import crypto from "node:crypto";
import { env } from "../../config/env.js";

const DEFAULT_BLOCK_MESSAGE =
  "Todos os acessos desta filial foram bloqueados. Entre em contato com o suporte.";

function normalizeBlockMessage(message) {
  const normalized = String(message || "").trim();
  if (!normalized) {
    return DEFAULT_BLOCK_MESSAGE;
  }

  if (/bloqueio manual pela gest[aã]o v12/i.test(normalized)) {
    return DEFAULT_BLOCK_MESSAGE;
  }

  return normalized;
}

function toBase64Url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value) {
  return Buffer.from(String(value || ""), "base64url").toString("utf8");
}

function signPayload(payload) {
  return crypto.createHmac("sha256", env.erpSyncToken).update(String(payload || "")).digest("hex");
}

function fallbackState(config) {
  const tenantAtivo = Number(config?.tenant_ativo) !== 0;
  const tenantUsaPdv = Number(config?.tenant_usa_pdv) !== 0;
  const tenantBloqueado = Number(config?.tenant_acesso_bloqueado) !== 0;
  const motivoBloqueio = normalizeBlockMessage(config?.tenant_bloqueio_motivo);

  return {
    configurado: !!config,
    integridade_ok: false,
    tenant_ativo: tenantAtivo,
    tenant_usa_pdv: tenantUsaPdv,
    tenant_acesso_bloqueado: tenantBloqueado,
    tenant_bloqueio_motivo: tenantBloqueado ? motivoBloqueio : null,
    acesso_liberado: tenantAtivo && tenantUsaPdv && !tenantBloqueado,
  };
}

export function getSignedTenantAccessState(config) {
  if (!config) {
    return {
      configurado: false,
      integridade_ok: false,
      tenant_ativo: false,
      tenant_usa_pdv: false,
      tenant_acesso_bloqueado: false,
      tenant_bloqueio_motivo: "PDV local ainda não configurado para uma filial.",
      acesso_liberado: false,
    };
  }

  const payload = String(config.sync_guard_payload || "").trim();
  const signature = String(config.sync_guard_signature || "").trim();

  if (!payload || !signature) {
    return fallbackState(config);
  }

  if (!env.erpSyncToken) {
    return {
      configurado: true,
      integridade_ok: false,
      tenant_ativo: false,
      tenant_usa_pdv: false,
      tenant_acesso_bloqueado: true,
      tenant_bloqueio_motivo:
        "Este terminal não conseguiu validar a situação da filial com a retaguarda.",
      acesso_liberado: false,
    };
  }

  const expectedSignature = signPayload(payload);
  if (expectedSignature !== signature) {
    return {
      configurado: true,
      integridade_ok: false,
      tenant_ativo: false,
      tenant_usa_pdv: false,
      tenant_acesso_bloqueado: true,
      tenant_bloqueio_motivo:
        "A situação desta filial não pôde ser validada pela retaguarda. Atualize o PDV para continuar.",
      acesso_liberado: false,
    };
  }

  try {
    const decoded = JSON.parse(fromBase64Url(payload));
    const tenantId = Number(decoded?.tenant_id || 0);
    if (!tenantId || tenantId !== Number(config.tenant_erp_id || 0)) {
      throw new Error("tenant mismatch");
    }

    const tenantAtivo = decoded?.tenant_ativo !== false;
    const tenantUsaPdv = decoded?.tenant_usa_pdv !== false;
    const tenantBloqueado = !!decoded?.tenant_acesso_bloqueado;
    const motivoBloqueio = tenantBloqueado
      ? normalizeBlockMessage(decoded?.tenant_bloqueio_motivo)
      : null;

    return {
      configurado: true,
      integridade_ok: true,
      tenant_ativo: tenantAtivo,
      tenant_usa_pdv: tenantUsaPdv,
      tenant_acesso_bloqueado: tenantBloqueado,
      tenant_bloqueio_motivo: motivoBloqueio,
      acesso_liberado: tenantAtivo && tenantUsaPdv && !tenantBloqueado,
      sync_guard_issued_at: decoded?.issued_at || config.sync_guard_issued_at || null,
    };
  } catch {
    return {
      configurado: true,
      integridade_ok: false,
      tenant_ativo: false,
      tenant_usa_pdv: false,
      tenant_acesso_bloqueado: true,
      tenant_bloqueio_motivo:
        "A situação desta filial não pôde ser validada pela retaguarda. Atualize o PDV para continuar.",
      acesso_liberado: false,
    };
  }
}

export function encodeTenantAccessGuard(payload) {
  const serialized = toBase64Url(JSON.stringify(payload));
  return {
    sync_guard_payload: serialized,
    sync_guard_signature: signPayload(serialized),
    sync_guard_issued_at: payload?.issued_at || null,
  };
}

export { DEFAULT_BLOCK_MESSAGE, normalizeBlockMessage };
