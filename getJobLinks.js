require("dotenv").config();
const puppeteer = require("puppeteer");

// Helper function to add a delay (sleep)
const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

const getJobLinks = async ({ url }) => {
  let browser;
  try {
    console.log("Launching browser...");
    browser = await puppeteer.launch({
      headless: false,
      args: [
        "--disable-setuid-sandbox",
        "--no-sandbox",
        "--single-process",
        "--no-zygote",
        "--disable-gpu",
        "--headless=new", // or "--headless=chrome" if this flag doesn't work
        "--start-fullscreen"
      ],
      executablePath:
        process.env.NODE_ENV === "production"
          ? process.env.PUPPETEER_EXECUTABLE_PATH
          : puppeteer.executablePath(),
    });

    const page = await browser.newPage();
    console.log("Navigating to URL...");
    await page.goto(url, { waitUntil: "networkidle0", timeout: 0 });

    // Get job links
    const baseUrl = new URL(url); // Create a new URL object from the job link
    const linkUrl = `${baseUrl.protocol}//${baseUrl.hostname}`;

    const jobLinks = await page.evaluate((linkUrl) => {
      return Array.from(document.querySelectorAll('#mosaic-jobResults li'))
        .map(job => {
          const link = job.querySelector(".jobTitle > a")?.getAttribute('href') || '';
          return link ? `${linkUrl}${link}` : null; // Return the complete link or null
        })
        .filter(Boolean) // Filter out any null entries
        .slice(0, 18); // Limit the result to the first 18 links
    }, linkUrl); // Pass linkUrl into the evaluate function as an argument

    // Fetch text content from each job link
    const jobContents = [];
    for (const link of jobLinks) {
      const jobPage = await browser.newPage();
      console.log(`Navigating to job link: ${link}`);

      await jobPage.goto(link, { waitUntil: "networkidle0", timeout: 0 });

      // Extract text content from the job page
      const text = await jobPage.evaluate(() => document.body.innerText);
      const logo = await jobPage.evaluate(() => document.querySelector("img.jobsearch-JobInfoHeader-logo")?.getAttribute('src') || null);

      jobContents.push({ text, link, logo }); // Store both the link, text content, and logo

      await jobPage.close(); // Close the job page after extracting text
      await sleep(500); // Adding delay to prevent overload (optional, adjust as needed)
    }

    return {
      success: true,
      message: null,
      data: jobContents // Return an array of objects containing links, text content, and logo
    };
  } catch (err) {
    console.error({ error: err.message });
    return { success: false, message: err.message };
  } finally {
    if (browser) {
      console.log("Closing browser...");
      await browser.close();
    }
  }
};

module.exports = { getJobLinks };
