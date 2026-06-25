import puppeteer from "puppeteer";

let browserInstance = null;

export async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }

  const launchOptions = {
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  browserInstance = await puppeteer.launch(launchOptions);
  return browserInstance;
}

export async function renderHtmlToPdf(html, options = {}) {
  if (!html) {
    throw new Error("HTML vazio não pode ser convertido em PDF.");
  }

  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "load",
    timeout: 0,
  });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "8mm",
      right: "8mm",
      bottom: "8mm",
      left: "8mm",
    },
    ...options,
  });

  await page.close();
  return pdfBuffer;
}

setInterval(async () => {
  if (!browserInstance || !browserInstance.isConnected()) return;

  try {
    const pages = await browserInstance.pages();
    if (pages.length > 1) {
      for (let index = 1; index < pages.length; index += 1) {
        await pages[index].close().catch(() => {});
      }
    }
  } catch (error) {
    console.error("[reports:pdf] Falha ao limpar abas:", error);
  }
}, 1000 * 60 * 10);
