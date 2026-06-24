import ConsultaCnpjProvider from "./consultaCnpjProvider.js";

const main = async () => {
  const payload = JSON.parse(process.argv[2] || "{}");
  const data = await ConsultaCnpjProvider.consultar({
    cnpj: payload.cnpj,
    scopeKey: payload.scopeKey,
  });

  process.stdout.write(`${JSON.stringify(data)}\n`);
};

main().catch((error) => {
  process.stderr.write(`${error?.message || String(error)}\n`);
  process.exit(1);
});
