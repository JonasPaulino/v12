export const emitFileAsBase64 = (file, base64Only = true) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      if (base64Only) {
        const [, base64 = ""] = result.split(",");
        resolve(base64);
        return;
      }

      resolve(result);
    };

    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsText(file);
  });
