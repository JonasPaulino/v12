import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const koffi = require("koffi");

const BUFFER_SIZE = 20 * 1024 * 1024;

const createBuffer = () => {
  const buffer = Buffer.alloc(BUFFER_SIZE);
  const size = koffi.alloc("int", 1);
  koffi.encode(size, "int", BUFFER_SIZE);
  return { buffer, size };
};

const readBuffer = ({ buffer }) => buffer.toString("utf8").replace(/\0+$/g, "").trim();

const isErrorCode = (result) => Number(result) < 0;

class AcbrLibMDFeMT {
  constructor(libraryPath, arquivoConfig = "", chaveCrypt = "") {
    this.libraryPath = path.resolve(libraryPath);
    this.arquivoConfig = arquivoConfig || "";
    this.chaveCrypt = chaveCrypt || "";
    this.lib = koffi.load(this.libraryPath);
    this.handlePointer = koffi.alloc("void *", 1);
    this.handle = null;
    this.initialized = false;
    this.bind();
  }

  bind() {
    this.fn = {
      inicializar: this.lib.func("MDFE_Inicializar", "int", ["void **", "string", "string"]),
      finalizar: this.lib.func("MDFE_Finalizar", "int", ["void *"]),
      ultimoRetorno: this.lib.func("MDFE_UltimoRetorno", "int", ["void *", "char*", "int*"]),
      nome: this.lib.func("MDFE_Nome", "int", ["void *", "char*", "int*"]),
      versao: this.lib.func("MDFE_Versao", "int", ["void *", "char*", "int*"]),
      configGravar: this.lib.func("MDFE_ConfigGravar", "int", ["void *", "string"]),
      configGravarValor: this.lib.func("MDFE_ConfigGravarValor", "int", [
        "void *",
        "string",
        "string",
        "string",
      ]),
      statusServico: this.lib.func("MDFE_StatusServico", "int", ["void *", "char*", "int*"]),
      carregarXML: this.lib.func("MDFE_CarregarXML", "int", ["void *", "string"]),
      carregarINI: this.lib.func("MDFE_CarregarINI", "int", ["void *", "string"]),
      limparLista: this.lib.func("MDFE_LimparLista", "int", ["void *"]),
      assinar: this.lib.func("MDFE_Assinar", "int", ["void *"]),
      validar: this.lib.func("MDFE_Validar", "int", ["void *"]),
      enviar: this.lib.func("MDFE_Enviar", "int", [
        "void *",
        "int",
        "bool",
        "bool",
        "char*",
        "int*",
      ]),
      obterXml: this.lib.func("MDFE_ObterXml", "int", ["void *", "int", "char*", "int*"]),
      salvarPDF: this.lib.func("MDFE_SalvarPDF", "int", ["void *", "char*", "int*"]),
      imprimirPDF: this.lib.func("MDFE_ImprimirPDF", "int", ["void *"]),
    };
  }

  getHandle() {
    if (!this.initialized || !this.handle) {
      throw new Error("ACBrLibMDFe não inicializada.");
    }
    return this.handle;
  }

  check(result) {
    if (!isErrorCode(result)) return result;
    const lastReturn = this.safeUltimoRetorno();
    throw new Error(lastReturn || `ACBrLibMDFe retornou erro ${result}.`);
  }

  inicializar(arquivoConfig = this.arquivoConfig, chaveCrypt = this.chaveCrypt) {
    const result = this.fn.inicializar(this.handlePointer, arquivoConfig || "", chaveCrypt || "");
    this.check(result);
    this.handle = koffi.decode(this.handlePointer, "void *");
    this.initialized = true;
    return result;
  }

  finalizar() {
    if (!this.initialized || !this.handle) return 0;
    const result = this.fn.finalizar(this.handle);
    this.initialized = false;
    this.handle = null;
    this.check(result);
    return result;
  }

  safeUltimoRetorno() {
    try {
      return this.ultimoRetorno();
    } catch {
      return "";
    }
  }

  ultimoRetorno() {
    const data = createBuffer();
    this.fn.ultimoRetorno(this.getHandle(), data.buffer, data.size);
    return readBuffer(data);
  }

  nome() {
    const data = createBuffer();
    this.check(this.fn.nome(this.getHandle(), data.buffer, data.size));
    return readBuffer(data);
  }

  versao() {
    const data = createBuffer();
    this.check(this.fn.versao(this.getHandle(), data.buffer, data.size));
    return readBuffer(data);
  }

  configGravar(pathConfig = "") {
    return this.check(this.fn.configGravar(this.getHandle(), pathConfig || ""));
  }

  configGravarValor(sessao, chave, valor) {
    return this.check(
      this.fn.configGravarValor(
        this.getHandle(),
        String(sessao || ""),
        String(chave || ""),
        String(valor ?? "")
      )
    );
  }

  statusServico() {
    const data = createBuffer();
    this.check(this.fn.statusServico(this.getHandle(), data.buffer, data.size));
    return readBuffer(data);
  }

  limparLista() {
    return this.check(this.fn.limparLista(this.getHandle()));
  }

  carregarXML(xmlPath) {
    return this.check(this.fn.carregarXML(this.getHandle(), xmlPath));
  }

  carregarINI(iniPath) {
    return this.check(this.fn.carregarINI(this.getHandle(), iniPath));
  }

  assinar() {
    return this.check(this.fn.assinar(this.getHandle()));
  }

  validar() {
    return this.check(this.fn.validar(this.getHandle()));
  }

  enviar(lote = 1, imprimir = false, sincrono = true) {
    const data = createBuffer();
    this.check(
      this.fn.enviar(this.getHandle(), lote, imprimir, sincrono, data.buffer, data.size)
    );
    return readBuffer(data);
  }

  obterXml(indice = 0) {
    const data = createBuffer();
    this.check(this.fn.obterXml(this.getHandle(), indice, data.buffer, data.size));
    return readBuffer(data);
  }

  imprimirPDF() {
    return this.check(this.fn.imprimirPDF(this.getHandle()));
  }

  salvarPDF() {
    const data = createBuffer();
    this.check(this.fn.salvarPDF(this.getHandle(), data.buffer, data.size));
    return readBuffer(data);
  }
}

export default AcbrLibMDFeMT;
