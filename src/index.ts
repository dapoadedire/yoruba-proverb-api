// External imports
import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { Resend } from "resend";
import rateLimit from "express-rate-limit";
import cron from "node-cron";

// Internal imports
import { Proverb, ProverbsData } from "./types/proverb";
import { SubscribeSchema } from "./types/schema";
import {
  sendWelcomeEmail,
  sendProverbEmail,
  sendDailyProverbEmail,
  sendBatchEmails,
  unsubscribeUser,
  createWeeklyBroadcast,
  sendBroadcast,
} from "./utils/email";

// Config
dotenv.config();
const PORT = process.env.PORT || 3000;
const resendApiKey = process.env.RESEND_API_KEY;
const audienceId = process.env.AUDIENCE_ID;
const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${PORT}`;

// Init app
const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// Load proverbs data
const filePath = path.join(__dirname, "assets/proverbs.json");
let proverbs: Proverb[] = [];

try {
  const raw = fs.readFileSync(filePath, "utf-8");
  const data: ProverbsData = JSON.parse(raw);
  proverbs = data.proverbs;
} catch (err) {
  console.error("Failed to read proverbs:", err);
  process.exit(1);
}

// Init Resend with validation
if (!resendApiKey) {
  console.error("CRITICAL ERROR: Resend API key is missing or invalid");
  process.exit(1);
}

if (!audienceId) {
  console.error(
    "WARNING: Audience ID is missing - contact operations will fail"
  );
}

console.log(
  "Initializing Resend client with API key:",
  resendApiKey?.substring(0, 8) + "..."
);
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

// Define or extend the type for the response from resend.contacts.get
interface ContactResponse {
  email: string;
  firstName?: string;
  lastName?: string;
  unsubscribed: boolean;
  // Add other properties if needed
}

// Fallback type definition for GetContactResponse
interface GetContactResponse {
  email?: string;
  firstName?: string;
  lastName?: string;
  unsubscribed?: boolean;
  // Add other properties if needed
}

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
      // Check if the email already exists using resend.contacts.get
      // Cast the response from resend.contacts.get to the ContactResponse type
      // Safely map the response to the ContactResponse type

      const rawContact = await resend.contacts.get({
        email,
        audienceId: audienceId ?? "",
      });

      console.log("Raw contact response:", rawContact);

      // Check if the contact exists by examining the response structure
      // A successful response has data, a failed lookup has error with statusCode 404
      const existingContact: ContactResponse | null = rawContact.data
        ? {
            email: rawContact.data.email ?? "",
            firstName: rawContact.data.first_name, // Note the snake_case in API response
            lastName: rawContact.data.last_name, // Note the snake_case in API response
            unsubscribed: rawContact.data.unsubscribed ?? false,
          }
        : null;

      if (existingContact) {
        if (existingContact.unsubscribed) {
          // Resubscribe the user
          await resend.contacts.update({
            email,
            audienceId: audienceId ?? "",
            unsubscribed: false,
          });
          res.status(200).json({ message: "Resubscribed successfully" });
        } else {
          res.status(200).json({ error: "This email is already subscribed." });
        }
        return;
      }

      // Only create if contact doesn't exist
      await resend.contacts.create({
        email,
        firstName: name,
        unsubscribed: false,
        audienceId: audienceId ?? "",
      });

      // Get a random proverb for the welcome email
      const randomProverb =
        proverbs[Math.floor(Math.random() * proverbs.length)];

      // Send welcome email and capture the result
      const emailSent = await sendWelcomeEmail(email, name, randomProverb);
      console.log("Welcome email send result:", emailSent);

      if (!emailSent) {
        console.error(`Failed to send welcome email to: ${email}`);
        // Still return success but with a warning
        res.status(201).json({
          message:
            "Subscription successful, but welcome email could not be sent. You will receive future emails.",
        });
      } else {
        res.status(201).json({ message: "Subscription successful" });
      }
    } catch (err) {
      console.error("Subscribe error:", err);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  }
);

// Route for unsubscribing from emails
app.get("/unsubscribe", async (req: Request, res: Response) => {
  const email = req.query.email as string;

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  try {
    // Use the dedicated utility function to unsubscribe the user
    const success = await unsubscribeUser(email);

    if (!success) {
      throw new Error("Failed to unsubscribe");
    }

    // Respond with a simple HTML page
    res.send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 40px;">
          <h1>Unsubscribed Successfully</h1>
          <p>You have been unsubscribed from the Yoruba Proverbs email list.</p>
          <p>We're sorry to see you go!</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Unsubscribe error:", err);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// Admin route for creating a weekly proverb broadcast
app.post("/admin/create-broadcast", async (req: Request, res: Response) => {
  // Authenticate request
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Get a random proverb or use the one from request body
    const proverb = proverbs[Math.floor(Math.random() * proverbs.length)];

    // Create the broadcast
    const broadcastId = await createWeeklyBroadcast(proverb);

    if (!broadcastId) {
      res.status(500).json({ error: "Failed to create broadcast" });
      return;
    }

    res.json({
      message: "Weekly proverb broadcast created successfully",
      broadcastId,
    });
  } catch (err) {
    console.error("Error creating broadcast:", err);
    res.status(500).json({ error: "Failed to create broadcast" });
  }
});

// Admin route for sending a created broadcast
app.post("/admin/send-broadcast/:id", async (req: Request, res: Response) => {
  // Authenticate request
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const broadcastId = req.params.id;
  const scheduledAt = req.body?.scheduledAt; // Optional: 'in 1 min', '2023-04-01T12:00:00Z'

  try {
    const success = await sendBroadcast(broadcastId, scheduledAt);

    if (!success) {
      res.status(500).json({ error: "Failed to send broadcast" });
      return;
    }

    res.json({
      message: scheduledAt
        ? `Broadcast scheduled successfully for ${scheduledAt}`
        : "Broadcast sent successfully",
      broadcastId,
    });
  } catch (err) {
    console.error("Error sending broadcast:", err);
    res.status(500).json({ error: "Failed to send broadcast" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Yoruba Proverbs API running on port ${PORT}`);


  // Set up the scheduled tasks after server starts
  setupScheduledTasks();
});

