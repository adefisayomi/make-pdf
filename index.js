require("dotenv").config(); // Correct placement
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const { downloadPdf } = require("./downloadPdf");
const schedule = require('node-schedule');

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for requests from specific origins
app.use(cors({
  origin: ["http://localhost:3000", "https://qweek.vercel.app", "https://make-pdf.onrender.com", 'https://www.qweek-resume.com.ng'], // Allow specific origins
  methods: ["GET", "POST", "PUT"], // Allow specific methods
  credentials: true, // Allow credentials (cookies)
  allowedHeaders: ["Content-Type", "Authorization"], // Ensure headers are allowed
}));

app.use(cookieParser());
app.use(express.json()); // Parse JSON bodies

app.get('/', (req, res) => {
  res.send('Scheduler is running...');
});

// Schedule a job to run every 5 seconds using node-schedule
const job = schedule.scheduleJob('*/14 * * * *', function() {
  console.log('Job is running every 14 minutes...');
  // Add your task logic here (e.g., calling an API, database cleanup, etc.)
});

// Token verification middleware
app.use(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: 'Missing or invalid token' });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.TOKEN_SECRET);

    if (!decodedToken) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Optionally attach user info from the token to request object
    req.user = decodedToken;
    next(); // Pass control to the next middleware or route handler
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message, data: null });
  }
});
``
// Route for generating PDFs
app.post('/resume', async (req, res) => {
  try {
    const { url, selectedFont, textColor, bgColor } = req.body;
    const result = await downloadPdf({ url, selectedFont, textColor, bgColor });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, data: null });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
