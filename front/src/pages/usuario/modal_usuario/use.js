import { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import {
  createUsuario,
  getSupportData,
  getUsuarioById,
  updateUsuario,
} from "./api";

const buildInitialForm = (currentTenantId = null) => ({
  usuario_nome: "",
  usuario_email: "",
  usuario_username: "",
  usuario_senha: "",
  usuario_ativo: true,
  tenant_ids: currentTenantId ? [currentTenantId] : [],
  tenant_id_default: currentTenantId || "",
});

export const useModalUsuario = ({ isOpen, usuarioId, onClose }) => {
  const { business, showLoading, hideLoading } = useContext(AppContext);
  const { showAlert } = useSweetAlert();
  const [activeTab, setActiveTab] = useState("dados");
  const [loadingForm, setLoadingForm] = useState(false);
  const [manageableTenants, setManageableTenants] = useState([]);
  const [currentTenantId, setCurrentTenantId] = useState(business?.tenant_id || null);
  const [hiddenAssignmentsCount, setHiddenAssignmentsCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(buildInitialForm(business?.tenant_id || null));

  useEffect(() => {
    setCurrentTenantId(business?.tenant_id || null);
  }, [business]);

  useEffect(() => {
    if (!isOpen) {
      setActiveTab("dados");
      setLoadingForm(false);
      setManageableTenants([]);
      setHiddenAssignmentsCount(0);
      setForm(buildInitialForm(business?.tenant_id || null));
      return;
    }

    let mounted = true;

    const load = async () => {
      try {
        setLoadingForm(true);
        const support = await getSupportData();
        if (!mounted) return;

        const tenants = support?.manageableTenants || [];
        const tenantAtualId = support?.tenantAtualId || business?.tenant_id || null;

        setManageableTenants(tenants);
        setCurrentTenantId(tenantAtualId);

        if (usuarioId) {
          const response = await getUsuarioById(usuarioId);
          if (!mounted) return;
          const data = response?.data;

          setHiddenAssignmentsCount(data?.hiddenAssignmentsCount || 0);
          setForm({
            usuario_nome: data?.usuario?.usuario_nome || "",
            usuario_email: data?.usuario?.usuario_email || "",
            usuario_username: data?.usuario?.usuario_username || "",
            usuario_senha: "",
            usuario_ativo: data?.usuario?.usuario_ativo ?? true,
            tenant_ids: Array.from(
              new Set([...(data?.tenantIds || []), tenantAtualId].filter(Boolean))
            ),
            tenant_id_default:
              data?.usuario?.tenant_id_default && (data?.tenantIds || []).includes(data.usuario.tenant_id_default)
                ? data.usuario.tenant_id_default
                : tenantAtualId || "",
          });
        } else {
          setHiddenAssignmentsCount(0);
          setForm(buildInitialForm(tenantAtualId));
        }
      } catch (error) {
        showAlert({
          title: "Falha ao abrir formulario",
          text:
            error?.response?.data?.message ||
            "Nao foi possivel carregar os dados do usuario.",
          icon: "error",
        });
        onClose(false);
      } finally {
        setLoadingForm(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [business?.tenant_id, isOpen, onClose, showAlert, usuarioId]);

  const selectedTenantIds = useMemo(() => {
    const requiredId = currentTenantId ? [currentTenantId] : [];
    return Array.from(new Set([...(form.tenant_ids || []), ...requiredId].filter(Boolean)));
  }, [currentTenantId, form.tenant_ids]);

  useEffect(() => {
    if (
      form.tenant_id_default &&
      selectedTenantIds.includes(Number(form.tenant_id_default))
    ) {
      return;
    }

    if (selectedTenantIds[0]) {
      setForm((prev) => ({ ...prev, tenant_id_default: selectedTenantIds[0] }));
    }
  }, [form.tenant_id_default, selectedTenantIds]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTenant = (tenantId) => {
    if (tenantId === currentTenantId) return;

    setForm((prev) => {
      const alreadySelected = prev.tenant_ids.includes(tenantId);
      return {
        ...prev,
        tenant_ids: alreadySelected
          ? prev.tenant_ids.filter((item) => item !== tenantId)
          : [...prev.tenant_ids, tenantId],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      showLoading(usuarioId ? "Atualizando usuario..." : "Cadastrando usuario...");

      const payload = {
        ...form,
        tenant_ids: selectedTenantIds,
        tenant_id_default: Number(form.tenant_id_default) || currentTenantId,
      };

      const response = usuarioId
        ? await updateUsuario(usuarioId, payload)
        : await createUsuario(payload);

      showAlert({
        title: "Sucesso",
        text:
          response?.message ||
          (usuarioId ? "Usuario atualizado com sucesso." : "Usuario cadastrado com sucesso."),
        icon: "success",
        timer: 1800,
      });

      onClose(true);
    } catch (error) {
      showAlert({
        title: "Falha ao salvar",
        text:
          error?.response?.data?.message ||
          "Nao foi possivel salvar os dados do usuario.",
        icon: "error",
      });
    } finally {
      hideLoading();
      setSubmitting(false);
    }
  };

  return {
    activeTab,
    setActiveTab,
    manageableTenants,
    currentTenantId,
    hiddenAssignmentsCount,
    form,
    updateField,
    toggleTenant,
    selectedTenantIds,
    handleSubmit,
    submitting,
    loadingForm,
  };
};
