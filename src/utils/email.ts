import fs from "fs";
import path from "path";
import { Resend } from "resend";
import { Proverb } from "../types/proverb";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY;
const resend = new Resend(resendApiKey);

// Function to read and compile an email template
function compileTemplate(
  templateName: string,
  data: Record<string, string>
): string {
  try {
    const templatePath = path.join(
      __dirname,
      "../templates",
      `${templateName}.html`
    );
    let content = fs.readFileSync(templatePath, "utf-8");

    // Replace template variables with actual data
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      content = content.replace(regex, value);
    });

    return content;
  } catch (error) {
    console.error(`Error compiling template ${templateName}:`, error);
    throw new Error(`Failed to compile email template: ${templateName}`);
  }
}

// Send welcome email to new subscribers
export async function sendWelcomeEmail(
  email: string,
  name: string,
  proverb: Proverb
): Promise<boolean> {
  try {
    const unsubscribeUrl = `${process.env.API_BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

    const htmlContent = compileTemplate("welcome", {
      name,
      proverb: proverb.proverb,
      translation: proverb.translation,
      wisdom: proverb.wisdom,
      unsubscribeUrl,
    });

    const fromEmail =
      process.env.EMAIL_FROM ||
      "Yoruba Proverbs <yorubaproverbs@dapoadedire.xyz>";

    // Use the direct emails.send method as specified
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Welcome to Yoruba Proverbs!",
      html: htmlContent,
    });

    if (error) {
      console.error("Error sending welcome email:", error);
      return false;
    }

    console.log("Welcome email sent successfully:", data?.id);
    return true;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return false;
  }
}

// Send weekly proverb email
export async function sendProverbEmail(
  email: string,
  name: string,
  proverb: Proverb
): Promise<boolean> {
  try {
    const unsubscribeUrl = `${process.env.API_BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}`;

    const htmlContent = compileTemplate("weekly-proverb", {
      name,
      proverb: proverb.proverb,
      translation: proverb.translation,
      wisdom: proverb.wisdom,
      unsubscribeUrl,
    });

    const { data, error } = await resend.emails.send({
      from:
        process.env.EMAIL_FROM ||
        "Yoruba Proverbs <proverbs@yourubaproverbs.com>",
      to: [email],
      subject: "Your Weekly Yoruba Proverb - Saturday Wisdom",
      html: htmlContent,
    });

    if (error) {
      console.error("Error sending proverb email:", error);
      return false;
    }

    console.log("Proverb email sent successfully:", data?.id);
    return true;
  } catch (error) {
    console.error("Error sending proverb email:", error);
    return false;
  }
}

// Send batch emails to all subscribers
export async function sendBatchEmails(
  contacts: Array<{ email: string; firstName: string }>,
  proverb: Proverb
): Promise<{ success: number; failed: number }> {
  let successCount = 0;
  let failedCount = 0;

  for (const contact of contacts) {
    const success = await sendProverbEmail(
      contact.email,
      contact.firstName || "Subscriber",
      proverb
    );

    if (success) {
      successCount++;
    } else {
      failedCount++;
    }

    // Add a small delay between emails to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return { success: successCount, failed: failedCount };
}

// Create a weekly proverb broadcast
export async function createWeeklyBroadcast(
  proverb: Proverb
): Promise<string | null> {
  try {
    const audienceId = process.env.AUDIENCE_ID;

    if (!audienceId) {
      console.error("Broadcast creation error: Audience ID is not configured");
      return null;
    }

    const fromEmail =
      process.env.EMAIL_FROM ||
      "Yoruba Proverbs <yorubaproverbs@dapoadedire.xyz>";

    // Create HTML content for broadcast
    const htmlContent = compileTemplate("weekly-proverb", {
      name: "{{{FIRST_NAME|Subscriber}}}",
      proverb: proverb.proverb,
      translation: proverb.translation,
      wisdom: proverb.wisdom,
      unsubscribeUrl: "{{{RESEND_UNSUBSCRIBE_URL}}}",
    });

    // Create the broadcast
    const { data, error } = await resend.broadcasts.create({
      audienceId,
      from: fromEmail,
      subject: "Your Weekly Yoruba Proverb - Saturday Wisdom",
      html: htmlContent,
    });

    if (error) {
      console.error("Error creating broadcast:", error);
      return null;
    }

    console.log("Weekly broadcast created successfully:", data?.id);
    return data?.id || null;
  } catch (error) {
    console.error("Error creating weekly broadcast:", error);
    return null;
  }
}

// Send a created broadcast
export async function sendBroadcast(
  broadcastId: string,
  scheduledTime?: string
): Promise<boolean> {
  try {
    if (!broadcastId) {
      console.error("Broadcast sending error: Broadcast ID is required");
      return false;
    }

    const sendOptions: { scheduledAt?: string } = {};

    // Add scheduling if provided (e.g., 'in 1 min', '2023-04-01T12:00:00Z')
    if (scheduledTime) {
      sendOptions.scheduledAt = scheduledTime;
    }

    // Send the broadcast
    const { data, error } = await resend.broadcasts.send(
      broadcastId,
      sendOptions
    );

    if (error) {
      console.error("Error sending broadcast:", error);
      return false;
    }

    console.log("Broadcast scheduled successfully:", data?.id);
    return true;
  } catch (error) {
    console.error("Error sending broadcast:", error);
    return false;
  }
}

// Unsubscribe a user from receiving proverbs
export async function unsubscribeUser(email: string): Promise<boolean> {
  try {
    if (!email) {
      console.error("Unsubscribe error: Email is required");
      return false;
    }

    const audienceId = process.env.AUDIENCE_ID;

    if (!audienceId) {
      console.error("Unsubscribe error: Audience ID is not configured");
      return false;
    }

    await resend.contacts.update({
      email,
      audienceId,
      unsubscribed: true,
    });

    console.log(`User ${email} successfully unsubscribed`);
    return true;
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return false;
  }
}
