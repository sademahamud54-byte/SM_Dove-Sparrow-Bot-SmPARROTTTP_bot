# SM-RABBIT-247 — Final Integration Notes

This build incorporates the requirements agreed in the chat:

- Firebase project: `sm-rabbit-247`
- Realtime Database: `https://sm-rabbit-247-default-rtdb.firebaseio.com`
- REAL Telegram phone number is required; no generated/demo number is created.
- Telegram Mini App calls `WebApp.requestContact()`.
- Cloudflare Worker webhook receives the Telegram contact and binds `telegramToPhone/{telegramId}`.
- Firebase user identity is `users/{REAL_PHONE_NUMBER}`.
- App username is editable and stored separately from `telegramUsername`.
- Profile avatar uploads are center-cropped to a square 240x240 JPEG before display.
- Profile changes use `/api/profile` so balance fields are not accepted from the profile editor.
- Telegram Mini App `initData` must be valid and is verified server-side by the Worker.

## Cloudflare Worker variables

Set these in the Worker:

- `BOT_TOKEN` — Telegram bot token (secret)
- `FIREBASE_DB_URL` — `https://sm-rabbit-247-default-rtdb.firebaseio.com`
- `FIREBASE_DB_SECRET` — server-side Firebase database credential/secret
- `ADMIN_TELEGRAM_IDS` — comma-separated admin Telegram IDs
- `MINI_APP_URL` — published HTTPS URL of `index.html`

## Telegram webhook

Set the bot webhook to:

`https://YOUR-WORKER-DOMAIN.workers.dev/webhook`

The webhook must remain active because Telegram contact sharing is delivered to the bot as a contact message.

## Firebase Realtime Database rules

Keep the database private in production:

```json
{
  "rules": {
    ".read": false,
    ".write": false
  }
}
```

The Cloudflare Worker performs server-side database operations with `FIREBASE_DB_SECRET`.

## Important

The ZIP contains source code and the Android/HopWeb project structure. A live Telegram/Firebase/Cloudflare deployment still requires the operator's own bot token, Worker deployment, Firebase server credential, webhook, and Mini App URL.
