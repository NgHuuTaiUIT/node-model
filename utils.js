const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs/promises");

const TIME_LIMIT = 1000 * 60 * 5; //5 minutes
const PORT = process.env.PORT || 8000;

function renderHTML(modelPath) {
  const url = `http://localhost:${PORT}/${modelPath}`;
  return `<!DOCTYPE html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <meta
                  name="viewport"
                  content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0"
                />
                <link rel="shortcut icon" href="#" />
                <script
                  type="module"
                  src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
                ></script>
                <style>
                  body {
                    background-color: #eee;
                    overflow: hidden;
                  }
                </style>
              </head>

              <body>
                <model-viewer
                  id="model"
                  src="${url}"
                  ar
                  shadow-intensity="1"
                  touch-action="pan-y"
                  style="width: 100svw; height: 100svh; position: relative"
                ></model-viewer>
              </body>

              <script>
                const model = document.querySelector("#model");
                model.addEventListener("load", () => {
                  model.setAttribute("loaded", "true");
                });
              </script>
            </html>
`;
}

async function ensureThumbnailsDir(outPath) {
  try {
    await fs.access(outPath);
  } catch {
    await fs.mkdir(outPath, { recursive: true });
  }
}

async function generateThumbnail(inPath, outPath) {
  const start = performance.now();
  // try {
  //   await fs.access(inPath);
  // } catch {
  //   throw new Error(`File not found: ${inPath}`);
  // }

  let browser;
  try {
    //NOTE: Ensure thumbnails directory exists
    await ensureThumbnailsDir(path.dirname(outPath));

    //NOTE: Launch browser with optimized settings
    browser = await puppeteer.launch({
      headless: "new", // Using new headless mode
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        // '--disable-gpu',
        "--disable-extensions"
      ],
      ...(process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : {})
    });

    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      Connection: "keep-alive"
      //NOTE: Add any other headers you need
    });

    //NOTE: Optimize page performance
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const resourceType = request.resourceType();
      if (
        resourceType === "image" ||
        resourceType === "stylesheet" ||
        resourceType === "font"
      ) {
        request.abort();
      } else {
        request.continue();
      }
    });

    //NOTE: Set content to page
    // const pageUrl = `http://localhost:${PORT}/web-worker?path=${inPath}`;
    // await page.goto(pageUrl, {
    //   waitUntil: ["load", "networkidle0"],
    //   timeout: TIME_LIMIT
    // });

    //NOTE: Set content into page
    await page.setContent(renderHTML(inPath), {
      waitUntil: ["load", "networkidle0"],
      timeout: TIME_LIMIT
    });

    //NOTE: Wait for model to load
    await page.waitForFunction(
      'document.querySelector("#model").hasAttribute("loaded")',
      { timeout: TIME_LIMIT }
    );

    //NOTE: Take screenshot with optimized settings
    await page.screenshot({
      path: outPath,
      type: "jpeg",
      quality: 80,
      optimizeForSpeed: true
    });
    const end = performance.now();
    console.log(
      `Saved in ${outPath}, Time execute:  ${(end - start).toFixed(2)}ms`
    );
  } catch (error) {
    throw new Error("Error creating thumbnail");
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { generateThumbnail };
