import { createRequire } from "module";

const require = createRequire(import.meta.url);
const koffi = require("koffi");

import ACBrLibConsultaCNPJBridge from "./consultaCnpjBridge.js";

const TAMANHO_PADRAO = 16 * 1024;

const decodeCString = (buffer, fallbackSize) => {
  const nullIndex = buffer.indexOf(0);
  const endIndex = nullIndex >= 0 ? nullIndex : Math.min(fallbackSize, buffer.length);
  return buffer.toString("utf8", 0, endIndex);
};

class ACBrLibConsultaCNPJ {
  constructor(libraryPath, arquivoConfig, chaveCrypt) {
    this.acbrlib = new ACBrLibConsultaCNPJBridge(libraryPath).getAcbrNativeLib();
    this.arquivoConfig = arquivoConfig;
    this.chaveCrypt = chaveCrypt;
    this.initialized = false;
    this.handleRef = null;
    this.handle = 0;
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

  _callWithBuffer(callback, initialSize = TAMANHO_PADRAO) {
    let size = Number.isFinite(initialSize) && initialSize > 0 ? Math.trunc(initialSize) : TAMANHO_PADRAO;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const buffer = Buffer.alloc(size);
      const bufferSize = koffi.alloc("long", 1);

      try {
        koffi.encode(bufferSize, "long", size);
        const status = callback(buffer, bufferSize);
        this._checkResult(status);

        const finalSize = Number(koffi.decode(bufferSize, "long")) || size;
        if (finalSize > buffer.length && attempt === 0) {
          size = finalSize + 1;
          continue;
        }

        return decodeCString(buffer, finalSize);
      } finally {
        koffi.free(bufferSize);
      }
    }

    throw new Error("Falha ao ler resposta da ACBrLibConsultaCNPJ.");
  }

  inicializar() {
    this.handleRef = koffi.alloc("uintptr_t", 1);
    koffi.encode(this.handleRef, "uintptr_t", 0);

    try {
      const status = this.acbrlib.CNPJ_Inicializar(this.handleRef, this.arquivoConfig, this.chaveCrypt);
      if (status === 0) {
        this.handle = koffi.decode(this.handleRef, "uintptr_t");
        this.initialized = true;
      }
      this._checkResult(status);
      return status;
    } catch (error) {
      if (this.handleRef) {
        koffi.free(this.handleRef);
        this.handleRef = null;
      }
      throw error;
    }
  }

  finalizar() {
    if (!this.initialized) return 0;
    try {
      const status = this.acbrlib.CNPJ_Finalizar(this.handle);
      this.initialized = false;
      this.handle = 0;
      this._checkResult(status);
      return status;
    } finally {
      if (this.handleRef) {
        koffi.free(this.handleRef);
        this.handleRef = null;
      }
    }
  }

  ultimoRetorno() {
    return this._callWithBuffer((buffer, bufferSize) =>
      this.acbrlib.CNPJ_UltimoRetorno(this.handle, buffer, bufferSize)
    );
  }

  versao() {
    return this._callWithBuffer((buffer, bufferSize) =>
      this.acbrlib.CNPJ_Versao(this.handle, buffer, bufferSize)
    );
  }

  openSSLInfo() {
    return this._callWithBuffer((buffer, bufferSize) =>
      this.acbrlib.CNPJ_OpenSSLInfo(this.handle, buffer, bufferSize)
    );
  }

  configGravar() {
    const status = this.acbrlib.CNPJ_ConfigGravar(this.handle, this.arquivoConfig);
    this._checkResult(status);
    return status;
  }

  configGravarValor(sessao, chave, valor) {
    const status = this.acbrlib.CNPJ_ConfigGravarValor(this.handle, sessao, chave, valor);
    this._checkResult(status);
    return status;
  }

  consultar(cnpj) {
    return this._callWithBuffer((buffer, bufferSize) =>
      this.acbrlib.CNPJ_Consultar(this.handle, cnpj, buffer, bufferSize)
    );
  }
}

export default ACBrLibConsultaCNPJ;
