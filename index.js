const express = require("express");
const { scrapeLogic } = require("./scrapeLogic");
const app = express();

const PORT = process.env.PORT || 4000;

app.get("/scrape", async (req, res) => {
  res.send( await scrapeLogic() )
});

app.get("/", (req, res) => {
  res.send("Render Puppeteer server is up and running!");
});

app.post('/resume', async (req, res) => {
  const { url, selectedFont, size, isDarkMode } = req.body;
  const result = await downloadPdf({ url, selectedFont, size, isDarkMode })
  res.send(result)
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
