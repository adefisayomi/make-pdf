require("dotenv").config();
const puppeteer = require("puppeteer");

// Function to add sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const downloadPdf = async ({ url, selectedFont, size, isDarkMode, textColor, bgColor }) => {
  let browser;
  try {
    console.log("Launching browser...");
    browser = await puppeteer.launch({
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
        "--start-fullscreen"
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    console.log("Navigating to URL...");

    const { width: screenWidth, height: screenHeight } = await page.evaluate(() => ({
      width: screen.width,
      height: screen.height,
    }));

    await page.setViewport({
      width: screenWidth,
      height: screenHeight,
      deviceScaleFactor: 1,
    });

    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

    // Apply dark mode if necessary
    // if (isDarkMode) {
    //   await page.evaluate(() => document.body.classList.add("dark"));
    // } else {
    //   await page.evaluate(() => document.body.classList.remove("dark"));
    // }

    // Apply selected font if provided
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

    // Ensure layout is complete and content is fully loaded
    await sleep(3000); // Allow extra time for layout
    await page.waitForSelector("#resume_container", { visible: true });

    // Force a layout recalculation by scrolling the page
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });

    // Add custom CSS for proper layout and no overlap
    await page.evaluate((textColor, bgColor) => {
      const style = document.createElement('style');
      const container = document.querySelector("#resume_container");
      const rect = container.getBoundingClientRect();
      style.innerHTML = `
        #resume_container {
          width: 100%;
          position: relative;
          height: ${Math.ceil(rect.height)}px;
          background: transparent;
          color: ${textColor || 'inherit'};
          border-color: ${textColor || 'inherit'};
          font-weight: inherit; /* Inherit font-weight */
        }
        body {
          margin: 0;
          padding: 0;
          height: ${Math.ceil(rect.height)}px;
          background: ${bgColor || 'inherit'};
          color: ${textColor || 'inherit'};
          font-weight: inherit; /* Inherit font-weight */
        }
      `;
      document.head.appendChild(style);
    }, textColor, bgColor);
    

    console.log("Generating PDF...");
    const pdfBuffer = await page.pdf({
      printBackground: true, // Print background color/images
      format: size || "A4", // Default to A4 paper size
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
      // preferCSSPageSize: true, // Ensure page size respects CSS settings
    });

    const buffer = Buffer.from(pdfBuffer);

    console.log("PDF generated successfully.");
    return { success: true, message: null, data: buffer };
  } catch (err) {
    console.error("Error generating PDF:", err);
    return { success: false, message: err.message };
  } finally {
    if (browser) {
      console.log("Closing browser...");
      await browser.close();
    }
  }
};

module.exports = { downloadPdf };
