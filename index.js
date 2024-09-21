require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { downloadPdf } = require("./downloadPdf");
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 4000;

// Enable CORS for requests from specific origins
app.use(cors({
  origin: ["http://localhost:3000", "https://qweek.vercel.app", "https://make-pdf.onrender.com"], // Allow specific origins
  methods: "GET,POST", // Allow specific methods
  credentials: true // Allow credentials (cookies)
}));

app.use(cookieParser());
app.use(express.json()); // Parse JSON bodies

// Token verification middleware
app.use(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).send({ success: false, message: 'Missing or invalid token' });
    }
    const token = authHeader.split(" ")[1];
    const tokenValid = jwt.verify(token, process.env.TOKEN_SECRET);

    if (!tokenValid) {
      return res.status(401).send({ success: false, message: 'Invalid token' });
    }

    next(); // Pass control to the next middleware or route handler
  } catch (error) {
    return res.status(401).send({ success: false, message: 'Token verification failed' });
  }
});

// Route for generating PDFs
app.post('/resume', async (req, res) => {
  try {
    const { url, selectedFont, size, isDarkMode } = req.body;
    const result = await downloadPdf({ url, selectedFont, size, isDarkMode });
    res.send(result);
  } catch (error) {
    res.status(500).send({ success: false, message: 'Error generating PDF' });
  }
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
