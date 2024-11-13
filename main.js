const puppeteer = require("puppeteer");
const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const cors = require("cors");
const { generateThumbnail } = require("./utils");

//NOTE: Constants
const PORT = process.env.PORT || 8000;

//NOTE: Initialize Express app
const app = express();

// app.use((req, res, next) => {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cors());

//NOTE: Route handlers
app.get("/create_thumbnail", async (req, res) => {
  const { inPath, outPath } = req.query;
  generateThumbnail(inPath, outPath)
    .then(() => {
      console.log("ok");
      res.send('ok')
    })
    .catch((err) => {
      console.log(err);
      res.send('error')
    });
});

//NOTE: Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

//NOTE: Handle process termination
process.on("SIGTERM", () => {
  console.log("Received SIGTERM. Performing cleanup...");
  process.exit(0);
});
