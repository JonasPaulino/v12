import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { AppContext } from "context";
import { useSweetAlert } from "context/sweet_alert";
import {
  cancelarManifestoMdfe,
  deleteManifestoMdfe,
  deleteMotoristaMdfe,
  deleteSeguradoraMdfe,
  deleteVeiculoMdfe,
  downloadDamdfeMdfe,
  encerrarManifestoMdfe,
  getManifestoMdfe,
  consultarStatusServicoMdfe,
  listManifestosMdfe,
  listMotoristasMdfe,
  listMotoristasMdfeSelect,
  listNfesAutorizadasMdfeSelect,
  listPessoasMdfeSelect,
  listSeguradorasMdfe,
  listSeguradorasMdfeSelect,
  listVeiculosMdfe,
  listVeiculosMdfeSelect,
  processarManifestoMdfe,
  saveManifestoMdfe,
  saveMotoristaMdfe,
  saveSeguradoraMdfe,
  saveVeiculoMdfe,
} from "./api";

const PAGE_SIZE = 12;

const initialVeiculoForm = () => ({
  placa: "",
  renavam: "",
  uf: "PE",
  tara_kg: "0",
  capacidade_kg: "0",
  capacidade_m3: "0",
  tipo_rodado: "01",
  tipo_carroceria: "00",
  tipo_proprietario: "",
  rntrc: "",
  ativo: true,
});

const initialMotoristaForm = () => ({
  pessoa_id: "",
  nome: "",
  cpf: "",
  cnh: "",
  telefone: "",
  ativo: true,
});

const initialSeguradoraForm = () => ({
  nome: "",
  cnpj: "",
  ativo: true,
});

const initialManifestoForm = () => ({
  tipo_emitente: "2",
  modal: "1",
  tipo_transportador: "",
  veiculo_tracao_id: "",
  uf_inicio: "PE",
  uf_fim: "PE",
  municipio_carregamento_codigo: "",
  municipio_carregamento_nome: "",
  observacao: "",
  condutores: [{ motorista_id: "", principal: true }],
  reboques: [],
  percurso: [],
  descargas: [{ municipio_codigo: "", municipio_nome: "", uf: "" }],
  documentos: [
    {
      nfe_id: "",
      tipo_documento: "nfe",
      chave_acesso: "",
      valor_documento: "0",
      peso_kg: "0",
      municipio_descarga_codigo: "",
      municipio_descarga_nome: "",
    },
  ],
  seguros: [],
  ciot: [],
});