// Function to verify the Resend API key is val

// Setup scheduled tasks for automated emails
function setupScheduledTasks() {
  // Schedule weekly broadcast every Saturday at 10 AM
  // Cron format: minute hour day-of-month month day-of-week
  cron.schedule(
    "0 11 * * 6",
    async () => {
      console.log("Running scheduled weekly broadcast - Saturday 10 AM");
      try {
        // Get a random proverb for the weekly broadcast
        const randomProverb =
          proverbs[Math.floor(Math.random() * proverbs.length)];

        // Create and send the broadcast immediately
        const broadcastId = await createWeeklyBroadcast(randomProverb);

        if (broadcastId) {
          await sendBroadcast(broadcastId);
          console.log(
            `Weekly broadcast created and sent successfully at ${new Date().toISOString()}`
          );
        } else {
          console.error("Failed to create weekly broadcast");
        }
      } catch (error) {
        console.error("Error in weekly scheduled task:", error);
      }
    },
    {
      timezone: "Africa/Lagos", // Set to appropriate timezone
    }
  );

  // Schedule daily morning proverb to specific email address (11:30 AM Lagos time)
  cron.schedule(
    "0 10 * * *",
    async () => {
      console.log("Running scheduled daily proverb email");
      try {
        const email = "adedireadedapo19@gmail.com";
        const name = "Adedapo"; // Default name for the daily email

        // Get a random proverb for the daily email
        const randomProverb =
          proverbs[Math.floor(Math.random() * proverbs.length)];

        // Send the daily email
        const success = await sendDailyProverbEmail(email, name, randomProverb);

        if (success) {
          console.log(
            `Daily proverb email sent successfully to ${email} at ${new Date().toISOString()}`
          );
        } else {
          console.error(`Failed to send daily proverb email to ${email}`);
        }
      } catch (error) {
        console.error("Error in daily proverb scheduled task:", error);
      }
    },
    {
      timezone: "Africa/Lagos", // Set to appropriate timezone
    }
  );

  console.log("Scheduled tasks setup completed.");
}
