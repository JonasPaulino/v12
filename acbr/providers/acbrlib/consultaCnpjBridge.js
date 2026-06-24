import { createRequire } from "module";

const require = createRequire(import.meta.url);
const koffi = require("koffi");

class ACBrLibConsultaCNPJBridge {
  constructor(libraryPath) {
    const acbr = koffi.load(libraryPath);

    this.acbrNativeLib = {
      CNPJ_Inicializar: acbr.func("CNPJ_Inicializar", "int", ["uintptr_t*", "string", "string"]),
      CNPJ_Finalizar: acbr.func("CNPJ_Finalizar", "int", ["uintptr_t"]),
      CNPJ_UltimoRetorno: acbr.func("CNPJ_UltimoRetorno", "int", ["uintptr_t", "char*", "long*"]),
      CNPJ_Nome: acbr.func("CNPJ_Nome", "int", ["uintptr_t", "char*", "long*"]),
      CNPJ_Versao: acbr.func("CNPJ_Versao", "int", ["uintptr_t", "char*", "long*"]),
      CNPJ_OpenSSLInfo: acbr.func("CNPJ_OpenSSLInfo", "int", ["uintptr_t", "char*", "long*"]),
      CNPJ_ConfigLer: acbr.func("CNPJ_ConfigLer", "int", ["uintptr_t", "string"]),
      CNPJ_ConfigGravar: acbr.func("CNPJ_ConfigGravar", "int", ["uintptr_t", "string"]),
      CNPJ_ConfigLerValor: acbr.func(
        "CNPJ_ConfigLerValor",
        "int",
        ["uintptr_t", "string", "string", "char*", "long*"]
      ),
      CNPJ_ConfigGravarValor: acbr.func(
        "CNPJ_ConfigGravarValor",
        "int",
        ["uintptr_t", "string", "string", "string"]
      ),
      CNPJ_ConfigImportar: acbr.func("CNPJ_ConfigImportar", "int", ["uintptr_t", "string"]),
      CNPJ_ConfigExportar: acbr.func("CNPJ_ConfigExportar", "int", ["uintptr_t", "char*", "long*"]),
      CNPJ_Consultar: acbr.func("CNPJ_Consultar", "int", ["uintptr_t", "string", "char*", "long*"]),
    };
  }

  getAcbrNativeLib() {
    return this.acbrNativeLib;
  }
}

export default ACBrLibConsultaCNPJBridge;
