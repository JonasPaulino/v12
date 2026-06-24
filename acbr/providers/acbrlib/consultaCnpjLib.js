import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ACBrBuffer = require("@projetoacbr/acbrlib-base-node/dist/src/ACBrBuffer").default;
const { TAMANHO_PADRAO } = require("@projetoacbr/acbrlib-base-node/dist/src/ACBrBuffer");

import ACBrLibConsultaCNPJBridge from "./consultaCnpjBridge.js";

class ACBrLibConsultaCNPJ {
  constructor(libraryPath, arquivoConfig, chaveCrypt) {
    this.acbrlib = new ACBrLibConsultaCNPJBridge(libraryPath).getAcbrNativeLib();
    this.arquivoConfig = arquivoConfig;
    this.chaveCrypt = chaveCrypt;
    this.initialized = false;
  }

  _checkResult(status) {
    if (status >= 0) return status;

    let message = "";
    if (this.initialized) {
      try {
        message = this.ultimoRetorno();
      } catch {}
    }

    throw new Error(message ? `${status}: ${message}` : String(status));
  }

  _callWithBuffer(callback) {
    const acbrBuffer = new ACBrBuffer(TAMANHO_PADRAO);
    const status = callback(acbrBuffer);
    this._checkResult(status);
    return acbrBuffer.toString();
  }

  inicializar() {
    const status = this.acbrlib.CNPJ_Inicializar(this.arquivoConfig, this.chaveCrypt);
    if (status === 0) {
      this.initialized = true;
    }
    this._checkResult(status);
    return status;
  }

  finalizar() {
    if (!this.initialized) return 0;
    const status = this.acbrlib.CNPJ_Finalizar();
    this.initialized = false;
    this._checkResult(status);
    return status;
  }

  ultimoRetorno() {
    return this._callWithBuffer((acbrBuffer) =>
      this.acbrlib.CNPJ_UltimoRetorno(acbrBuffer.getBuffer(), acbrBuffer.getRefTamanhoBuffer())
    );
  }

  configGravar() {
    const status = this.acbrlib.CNPJ_ConfigGravar(this.arquivoConfig);
    this._checkResult(status);
    return status;
  }

  configGravarValor(sessao, chave, valor) {
    const status = this.acbrlib.CNPJ_ConfigGravarValor(sessao, chave, valor);
    this._checkResult(status);
    return status;
  }

  consultar(cnpj) {
    return this._callWithBuffer((acbrBuffer) =>
      this.acbrlib.CNPJ_Consultar(cnpj, acbrBuffer.getBuffer(), acbrBuffer.getRefTamanhoBuffer())
    );
  }
}

export default ACBrLibConsultaCNPJ;
