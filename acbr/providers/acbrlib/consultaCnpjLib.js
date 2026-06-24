import { createRequire } from "module";

const require = createRequire(import.meta.url);
const ACBrLibBaseMT = require("@projetoacbr/acbrlib-base-node/dist/src").default;
const ACBrBuffer = require("@projetoacbr/acbrlib-base-node/dist/src/ACBrBuffer").default;
const { TAMANHO_PADRAO } = require("@projetoacbr/acbrlib-base-node/dist/src/ACBrBuffer");

import ACBrLibConsultaCNPJBridgeMT from "./consultaCnpjBridge.js";

class ACBrLibConsultaCNPJMT extends ACBrLibBaseMT {
  constructor(libraryPath, arquivoConfig, chaveCrypt) {
    super(new ACBrLibConsultaCNPJBridgeMT(libraryPath).getAcbrNativeLib(), arquivoConfig, chaveCrypt);
  }

  getAcbrlib() {
    return super.getAcbrlib();
  }

  LIB_Inicializar(handle, configPath, chaveCrypt) {
    return this.getAcbrlib().CNPJ_Inicializar(handle, configPath, chaveCrypt);
  }

  LIB_Finalizar(handle) {
    return this.getAcbrlib().CNPJ_Finalizar(handle);
  }

  LIB_UltimoRetorno(handle, mensagem, refTamanho) {
    return this.getAcbrlib().CNPJ_UltimoRetorno(handle, mensagem, refTamanho);
  }

  LIB_Nome(handle, nome, refTamanho) {
    return this.getAcbrlib().CNPJ_Nome(handle, nome, refTamanho);
  }

  LIB_Versao(handle, versao, refTamanho) {
    return this.getAcbrlib().CNPJ_Versao(handle, versao, refTamanho);
  }

  LIB_ConfigLer(handle, arqConfig) {
    return this.getAcbrlib().CNPJ_ConfigLer(handle, arqConfig);
  }

  LIB_ConfigGravar(handle, arqConfig) {
    return this.getAcbrlib().CNPJ_ConfigGravar(handle, arqConfig);
  }

  LIB_ConfigLerValor(handle, sessao, chave, valor, refTamanho) {
    return this.getAcbrlib().CNPJ_ConfigLerValor(handle, sessao, chave, valor, refTamanho);
  }

  LIB_ConfigGravarValor(handle, sessao, chave, valor) {
    return this.getAcbrlib().CNPJ_ConfigGravarValor(handle, sessao, chave, valor);
  }

  LIB_ConfigImportar(handle, arqConfig) {
    return this.getAcbrlib().CNPJ_ConfigImportar(handle, arqConfig);
  }

  LIB_ConfigExportar(handle, configuracoes, refTamanho) {
    return this.getAcbrlib().CNPJ_ConfigExportar(handle, configuracoes, refTamanho);
  }

  LIB_OpenSSLInfo(handle, configuracoes, refTamanho) {
    return this.getAcbrlib().CNPJ_OpenSSLInfo(handle, configuracoes, refTamanho);
  }

  consultar(cnpj) {
    const acbrBuffer = new ACBrBuffer(TAMANHO_PADRAO);
    const status = this.getAcbrlib().CNPJ_Consultar(
      this.getHandle(),
      cnpj,
      acbrBuffer.getBuffer(),
      acbrBuffer.getRefTamanhoBuffer()
    );

    this._checkResult(status);
    return this._processaResult(acbrBuffer);
  }
}

export default ACBrLibConsultaCNPJMT;
