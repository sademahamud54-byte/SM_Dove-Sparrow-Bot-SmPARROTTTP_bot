const express = require("express");
const path = require("path");
const { Telegraf, Markup } = require("telegraf");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// Firebase Admin
// ===============================
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    console.log("Firebase Admin initialized");
  } else {
    console.log("Firebase Service Account not configured");
  }
} catch (error) {
  console.error("Firebase initialization error:", error.message);
}

// ===============================
// Serve Frontend
// ===============================
app.use(express.static(__dirname));

// IMPORTANT: Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===============================
// Health Check
// ===============================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    app: "SM-RABBIT-BD"
  });
});

// ===============================
// Telegram Bot
// ===============================
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL;

if (!BOT_TOKEN) {
  console.log("BOT_TOKEN is not configured");
} else {
  const bot = new Telegraf(BOT_TOKEN);

  bot.start(async (ctx) => {
    if (WEB_APP_URL) {
      await ctx.reply(
        "🐰 Welcome to SM-RABBIT-BD!",
        Markup.inlineKeyboard([
          Markup.button.webApp("Open App 🚀", WEB_APP_URL)
        ])
      );
    } else {
      await ctx.reply("WEB_APP_URL is not configured.");
    }
  });

  bot.launch();

  console.log("Telegram bot started");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

// ===============================
// Start Server
// ===============================
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SM-RABBIT-BD server running on port ${PORT}`);
});
