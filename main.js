const puppeteer = require("puppeteer");
const express = require("express");
const path = require("path");
const fs = require("node:fs");
const app = express();
let port = 8000;

const main = () => {
  console.log("Running ....");
};
app.listen(port, main);
app.get("/", (req, res) => res.send("Hello"));
app.get("/getFile", (req, res) => {
  const fileName = req.query["name"];
  const options = {
    root: path.join(__dirname, "models")
  };
  res.sendFile(fileName, options);
});
app.get("/web-worker", (req, res) => {
  const url = req.query["url"];
  const localFileName = req.query["name"];
  fs.readFile(
    __dirname + "/index.html",
    { encoding: "utf8" },
    async function (error, html) {
      if (error) {
        throw error;
      }
      html = html.replace(
        "{url}",
        url || `http://localhost:8000/getFile?name=${localFileName}`
      );
      res.send(html);
    }
  );
});
app.get("/create_thumbnail", async function (request, response) {
  const start = performance.now();
  try {
    const browser = await puppeteer.launch({
      headless: true,
      // args: ["--no-sandbox", "--disable-gpu"]
      args: ["--no-sandbox"],
      ...(process.env.CHROME_PATH
        ? { executablePath: process.env.CHROME_PATH }
        : {})
    });
    const page = await browser.newPage();
    const url = request.query["url"] || "";
    const fileName = request.query["name"] || "";
    await page.goto(
      `http://localhost:8000/web-worker?name=${fileName}&url=${url}`,
      {
        waitUntil: ["load", "networkidle0"]
      }
    );
    await page.evaluate(
      `document.querySelector("#model").hasAttribute("loaded")`
    );

    await page.screenshot({
      path: `thumbnails/${fileName}.jpeg`,
      type: "jpeg",
      optimizeForSpeed: true
    });
    console.log("Saved " + fileName + " thumbnails folder");
    browser.close();
  } catch (error) {
    response.send("error");
  }
  const end = performance.now();
  console.log(
    `Time taken to execute create thumbnail function is ${end - start}ms.`
  );
  response.send("ok");
});
