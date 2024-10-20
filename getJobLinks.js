require("dotenv").config();
const puppeteer = require("puppeteer");

// Function to add sleep

const getJobLinks = async ({ url }) => {
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
      headless: process.env.NODE_ENV !== 'production' && false
    });

    const page = await browser.newPage();
    console.log("Navigating to URL...");
    await page.goto(url, { waitUntil: "networkidle0", timeout: 0 });

    // Get job links
    const jobLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('#mosaic-jobResults li'))
          .map(job => {
            const link = job.querySelector(".jobTitle > a")?.getAttribute('href') || '';
            return link ? `https://ng.indeed.com${link}` : null; // Return the complete link or null
          })
          .filter(Boolean) // Filter out any null entries
          .slice(0, 5); // Limit the result to the first 5 links
      });
      

    // Fetch text content from each job link
    const jobContents = [];
    for (const link of jobLinks) {
      const jobPage = await browser.newPage();
      console.log(`Navigating to job link: ${link}...`);
      await jobPage.goto(link, { waitUntil: "networkidle0", timeout: 0 });

      // Extract text content from the job page
      const text = await jobPage.evaluate(() => {
        return document.body.innerText; // Get all text from the body
      });

      jobContents.push({text, link}); // Store both the link and its text content
      await jobPage.close(); // Close the job page after extracting text
    }

    return {
      success: true,
      message: null,
      data: jobContents // Return an array of objects containing links and their respective text content
    };
  } 
  catch (err) {
    console.error("Error generating PDF:", err);
    return { success: false, message: err.message };
  } 
  finally {
    if (browser) {
      console.log("Closing browser...");
      await browser.close();
    }
  }
};

module.exports = { getJobLinks };
