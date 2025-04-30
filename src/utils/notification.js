const axios = require("axios");
require("dotenv").config();

async function notifyUsage(userId, username, endpoint, geoData = null) {
  // Return immediately and let the notification happen in the background
  return Promise.resolve().then(async () => {
    try {
      const personalChatId = process.env.YOUR_PERSONAL_CHAT_ID;
      const apiToken = process.env.API_BOT_TOKEN;

      if (!apiToken) {
        throw new Error("API_BOT_TOKEN environment variable is required");
      }

      if (!personalChatId) {
        throw new Error(
          "YOUR_PERSONAL_CHAT_ID environment variable is required"
        );
      }

      let messageText = `User ${username} (${userId}) used endpoint: ${endpoint}`;

      // Add geographical information if available
      if (geoData) {
        messageText += `\nLocation: ${geoData.city || "Unknown"}, ${
          geoData.region || "Unknown"
        }, ${geoData.country || "Unknown"}`;
        messageText += `\nTimezone: ${geoData.timezone || "Unknown"}`;
      }

      const apiUrl = `https://api.telegram.org/bot${apiToken}/sendMessage`;

      const response = await axios.post(apiUrl, {
        chat_id: personalChatId,
        text: messageText,
      });

      return response.data;
    } catch (error) {
      console.error("Error notifying usage:", error.message);
      // Don't crash the application if notification fails
    }
  });
}

module.exports = { notifyUsage };
