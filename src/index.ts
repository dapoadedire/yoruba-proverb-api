import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { Proverb, ProverbsData } from "./types/proverb";

dotenv.config();

const filePath = path.join(__dirname, "../assets/proverbs.json");

let proverbs: Proverb[] = [];

try {
  const raw = fs.readFileSync(filePath, "utf-8");
  const data: ProverbsData = JSON.parse(raw);
  proverbs = data.proverbs;
} catch (err) {
  console.error("Failed to read proverbs:", err);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to the Yoruba Proverbs API!" });
});

app.get("/proverb", (req: Request, res: Response) => {
  const random = proverbs[Math.floor(Math.random() * proverbs.length)];
  res.json(random);
});

app.get("/proverb/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const match = proverbs.find((p) => p.id === id);
  if (!match) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(match);
});

app.listen(PORT, () => {
  console.log(`Yoruba Proverbs API running on port ${PORT}`);
});