const mapManifestoToForm = (manifesto = {}) => ({
  ...initialManifestoForm(),
  tipo_emitente: manifesto.tipo_emitente || "2",
  modal: manifesto.modal || "1",
  tipo_transportador: manifesto.tipo_transportador || "",
  veiculo_tracao_id: manifesto.veiculo_tracao_id ? String(manifesto.veiculo_tracao_id) : "",
  uf_inicio: manifesto.uf_inicio || "PE",
  uf_fim: manifesto.uf_fim || "PE",
  municipio_carregamento_codigo: manifesto.municipio_carregamento_codigo || "",
  municipio_carregamento_nome: manifesto.municipio_carregamento_nome || "",
  observacao: manifesto.observacao || "",
  condutores: (manifesto.condutores || []).length
    ? manifesto.condutores.map((item) => ({
        motorista_id: String(item.motorista_id || ""),
        principal: !!item.principal,
      }))
    : [{ motorista_id: "", principal: true }],
  reboques: (manifesto.reboques || []).map((item) => ({
    veiculo_id: String(item.veiculo_id || ""),
  })),
  percurso: (manifesto.percurso || []).map((item) => ({ uf: item.uf || "" })),
  descargas: (manifesto.descargas || []).length
    ? manifesto.descargas.map((item) => ({
        municipio_codigo: item.municipio_codigo || "",
        municipio_nome: item.municipio_nome || "",
        uf: item.uf || "",
      }))
    : [{ municipio_codigo: "", municipio_nome: "", uf: "" }],
  documentos: (manifesto.documentos || []).length
    ? manifesto.documentos.map((item) => ({
        nfe_id: item.nfe_id ? String(item.nfe_id) : "",
        tipo_documento: item.tipo_documento || "nfe",
        chave_acesso: item.chave_acesso || "",
        valor_documento: String(item.valor_documento ?? "0"),
        peso_kg: String(item.peso_kg ?? "0"),
        municipio_descarga_codigo: item.municipio_descarga_codigo || "",
        municipio_descarga_nome: item.municipio_descarga_nome || "",
        nfe_serie: item.nfe_serie,
        nfe_numero: item.nfe_numero,
        nfe_finalidade: item.nfe_finalidade,
        nfe_tipo_operacao: item.nfe_tipo_operacao,
        nfe_valor_total: item.nfe_valor_total,
        nfe_destinatario_nome_razao: item.nfe_destinatario_nome_razao,
        nfe_destinatario_cpf_cnpj: item.nfe_destinatario_cpf_cnpj,
        nfe_municipio_descarga_codigo: item.nfe_municipio_descarga_codigo,
        nfe_municipio_descarga_nome: item.nfe_municipio_descarga_nome,
        nfe_municipio_descarga_uf: item.nfe_municipio_descarga_uf,
      }))
    : initialManifestoForm().documentos,
  seguros: (manifesto.seguros || []).map((item) => ({
    seguradora_id: item.seguradora_id ? String(item.seguradora_id) : "",
    responsavel_seguro: item.responsavel_seguro || "1",
    cnpj_responsavel: item.cnpj_responsavel || "",
    cpf_responsavel: item.cpf_responsavel || "",
    numero_apolice: item.numero_apolice || "",
    averbacoes_texto: Array.isArray(item.averbacoes)
      ? item.averbacoes.join("\n")
      : "",
  })),
  ciot: (manifesto.ciot || []).map((item) => ({
    ciot: item.ciot || "",
    cpf_cnpj_responsavel: item.cpf_cnpj_responsavel || "",
  })),
});

const normalizeError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const mergeUniqueOptions = (current = [], incoming = [], key = "pessoa_id") => {
  const map = new Map();
  [...current, ...incoming].forEach((item) => {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") {
      map.set(Number(value), item);
    }
  });
  return Array.from(map.values());
};

const mapMotoristaToPessoaOption = (motorista = {}) => {
  if (!motorista?.pessoa_id) return null;
  return {
    pessoa_id: motorista.pessoa_id,
    pessoa_nome_razao: motorista.nome,
    pessoa_cpf_cnpj: motorista.cpf,
    pessoa_telefone: motorista.telefone,
  };
};

const mapDocumentoToNfeOption = (documento = {}) => {
  if (!documento?.nfe_id) return null;
  return {
    nfe_id: documento.nfe_id,
    serie: documento.nfe_serie,
    numero: documento.nfe_numero,
    chave_acesso: documento.chave_acesso,
    finalidade: documento.nfe_finalidade,
    tipo_operacao: documento.nfe_tipo_operacao,
    valor_total: documento.nfe_valor_total ?? documento.valor_documento,
    destinatario_nome_razao: documento.nfe_destinatario_nome_razao,
    destinatario_cpf_cnpj: documento.nfe_destinatario_cpf_cnpj,
    municipio_descarga_codigo:
      documento.nfe_municipio_descarga_codigo || documento.municipio_descarga_codigo,
    municipio_descarga_nome:
      documento.nfe_municipio_descarga_nome || documento.municipio_descarga_nome,
    municipio_descarga_uf: documento.nfe_municipio_descarga_uf,
  };
};

