const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");

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
    res.json({ message: "Welcome to the Yoruba Proverbs API!" });
  });

  // Random proverb route
  app.get("/proverb", (req, res) => {
    const random = proverbs[Math.floor(Math.random() * proverbs.length)];
    res.json(random);
  });

  // Get proverb by ID
  app.get("/proverb/:id", (req, res) => {
    const id = parseInt(req.params.id);
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
