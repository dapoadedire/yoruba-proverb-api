// External imports
import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { Resend } from "resend";
import rateLimit from "express-rate-limit";

// Internal imports
import { Proverb, ProverbsData } from "./types/proverb";
import { SubscribeSchema } from "./types/schema";

// Config
dotenv.config();
const PORT = process.env.PORT || 3000;
const resendApiKey = process.env.RESEND_API_KEY;
const audienceId = process.env.AUDIENCE_ID;

// Init app
const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Load proverbs data
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

// Init Resend
const resend = new Resend(resendApiKey);

// Rate limiter middleware for the subscribe endpoint
const subscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: "Too many subscription attempts, please try again after 15 minutes",
  },
});

// Routes
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Welcome to the Yoruba Proverbs API!" });
});

app.get("/proverb", (_req: Request, res: Response) => {
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

app.post(
  "/subscribe",
  subscribeLimiter,
  async (req: Request, res: Response) => {
    const result = SubscribeSchema.safeParse(req.body);

    if (!result.success) {
      // Extract validation errors and format them in a more user-friendly way
      const formattedErrors: Record<string, string> = {};
      const errorFormat = result.error.format();

      // Process each field with errors
      for (const field in errorFormat) {
        if (field !== "_errors") {
          // TypeScript safe way to access nested error messages
          const fieldErrors = errorFormat[field as keyof typeof errorFormat];

          if (typeof fieldErrors === "object" && "_errors" in fieldErrors) {
            const errors = fieldErrors._errors;
            if (errors.length > 0) {
              formattedErrors[field] = errors[0]; // Take first error message for each field
            }
          }
        }
      }

      res.status(400).json({
        error: "Invalid input",
        details: formattedErrors,
      });
      return;
    }

    const { email, name } = result.data;

    try {
      await resend.contacts.create({
        email,
        firstName: name,
        unsubscribed: false,
        audienceId: audienceId ?? "",
      });

      res.status(201).json({ message: "Subscription successful" });
    } catch (err) {
      console.error("Subscribe error:", err);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`Yoruba Proverbs API running on port ${PORT}`);
});
