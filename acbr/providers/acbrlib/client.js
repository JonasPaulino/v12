class AcbrLibNotConfiguredError extends Error {
  constructor(message = "ACBrLib não configurada neste ambiente.") {
    super(message);
    this.name = "AcbrLibNotConfiguredError";
    this.code = "ACBRLIB_NOT_CONFIGURED";
  }
}

class AcbrLibNotImplementedError extends Error {
  constructor(message = "Integração ACBrLib ainda não implementada.") {
    super(message);
    this.name = "AcbrLibNotImplementedError";
    this.code = "ACBRLIB_NOT_IMPLEMENTED";
  }
}

class AcbrLibProvider {
  static ensureConfigured() {
    if (String(process.env.ACBRLIB_ENABLED || "").toLowerCase() !== "true") {
      throw new AcbrLibNotConfiguredError();
    }
  }

  static async emitirNfe(_payload) {
    this.ensureConfigured();
    throw new AcbrLibNotImplementedError();
  }

  static async consultarStatus(_payload) {
    this.ensureConfigured();
    throw new AcbrLibNotImplementedError();
  }

  static async cancelarNfe(_payload) {
    this.ensureConfigured();
    throw new AcbrLibNotImplementedError();
  }
}

export {
  AcbrLibProvider,
  AcbrLibNotConfiguredError,
  AcbrLibNotImplementedError,
};