export const useMdfePage = () => {
  const { showLoading, hideLoading } = useContext(AppContext);
  const { showAlert, askYesNoQuestion } = useSweetAlert();
  const [activeTab, setActiveTab] = useState("manifestos");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalType, setModalType] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [closingId, setClosingId] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const [veiculoForm, setVeiculoForm] = useState(initialVeiculoForm);
  const [motoristaForm, setMotoristaForm] = useState(initialMotoristaForm);
  const [seguradoraForm, setSeguradoraForm] = useState(initialSeguradoraForm);
  const [manifestoForm, setManifestoForm] = useState(initialManifestoForm);
  const [veiculoOptions, setVeiculoOptions] = useState([]);
  const [motoristaOptions, setMotoristaOptions] = useState([]);
  const [seguradoraOptions, setSeguradoraOptions] = useState([]);
  const [pessoasOptions, setPessoasOptions] = useState([]);
  const [nfeOptions, setNfeOptions] = useState([]);
  const [pessoaModalOpen, setPessoaModalOpen] = useState(false);

  const pessoasMap = useMemo(
    () => new Map((pessoasOptions || []).map((pessoa) => [Number(pessoa.pessoa_id), pessoa])),
    [pessoasOptions]
  );

  const selectedMotoristaPessoa = pessoasMap.get(Number(motoristaForm.pessoa_id)) || null;
  const nfesMap = useMemo(
    () => new Map((nfeOptions || []).map((item) => [Number(item.nfe_id), item])),
    [nfeOptions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        showLoading();
        const loader = {
          manifestos: () =>
            listManifestosMdfe(page, PAGE_SIZE, debouncedSearch, {
              data_emissao: "DESC",
            }),
          veiculos: () => listVeiculosMdfe(page, PAGE_SIZE, debouncedSearch),
          motoristas: () => listMotoristasMdfe(page, PAGE_SIZE, debouncedSearch),
          seguradoras: () => listSeguradorasMdfe(page, PAGE_SIZE, debouncedSearch),
        }[activeTab];

        const response = await loader();
        if (!mounted) return;

        if ((response.totalPages || 1) < page) {
          setPage(response.totalPages || 1);
          return;
        }

        setRows(response.data || []);
        setTotalPages(response.totalPages || 1);
      } catch (error) {
        if (!mounted) return;
        setRows([]);
        setTotalPages(1);
        showAlert({
          title: "Falha ao carregar",
          text: normalizeError(error, "Não foi possível carregar os dados de MDF-e."),
          icon: "error",
        });
      } finally {
        hideLoading();
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [
    activeTab,
    debouncedSearch,
    hideLoading,
    page,
    refreshKey,
    showAlert,
    showLoading,
  ]);

  const loadSelectData = useCallback(async () => {
    const [veiculos, motoristas, seguradoras] = await Promise.all([
      listVeiculosMdfeSelect("", 80),
      listMotoristasMdfeSelect("", 80),
      listSeguradorasMdfeSelect("", 80),
    ]);

    setVeiculoOptions(veiculos.data || []);
    setMotoristaOptions(motoristas.data || []);
    setSeguradoraOptions(seguradoras.data || []);
  }, []);

  const openNew = useCallback(
    async (type = activeTab) => {
      setEditingItem(null);
      setModalType(type);
      if (type === "veiculos") setVeiculoForm(initialVeiculoForm());
      if (type === "motoristas") {
        setMotoristaForm(initialMotoristaForm());
        setPessoasOptions([]);
      }
      if (type === "seguradoras") setSeguradoraForm(initialSeguradoraForm());
      if (type === "manifestos") {
        setManifestoForm(initialManifestoForm());
        setNfeOptions([]);
        await loadSelectData();
      }
    },
    [activeTab, loadSelectData]
  );

  const openEdit = useCallback(
    async (type, item) => {
      setEditingItem(item);
      setModalType(type);

      if (type === "veiculos") setVeiculoForm({ ...initialVeiculoForm(), ...item });
      if (type === "motoristas") {
        setMotoristaForm({ ...initialMotoristaForm(), ...item });
        const pessoaOption = mapMotoristaToPessoaOption(item);
        if (pessoaOption) {
          setPessoasOptions((prev) => mergeUniqueOptions(prev, [pessoaOption]));
        }
      }
      if (type === "seguradoras") setSeguradoraForm({ ...initialSeguradoraForm(), ...item });
      if (type === "manifestos") {
        try {
          showLoading();
          await loadSelectData();
          const response = await getManifestoMdfe(item.mdfe_id);
          const nextForm = mapManifestoToForm(response.data || {});
          setManifestoForm(nextForm);
          setNfeOptions(
            nextForm.documentos.map(mapDocumentoToNfeOption).filter(Boolean)
          );
        } catch (error) {
          showAlert({
            title: "Falha ao abrir",
            text: normalizeError(error, "Não foi possível abrir o MDF-e."),
            icon: "error",
          });
          setModalType(null);
        } finally {
          hideLoading();
        }
      }
    },
    [hideLoading, loadSelectData, showAlert, showLoading]
  );

  const closeModal = useCallback(() => {
    setModalType(null);
    setEditingItem(null);
  }, []);

  const updateVeiculoField = (field, value) =>
    setVeiculoForm((prev) => ({ ...prev, [field]: value }));

  const updateMotoristaField = (field, value) =>
    setMotoristaForm((prev) => ({ ...prev, [field]: value }));

  const handleSelectMotoristaPessoa = useCallback((pessoaId, pessoa) => {
    if (pessoa) {
      setPessoasOptions((prev) => mergeUniqueOptions(prev, [pessoa]));
    }

    setMotoristaForm((prev) => ({
      ...prev,
      pessoa_id: pessoaId,
      nome: pessoa?.pessoa_nome_razao || prev.nome,
      cpf: pessoa?.pessoa_cpf_cnpj || prev.cpf,
      telefone: pessoa?.pessoa_telefone || prev.telefone,
    }));
  }, []);

  const loadPessoasOptions = useCallback(async (search) => {
    const response = await listPessoasMdfeSelect(search, 20);
    const data = response?.data || [];
    setPessoasOptions((prev) => mergeUniqueOptions(prev, data));
    return data;
  }, []);

  const loadNfesAutorizadasOptions = useCallback(
    async (search) => {
      const response = await listNfesAutorizadasMdfeSelect(
        search,
        30,
        editingItem?.mdfe_id || null
      );
      const data = response?.data || [];
      setNfeOptions((prev) => mergeUniqueOptions(prev, data, "nfe_id"));
      return data;
    },
    [editingItem?.mdfe_id]
  );

  const openPessoaModal = useCallback(() => {
    setPessoaModalOpen(true);
  }, []);

  const closePessoaModal = useCallback((saved, pessoa) => {
    setPessoaModalOpen(false);
    if (!saved || !pessoa?.pessoa_id) return;

    setPessoasOptions((prev) => mergeUniqueOptions(prev, [pessoa]));
    setMotoristaForm((prev) => ({
      ...prev,
      pessoa_id: pessoa.pessoa_id,
      nome: pessoa.pessoa_nome_razao || prev.nome,
      cpf: pessoa.pessoa_cpf_cnpj || prev.cpf,
      telefone: pessoa.pessoa_telefone || prev.telefone,
    }));
  }, []);

  const updateSeguradoraField = (field, value) =>
    setSeguradoraForm((prev) => ({ ...prev, [field]: value }));

  const updateManifestoField = (field, value) =>
    setManifestoForm((prev) => ({ ...prev, [field]: value }));

  const updateManifestoArrayItem = (arrayName, index, field, value) => {
    setManifestoForm((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const getDocumentoNfeOption = useCallback(
    (documento) =>
      nfesMap.get(Number(documento?.nfe_id)) || mapDocumentoToNfeOption(documento) || null,
    [nfesMap]
  );

  const handleChangeDocumentoTipo = useCallback((index, tipoDocumento) => {
    setManifestoForm((prev) => ({
      ...prev,
      documentos: prev.documentos.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              tipo_documento: tipoDocumento,
              nfe_id: tipoDocumento === "nfe" ? item.nfe_id : "",
              chave_acesso: tipoDocumento === "nfe" ? item.chave_acesso : "",
            }
          : item
      ),
    }));
  }, []);

  const handleSelectDocumentoNfe = useCallback((index, value, option) => {
    const selectedNfeId = value || option?.nfe_id || "";
    const duplicated = manifestoForm.documentos.some(
      (documento, itemIndex) =>
        itemIndex !== index && String(documento.nfe_id || "") === String(selectedNfeId)
    );

    if (selectedNfeId && duplicated) {
      showAlert({
        title: "NF-e já adicionada",
        text: "Esta NF-e já está vinculada ao MDF-e.",
        icon: "warning",
      });
      return;
    }

    if (option) {
      setNfeOptions((prev) => mergeUniqueOptions(prev, [option], "nfe_id"));
    }

    setManifestoForm((prev) => {
      const codigoDescarga = option?.municipio_descarga_codigo || "";
      const nomeDescarga = option?.municipio_descarga_nome || "";
      const ufDescarga = option?.municipio_descarga_uf || "";
      const nextDocumentos = prev.documentos.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              nfe_id: selectedNfeId,
              tipo_documento: "nfe",
              chave_acesso: option?.chave_acesso || item.chave_acesso,
              valor_documento: String(option?.valor_total ?? item.valor_documento ?? "0"),
              peso_kg: String(item.peso_kg ?? "0"),
              municipio_descarga_codigo:
                codigoDescarga || item.municipio_descarga_codigo || "",
              municipio_descarga_nome: nomeDescarga || item.municipio_descarga_nome || "",
              nfe_serie: option?.serie,
              nfe_numero: option?.numero,
              nfe_finalidade: option?.finalidade,
              nfe_tipo_operacao: option?.tipo_operacao,
              nfe_valor_total: option?.valor_total,
              nfe_destinatario_nome_razao: option?.destinatario_nome_razao,
              nfe_destinatario_cpf_cnpj: option?.destinatario_cpf_cnpj,
              nfe_municipio_descarga_codigo: codigoDescarga,
              nfe_municipio_descarga_nome: nomeDescarga,
              nfe_municipio_descarga_uf: ufDescarga,
            }
          : item
      );

      const hasDescarga =
        codigoDescarga &&
        prev.descargas.some((descarga) => descarga.municipio_codigo === codigoDescarga);
      const hasBlankDescarga = prev.descargas.some(
        (descarga) => !descarga.municipio_codigo && !descarga.municipio_nome
      );
      const nextDescargas =
        codigoDescarga && nomeDescarga && !hasDescarga
          ? hasBlankDescarga
            ? prev.descargas.map((descarga) =>
                !descarga.municipio_codigo && !descarga.municipio_nome
                  ? {
                      ...descarga,
                      municipio_codigo: codigoDescarga,
                      municipio_nome: nomeDescarga,
                      uf: ufDescarga || descarga.uf,
                    }
                  : descarga
              )
            : [
                ...prev.descargas,
                {
                  municipio_codigo: codigoDescarga,
                  municipio_nome: nomeDescarga,
                  uf: ufDescarga,
                },
              ]
          : prev.descargas;

      return {
        ...prev,
        documentos: nextDocumentos,
        descargas: nextDescargas,
      };
    });
  }, [manifestoForm.documentos, showAlert]);

  const addManifestoArrayItem = (arrayName, item) => {
    setManifestoForm((prev) => ({
      ...prev,
      [arrayName]: [...prev[arrayName], item],
    }));
  };

  const removeManifestoArrayItem = (arrayName, index) => {
    setManifestoForm((prev) => ({
      ...prev,
      [arrayName]: prev[arrayName].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const saveCurrent = useCallback(async () => {
    try {
      setSaving(true);
      const idMap = {
        veiculos: editingItem?.mdfe_veiculo_id,
        motoristas: editingItem?.mdfe_motorista_id,
        seguradoras: editingItem?.mdfe_seguradora_id,
        manifestos: editingItem?.mdfe_id,
      };
      const saveMap = {
        veiculos: () => saveVeiculoMdfe(veiculoForm, idMap.veiculos),
        motoristas: () => saveMotoristaMdfe(motoristaForm, idMap.motoristas),
        seguradoras: () => saveSeguradoraMdfe(seguradoraForm, idMap.seguradoras),
        manifestos: () => saveManifestoMdfe(manifestoForm, idMap.manifestos),
      };

      const response = await saveMap[modalType]();
      showAlert({
        title: "Salvo",
        text: response.message || "Cadastro salvo com sucesso.",
        icon: "success",
        timer: 1600,
      });
      closeModal();
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      showAlert({
        title: "Falha ao salvar",
        text: normalizeError(error, "Não foi possível salvar o cadastro."),
        icon: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [
    closeModal,
    editingItem,
    manifestoForm,
    modalType,
    motoristaForm,
    seguradoraForm,
    showAlert,
    veiculoForm,
  ]);

  const deleteItem = useCallback(
    async (type, item) => {
      const confirmed = await askYesNoQuestion(
        "Confirmar exclusão",
        "O registro será inativado ou excluído logicamente."
      );
      if (!confirmed) return;

      try {
        const deleteMap = {
          veiculos: () => deleteVeiculoMdfe(item.mdfe_veiculo_id),
          motoristas: () => deleteMotoristaMdfe(item.mdfe_motorista_id),
          seguradoras: () => deleteSeguradoraMdfe(item.mdfe_seguradora_id),
          manifestos: () => deleteManifestoMdfe(item.mdfe_id),
        };

        const response = await deleteMap[type]();
        showAlert({
          title: "Registro removido",
          text: response.message || "Registro removido com sucesso.",
          icon: "success",
          timer: 1500,
        });
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        showAlert({
          title: "Falha ao remover",
          text: normalizeError(error, "Não foi possível remover o registro."),
          icon: "error",
        });
      }
    },
    [askYesNoQuestion, showAlert]
  );

  const checkMdfeStatusService = useCallback(async () => {
    try {
      setCheckingStatus(true);
      const response = await consultarStatusServicoMdfe();
      showAlert({
        title: "Status MDF-e",
        text: response?.data?.raw || response?.message || "Consulta executada com sucesso.",
        icon: "success",
      });
    } catch (error) {
      showAlert({
        title: "Falha na consulta",
        text: normalizeError(error, "Não foi possível consultar o status do serviço MDF-e."),
        icon: "error",
      });
    } finally {
      setCheckingStatus(false);
    }
  }, [showAlert]);

  const processManifesto = useCallback(
    async (item) => {
      const confirmed = await askYesNoQuestion(
        "Emitir MDF-e",
        "O manifesto será enviado para autorização na SEFAZ usando a ACBrLibMDFe."
      );
      if (!confirmed) return;

      try {
        setProcessingId(item.mdfe_id);
        const response = await processarManifestoMdfe(item.mdfe_id);
        showAlert({
          title: response.success ? "MDF-e autorizado" : "Retorno MDF-e",
          text: response.message || "Processamento concluído.",
          icon: response.success ? "success" : "warning",
        });
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        showAlert({
          title: "Falha ao emitir",
          text: normalizeError(error, "Não foi possível emitir o MDF-e."),
          icon: "error",
        });
      } finally {
        setProcessingId(null);
      }
    },
    [askYesNoQuestion, showAlert]
  );

  const openDamdfe = useCallback(
    async (item) => {
      try {
        const blob = await downloadDamdfeMdfe(item.mdfe_id);
        const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      } catch (error) {
        showAlert({
          title: "Falha ao abrir DAMDFE",
          text: normalizeError(error, "Não foi possível abrir o DAMDFE."),
          icon: "error",
        });
      }
    },
    [showAlert]
  );

  const askEncerramentoData = useCallback(async (item) => {
    const result = await Swal.fire({
      title: "Encerrar MDF-e",
      html: `
        <div style="display:grid;gap:10px;text-align:left;">
          <p style="margin:0;color:#5f6f8f;font-size:13px;">
            Informe o município onde a viagem foi encerrada.
          </p>
          <input id="mdfe-enc-codigo" class="swal2-input" placeholder="Código IBGE" maxlength="7" style="margin:0;" />
          <input id="mdfe-enc-nome" class="swal2-input" placeholder="Município" style="margin:0;" />
          <input id="mdfe-enc-uf" class="swal2-input" placeholder="UF" maxlength="2" style="margin:0;text-transform:uppercase;" value="${item.uf_fim || ""}" />
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Encerrar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#0b5fff",
      focusConfirm: false,
      preConfirm: () => {
        const municipio_codigo =
          document.getElementById("mdfe-enc-codigo")?.value?.replace(/\D/g, "") || "";
        const municipio_nome = document.getElementById("mdfe-enc-nome")?.value?.trim() || "";
        const uf =
          document.getElementById("mdfe-enc-uf")?.value?.trim().toUpperCase() || "";

        if (municipio_codigo.length !== 7) {
          Swal.showValidationMessage("Código IBGE precisa ter 7 dígitos.");
          return false;
        }

        if (!municipio_nome) {
          Swal.showValidationMessage("Informe o município de encerramento.");
          return false;
        }

        if (uf.length !== 2) {
          Swal.showValidationMessage("UF precisa ter 2 letras.");
          return false;
        }

        return { municipio_codigo, municipio_nome, uf };
      },
    });

    return result.isConfirmed ? result.value : null;
  }, []);

  const closeManifesto = useCallback(
    async (item) => {
      const payload = await askEncerramentoData(item);
      if (!payload) return;

      try {
        setClosingId(item.mdfe_id);
        const response = await encerrarManifestoMdfe(item.mdfe_id, payload);
        showAlert({
          title: response.success ? "MDF-e encerrado" : "Retorno MDF-e",
          text: response.message || "Encerramento concluído.",
          icon: response.success ? "success" : "warning",
        });
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        showAlert({
          title: "Falha ao encerrar",
          text: normalizeError(error, "Não foi possível encerrar o MDF-e."),
          icon: "error",
        });
      } finally {
        setClosingId(null);
      }
    },
    [askEncerramentoData, showAlert]
  );

  const askCancelamentoData = useCallback(async () => {
    const result = await Swal.fire({
      title: "Cancelar MDF-e",
      html: `
        <div style="display:grid;gap:10px;text-align:left;">
          <p style="margin:0;color:#5f6f8f;font-size:13px;">
            Informe uma justificativa fiscal clara. A SEFAZ exige pelo menos 15 caracteres.
          </p>
          <textarea id="mdfe-cancel-justificativa" class="swal2-textarea" placeholder="Justificativa" style="margin:0;min-height:110px;"></textarea>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Cancelar MDF-e",
      cancelButtonText: "Voltar",
      confirmButtonColor: "#d33",
      focusConfirm: false,
      preConfirm: () => {
        const justificativa =
          document.getElementById("mdfe-cancel-justificativa")?.value?.trim() || "";

        if (justificativa.length < 15) {
          Swal.showValidationMessage("A justificativa precisa ter pelo menos 15 caracteres.");
          return false;
        }

        if (justificativa.length > 255) {
          Swal.showValidationMessage("A justificativa precisa ter no máximo 255 caracteres.");
          return false;
        }

        return { justificativa };
      },
    });

    return result.isConfirmed ? result.value : null;
  }, []);

  const cancelManifesto = useCallback(
    async (item) => {
      const payload = await askCancelamentoData();
      if (!payload) return;

      try {
        setCancelingId(item.mdfe_id);
        const response = await cancelarManifestoMdfe(item.mdfe_id, payload);
        showAlert({
          title: response.success ? "MDF-e cancelado" : "Retorno MDF-e",
          text: response.message || "Cancelamento concluído.",
          icon: response.success ? "success" : "warning",
        });
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        showAlert({
          title: "Falha ao cancelar",
          text: normalizeError(error, "Não foi possível cancelar o MDF-e."),
          icon: "error",
        });
      } finally {
        setCancelingId(null);
      }
    },
    [askCancelamentoData, showAlert]
  );

  return {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    rows,
    page,
    setPage,
    totalPages,
    modalType,
    editingItem,
    saving,
    checkingStatus,
    processingId,
    closingId,
    cancelingId,
    veiculoForm,
    motoristaForm,
    seguradoraForm,
    manifestoForm,
    veiculoOptions,
    motoristaOptions,
    seguradoraOptions,
    selectedMotoristaPessoa,
    pessoaModalOpen,
    openNew,
    openEdit,
    closeModal,
    openPessoaModal,
    closePessoaModal,
    handleSelectMotoristaPessoa,
    loadPessoasOptions,
    loadNfesAutorizadasOptions,
    getDocumentoNfeOption,
    handleChangeDocumentoTipo,
    handleSelectDocumentoNfe,
    updateVeiculoField,
    updateMotoristaField,
    updateSeguradoraField,
    updateManifestoField,
    updateManifestoArrayItem,
    addManifestoArrayItem,
    removeManifestoArrayItem,
    saveCurrent,
    deleteItem,
    checkMdfeStatusService,
    processManifesto,
    openDamdfe,
    closeManifesto,
    cancelManifesto,
  };
};
