require("dotenv").config();
const puppeteer = require("puppeteer");

// Convert millimeters to pixels
const mmToPx = (mm) => mm * 3.7795275591; // 1 mm = 3.7795275591 px

// Size mapping
const pageSizeMap = {
  A1: { width: 594, height: 841 },
  A2: { width: 420, height: 594 },
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  A6: { width: 105, height: 148 },
  Letter: { width: 216, height: 279 },
  Legal: { width: 216, height: 356 },
};

// Function to add sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadPdf = async ({ url, selectedFont, size, isDarkMode }) => {
  let browser;
  try {
    console.log("Launching browser...");
    const browser = await puppeteer.launch({
        args: [
          "--disable-setuid-sandbox",
          "--no-sandbox",
          "--single-process",
          "--no-zygote",
        ],
        executablePath:
          process.env.NODE_ENV === "production"
            ? process.env.PUPPETEER_EXECUTABLE_PATH
            : puppeteer.executablePath(),
      });


    const page = await browser.newPage();
    console.log("Navigating to URL...");
    
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

    if (isDarkMode) {
      await page.evaluate(() => document.body.classList.add("dark"));
    } else {
      await page.evaluate(() => document.body.classList.remove("dark"));
    }

    if (selectedFont) {
      await page.evaluate(async (font) => {
        const fontLink = document.createElement("link");
        fontLink.rel = "stylesheet";
        fontLink.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s/g, "+")}&display=swap`;
        document.head.appendChild(fontLink);

        const fontStyle = document.createElement("style");
        fontStyle.textContent = `#resume_container { font-family: '${font}', sans-serif !important; }`;
        document.head.appendChild(fontStyle);

        await document.fonts.load(`1em ${font}`);
        await document.fonts.ready;
      }, selectedFont);
    }

    console.log("Waiting for font rendering...");
    await sleep(2000);

    console.log("Getting bounding box...");
    const boundingBox = await page.evaluate(() => {
      const element = document.querySelector("#resume_container");
      if (!element) return null;
      const { offsetWidth, offsetHeight } = element;
      return { width: offsetWidth, height: offsetHeight };
    });

    if (!boundingBox) {
      throw new Error("Element with id #resume_container not found");
    }

    const sizeDimensions = size ? pageSizeMap[size] : null;
    const width = sizeDimensions ? mmToPx(sizeDimensions.width) : boundingBox.width;
    const height = sizeDimensions ? mmToPx(sizeDimensions.height) : boundingBox.height;

    console.log("Generating PDF...");
    const pdfBuffer = await page.pdf({
      printBackground: isDarkMode, // Prints background (dark mode) if set
      format: size || 'A4', // Must be a valid PaperFormat type, default to A4
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      preferCSSPageSize: true, // Respect any CSS-defined page sizes
    });
    const buffer = Buffer.from(pdfBuffer)

    console.log("PDF generated successfully.");
    return { success: true, message: null, data: buffer };
  } catch (err) {
    console.error("Error generating PDF:", err);
    return { success: false, message: err.message }
  } finally {
    if (browser) {
      console.log("Closing browser...");
      await browser.close();
    }
  }
};


module.exports = { downloadPdf };