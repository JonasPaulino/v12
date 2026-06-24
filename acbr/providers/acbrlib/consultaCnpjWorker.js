import ConsultaCnpjProvider from "./consultaCnpjProvider.js";

process.on("uncaughtException", (error) => {
  process.stderr.write(`[worker:uncaughtException] ${error?.stack || error?.message || String(error)}\n`);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  process.stderr.write(`[worker:unhandledRejection] ${reason?.stack || reason?.message || String(reason)}\n`);
  process.exit(1);
});

const main = async () => {
  const payload = JSON.parse(process.argv[2] || "{}");
  const data = await ConsultaCnpjProvider.consultar({
    cnpj: payload.cnpj,
    scopeKey: payload.scopeKey,
  });

  process.stdout.write(`${JSON.stringify(data)}\n`);
};

main().catch((error) => {
  process.stderr.write(`[worker:catch] ${error?.stack || error?.message || String(error)}\n`);
  process.exit(1);
});
