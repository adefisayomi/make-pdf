require("dotenv").config();
const puppeteer = require("puppeteer");

// Function to add sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const scrapeIndeed = async ({ url }) => {
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
    // 
    const result = [];

    // Extract job links and dates posted
    async function getAllJobLinks(page) {
        let allJobLinks = []; // To store all job links
      
        while (true) {
          // Get job links and the next page link on the current page
          const { jobLinks, nextPage } = await page.evaluate(() => {
            const jobLinks = Array.from(document.querySelectorAll('#mosaic-jobResults li')).map(job => {
              const link = job.querySelector(".jobTitle > a")?.getAttribute('href') || '';
              const datePosted = job.querySelector("[data-testid='myJobsStateDate']")?.textContent.trim() || null;
      
              return link ? { link: `https://ng.indeed.com${link}`, datePosted } : null;
            }).filter(Boolean); // Filter out any null entries
      
            const nextPage = document.querySelector("a[data-testid='pagination-page-next']")?.getAttribute('href') || '';
            
            return { jobLinks, nextPage };
          });
      
          // Append the current page's job links to the master list
          allJobLinks = allJobLinks.concat(jobLinks);
      
          // If there is no nextPage, break the loop
          if (!nextPage) break;
      
          // Navigate to the next page
          await page.goto(`https://ng.indeed.com${nextPage}`, { waitUntil: 'networkidle0', timeout: 0 });
        }
      
        return allJobLinks; // Return all collected job links
      }
      
      // Usage
      const jobLinks = await getAllJobLinks(page);
      
    
    // Iterate over job links and visit each page to extract job details
    if (jobLinks.length > 0) {
      for (const jobLink of jobLinks) {
        if (jobLink.link) {
          await page.goto(jobLink.link, { waitUntil: "networkidle0", timeout: 0 });
    
          const job = await page.evaluate((link, datePosted) => {
            const title = document.querySelector(".jobsearch-JobInfoHeader-title")?.textContent?.trim() || null;
            const companyName = document.querySelector("[data-testid='inlineHeader-companyName']")?.textContent?.trim() || null;
            const location = document.querySelector("[data-testid='inlineHeader-companyLocation']")?.textContent?.trim() || null;
            const jobType = document.querySelector("[data-testid='Full-time-tile']")?.textContent?.trim() || null;
            const salary = document.querySelector("#salaryInfoAndJobType")?.textContent?.trim() || null;
            const jobDescription = document.querySelector("#jobDescriptionText")?.textContent?.trim() || null;
            const logo = document.querySelector("img.jobsearch-JobInfoHeader-logo")?.getAttribute('src') || null;
            
            // Return all collected job details
            return { title, companyName, location, jobType, datePosted, link, jobDescription, logo, salary };
          }, jobLink.link, jobLink.datePosted);
    
          // Add the extracted job details to the result array
          result.push(job);
        }
      }
    }

    console.log(result)
    
    
  
    return ({
        success: true,
        message: null,
        data: result
    })
  } 
  catch (err) {
    console.error("Error :", err);
    return { success: false, message: err.message };
  } 
  finally {
    if (browser) {
      console.log("Closing browser...");
      await browser.close();
    }
  }
};

module.exports = { scrapeIndeed };
