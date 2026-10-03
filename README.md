# SM-HAMSTAR-BOT-247

A complete, production-ready **Telegram Mini App** built specifically for an **Android Phone + HopWeb + Cloudflare Worker + Firebase Realtime Database** workflow.

## Folder Structure

```text
SM-HAMSTAR-BOT-247/
│
├── index.html
├── worker.js
├── README.md
└── assets/
    ├── background.png
    └── tap-button.png
```

## Key Features

- **Zero Build Tools Required**: Runs directly from a single `index.html` file inside HopWeb on Android. No Node.js, npm, Vite, React, or terminal required.
- **Required Image System**:
  - `assets/background.png` is used directly as the main application background.
  - `assets/tap-button.png` is used directly as the main interactive tap button.
- **Strict Backend Security**:
  - `BOT_TOKEN` and `FIREBASE_DB_SECRET` live **exclusively** inside Cloudflare Worker encrypted environment variables.
  - Every API request from `index.html` is cryptographically verified using Telegram's `initData` HMAC-SHA256 signature in `worker.js`.
  - Balance, tap energy, daily rewards, task verifications, referrals, admin roles, and withdrawals are validated server-side.

## Quick Setup Summary (Mobile Only)

1. **HopWeb**: Create the `SM-HAMSTAR-BOT-247` project folder, paste `index.html`, and place your two images inside `assets/background.png` and `assets/tap-button.png`.
2. **Firebase Realtime Database (`sm-rabbit-247`)**:
   - **Database URL:** `https://sm-rabbit-247-default-rtdb.firebaseio.com`
   - Keep Realtime Database rules private (`.read: false`, `.write: false`) and let the Cloudflare Worker use the Firebase server credential/secret. Do NOT publish public read/write rules for production.
   - **Project ID:** `sm-rabbit-247`
   - **App ID:** `1:641287161248:web:17403a2fc0b7fa87f4138d`
   - In Firebase Console -> **Realtime Database -> Rules**, publish:
     ```json
     {
       "rules": {
         ".read": false,
         ".write": false
       }
     }
     ```
     *(Or use Cloudflare Worker Secret `FIREBASE_DB_SECRET` with server-only rules).*
3. **1-to-1 REAL Telegram Mobile Number User ID (`01XXXXXXXXX`) & Permanent Per-User Persistence**:
   - The app NEVER generates or guesses a phone number from Telegram ID. The user must explicitly share their real Telegram phone through Telegram contact sharing (`WebApp.requestContact`). The Worker receives that Telegram contact via the bot webhook, verifies the sender, and binds `telegramToPhone/{telegramId}`. That verified **11-digit BD mobile number (`01XXXXXXXXX`)** becomes the unique **User ID** in Firebase (`users/{01XXXXXXXXX}`).
   - **Strict Per-User Isolation**: Every user has a completely separate account (`users/{01XXXXXXXXX}`, `transactions/{01XXXXXXXXX}`, `userTasks/{01XXXXXXXXX}`, `referrals/{01XXXXXXXXX}`, and isolated local cache `SM_ACCOUNT_CACHE_V3_{01XXXXXXXXX}`). One user's data never mixes or communicates with another user's data.
   - **Fresh Account Starts From Zero**: Any brand-new account starts strictly at `0` Gold Coins (`0 🪙`), `0` Diamonds (`0 💎`), `$0.00` / `৳0.00` Main Balance, and `0` transactions (zero fake data).
   - **Permanent Live Save & Next-Day Continuity**: Every tap, daily streak claim, ad reward, lightning boost, task claim, conversion, and withdrawal saves automatically and live to Firebase Realtime Database (`keepalive: true`). Refreshing, closing, or reopening the bot on the next day never deletes or resets any previous progress—new earnings always add onto the user's saved balance until converted, withdrawn, or edited from the Admin Panel.
   - User identity phone is NOT manually typed or generated. Payment-method phone fields may still use Bangla/English digits for bKash/Nagad/Rocket, but they do not change the verified Telegram user ID.
4. **Profile Photo + Editable App Username**:
   - Telegram profile photo is loaded when available. Profile > Edit Profile also supports gallery upload. Avatar images are center-cropped into a square 240×240 JPEG before being displayed as a circular avatar, similar to social profile photos.
   - `username` is the app-editable display name; `telegramUsername` is stored separately for Telegram's actual @username.

5. **Separate Admin Panel Login & User Panel Live Control**:
   - Open the **🛡️ Admin** tab and log in exclusively with:
     - **Admin Email:** `smarafat113rt@gmail.com`
     - **Admin Password:** `smarafat113rt@gmail.com`
   - Admin authentication is completely separate from User Panel rules.
   - Under **👥 সকল রেজিস্টার্ড ইউজার (Firebase Live Users)**, search or tap **🎛️ সিলেক্ট** on any user's Mobile Number User ID (`01XXXXXXXXX`).
   - Enter `+` or `-` amounts for **🪙 Gold**, **💎 Diamond**, or **💰 USD $ (Balance)** (all balances formatted to 2 decimals like `$0.99`, `$12.07`, `৳220.00`), then tap **✅ সেভ ও আপডেট করুন** or **🚫 Ban / Unban**.
   - Update **Global Announcement Notice** or toggle **Maintenance Mode**, and **Approve / Reject & Refund** pending withdrawal requests ($2.00 USD / ৳220.00 BDT min).
6. **Cloudflare Worker**: Create a Worker in your mobile browser, paste `worker.js`, and add `BOT_TOKEN`, `FIREBASE_DB_URL`, `FIREBASE_DB_SECRET`, `ADMIN_TELEGRAM_IDS`, and `MINI_APP_URL` in Worker Variables.
7. **Telegram Bot (@BotFather)**: Create your bot, configure the Mini App URL pointing to your published `index.html`, and set the webhook to your Worker's `/webhook` URL.
