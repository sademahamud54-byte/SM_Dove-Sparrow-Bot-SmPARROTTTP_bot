require('dotenv').config();
const express = require('express');
const path = require('path');
const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// ফায়ারবেস এডমিন ইনেশিয়ালাইজেশন
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();
const bot = new Telegraf(process.env.BOT_TOKEN);
const WEB_APP_URL = process.env.WEB_APP_URL; // আপনার মিনি অ্যাপের ইউআরএল

// টেলিগ্রাম মেসেজ ইম্পুট বক্সের পাশে 'Open App 🚀' মেনু বাটন সেটআপ
bot.telegram.setChatMenuButton({
  menu_button: {
    type: 'web_app',
    text: 'Open App 🚀',
    web_app: {
      url: WEB_APP_URL
    }
  }
});

// /start কমান্ড হ্যান্ডলার
bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const userName = ctx.from.first_name || 'User';
  const startParam = ctx.startPayload; // রেফারেল আইডি

  const userRef = db.ref(`users/${userId}`);
  const snapshot = await userRef.once('value');

  // নতুন ইউজার ডাটাবেসে সেভ করা
  if (!snapshot.exists()) {
    let referrerId = null;
    if (startParam && startParam.startsWith('ref_')) {
      referrerId = startParam.replace('ref_', '');
    } else if (startParam && !isNaN(startParam)) {
      referrerId = startParam;
    }

    await userRef.set({
      telegram_id: userId,
      name: userName,
      sm_coins: 0,
      referred_by: referrerId || null,
      created_at: Date.now()
    });

    // রেফারারকে বোনাস প্রদান
    if (referrerId && referrerId !== userId) {
      const referrerRef = db.ref(`users/${referrerId}/sm_coins`);
      referrerRef.transaction((currentCoins) => (currentCoins || 0) + 100);
    }
  }

  const welcomeText = `👋 **Welcome ${userName}!**\n\nআপনার একাউন্ট সফলভাবে প্রস্তুত হয়েছে। নিচে থাকা **Open App 🚀** বাটনে ক্লিক করে কাজ শুরু করুন।`;

  return ctx.replyWithMarkdown(welcomeText, {
    reply_markup: {
      inline_keyboard: [
        [Markup.button.webApp('Open App 🚀', WEB_APP_URL)]
      ]
    }
  });
});

// স্ট্যাটিক ফাইল সার্ভিস করা (ফ্রন্টএন্ডের জন্য)
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// বট এবং সার্ভার চালু করা
bot.launch();
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});