import { createRequire } from "module";

const require = createRequire(import.meta.url);
const koffi = require("koffi");

class ACBrLibConsultaCNPJBridge {
  constructor(libraryPath) {
    const acbr = koffi.load(libraryPath);

    this.acbrNativeLib = {
      CNPJ_Inicializar: acbr.func("cdecl", "CNPJ_Inicializar", "int", ["string", "string"]),
      CNPJ_Finalizar: acbr.func("cdecl", "CNPJ_Finalizar", "int", []),
      CNPJ_UltimoRetorno: acbr.func("cdecl", "CNPJ_UltimoRetorno", "int", ["char*", "long*"]),
      CNPJ_Nome: acbr.func("cdecl", "CNPJ_Nome", "int", ["char*", "long*"]),
      CNPJ_Versao: acbr.func("cdecl", "CNPJ_Versao", "int", ["char*", "long*"]),
      CNPJ_OpenSSLInfo: acbr.func("cdecl", "CNPJ_OpenSSLInfo", "int", ["char*", "long*"]),
      CNPJ_ConfigLer: acbr.func("cdecl", "CNPJ_ConfigLer", "int", ["string"]),
      CNPJ_ConfigGravar: acbr.func("cdecl", "CNPJ_ConfigGravar", "int", ["string"]),
      CNPJ_ConfigLerValor: acbr.func(
        "cdecl",
        "CNPJ_ConfigLerValor",
        "int",
        ["string", "string", "char*", "long*"]
      ),
      CNPJ_ConfigGravarValor: acbr.func(
        "cdecl",
        "CNPJ_ConfigGravarValor",
        "int",
        ["string", "string", "string"]
      ),
      CNPJ_ConfigImportar: acbr.func("cdecl", "CNPJ_ConfigImportar", "int", ["string"]),
      CNPJ_ConfigExportar: acbr.func("cdecl", "CNPJ_ConfigExportar", "int", ["char*", "long*"]),
      CNPJ_Consultar: acbr.func("cdecl", "CNPJ_Consultar", "int", ["string", "char*", "long*"]),
    };
  }

  getAcbrNativeLib() {
    return this.acbrNativeLib;
  }
}

export default ACBrLibConsultaCNPJBridge;
