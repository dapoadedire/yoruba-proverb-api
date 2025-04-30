const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const geoip = require("geoip-lite");
require("dotenv").config();
const { notifyUsage } = require("./utils/notification");

const app = express();
const PORT = process.env.PORT || 3000;

// Load proverbs JSON
const filePath = path.join(__dirname, "../assets/proverbs.json");
try {
  const { proverbs } = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Basic middleware
  app.use(express.json());
  app.use(cors()); // Enable CORS for all routes
  app.use(morgan("dev")); // HTTP request logger

  // API routes
  app.get("/", (req, res) => {
    const userId = req.ip;
    const username = req.get("User-Agent") || "Unknown";

    // Get geolocation data from IP
    const geo = geoip.lookup(userId);

    // Notify about API usage asynchronously - don't wait for the result
    notifyUsage(userId, username, "GET /", geo);

    res.json({ message: "Welcome to the Yoruba Proverbs API!" });
  });

  // Random proverb route
  app.get("/proverb", (req, res) => {
    const userId = req.ip;
    const username = req.get("User-Agent") || "Unknown";

    // Get geolocation data from IP
    const geo = geoip.lookup(userId);

    // Notify about API usage asynchronously
    notifyUsage(userId, username, "GET /proverb", geo);

    const random = proverbs[Math.floor(Math.random() * proverbs.length)];
    res.json(random);
  });

  // Get proverb by ID
  app.get("/proverb/:id", (req, res) => {
    const userId = req.ip;
    const username = req.get("User-Agent") || "Unknown";
    const id = parseInt(req.params.id);

    // Get geolocation data from IP
    const geo = geoip.lookup(userId);

    // Notify about API usage asynchronously
    notifyUsage(userId, username, `GET /proverb/${id}`, geo);

    const proverb = proverbs.find((p) => p.id === id);

    if (!proverb) {
      return res.status(404).json({ error: "Proverb not found" });
    }

    res.json(proverb);
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`Yoruba Proverbs API running on port ${PORT}`);
  });
} catch (error) {
  console.error("Failed to start server:", error.message);
  process.exit(1);
}
