import { createRequire } from "module";

const require = createRequire(import.meta.url);
const koffi = require("koffi");

class ACBrLibConsultaCNPJBridge {
  constructor(libraryPath) {
    const acbr = koffi.load(libraryPath);

    this.acbrNativeLib = {
      CNPJ_Inicializar: acbr.func("CNPJ_Inicializar", "int", ["string", "string"]),
      CNPJ_Finalizar: acbr.func("CNPJ_Finalizar", "int", []),
      CNPJ_UltimoRetorno: acbr.func("CNPJ_UltimoRetorno", "int", ["char*", "int*"]),
      CNPJ_Nome: acbr.func("CNPJ_Nome", "int", ["char*", "int*"]),
      CNPJ_Versao: acbr.func("CNPJ_Versao", "int", ["char*", "int*"]),
      CNPJ_OpenSSLInfo: acbr.func("CNPJ_OpenSSLInfo", "int", ["char*", "int*"]),
      CNPJ_ConfigLer: acbr.func("CNPJ_ConfigLer", "int", ["string"]),
      CNPJ_ConfigGravar: acbr.func("CNPJ_ConfigGravar", "int", ["string"]),
      CNPJ_ConfigLerValor: acbr.func(
        "CNPJ_ConfigLerValor",
        "int",
        ["string", "string", "char*", "int*"]
      ),
      CNPJ_ConfigGravarValor: acbr.func(
        "CNPJ_ConfigGravarValor",
        "int",
        ["string", "string", "string"]
      ),
      CNPJ_ConfigImportar: acbr.func("CNPJ_ConfigImportar", "int", ["string"]),
      CNPJ_ConfigExportar: acbr.func("CNPJ_ConfigExportar", "int", ["char*", "int*"]),
      CNPJ_Consultar: acbr.func("CNPJ_Consultar", "int", ["string", "char*", "int*"]),
    };
  }

  getAcbrNativeLib() {
    return this.acbrNativeLib;
  }
}

export default ACBrLibConsultaCNPJBridge;
