# SM-RABBIT-247 — FINAL AI CONTINUATION PROMPT

You are taking over an existing Telegram Mini App/Bot project. The attached project ZIP is the current baseline produced during the previous development session. **Do not start over. Inspect the files first and continue from the current state.**

## 1. Project
- Name: `SM-RABBIT-247`
- Current baseline: `SM-RABBIT-247-FINAL.zip`
- Stack: Telegram Bot + Telegram Mini App + Cloudflare Worker + Firebase Realtime Database + Android/HopWeb embedded web app.
- Firebase project: `sm-rabbit-247`
- Realtime Database URL: `https://sm-rabbit-247-default-rtdb.firebaseio.com`

## 2. Core identity requirement — NON-NEGOTIABLE
The user's **REAL Telegram mobile number** must be the Firebase user identity/key:

`users/{REAL_PHONE_NUMBER}`

Example: `users/01915921501`

Never generate, guess, derive, pad, demo, or randomly create a phone number from Telegram ID. If the real phone number has not been explicitly obtained/verified, do not fabricate one.

Telegram contact sharing should be used to obtain the real phone number, with user consent. The Worker must bind the verified Telegram identity to the verified phone.

## 3. Telegram authentication
- Verify Telegram Mini App `initData` server-side in the Cloudflare Worker.
- Never trust `initDataUnsafe` as authentication.
- Keep any `telegramToPhone/{telegramId}` mapping tied only to a real verified phone.
- The webhook must remain active because Telegram contact sharing is delivered to the bot.

## 4. Firebase
Use the supplied Firebase project/config already present in the code. Do not replace it with another project.

Expected user data includes, as applicable:
- `phone`
- `telegramId`
- `telegramUsername`
- `username`
- `firstName`
- `lastName`
- `profilePhoto`
- `level`
- `gold`
- `diamonds`
- `usdBalance`
- `energy`
- `maxEnergy`
- `tapCount`
- `createdAt`
- `lastActiveAt`
- existing task/referral/wallet/transaction data

Existing user progress must persist across closing/reopening the Mini App. Do not reset existing balances or game progress.

## 5. Profile requirements
### Green arrow: Profile photo
- User can upload/change profile photo.
- Resize/crop it for avatar use, approximately square 240x240 center crop where the existing implementation specifies this.
- Display as a profile/avatar image.
- Do not store huge base64 images in Realtime Database; use appropriate storage and save the URL/reference.

### Blue arrow: App username
- `username` is the editable app display name.
- It is separate from Telegram's actual `telegramUsername` (`@username`).

### Yellow arrow: Mobile number
- Display the **real verified Telegram mobile number**.
- No fake/demo/generated number.

## 6. Existing game functionality must remain
Preserve and integrate with the existing implementation:
- Tap system
- Gold
- Diamonds
- Main balance / USD balance
- Energy / max energy
- Level
- Daily streak/rewards
- Tasks
- Referrals/Friends
- Wallet
- Withdrawals
- Lottery
- Ads/rewards
- Admin panel
- Existing UI/navigation

Do not hard-code screenshot example values such as `Hamstar Player`, `Lv.5`, `01915921501`, `4 diamonds`, `৳369547.20`, `$3359.52`. They are examples only.

Preserve the existing Gold → Diamond and Diamond → money conversion logic unless a verified bug/security issue requires a change.

## 7. Security
- Firebase must not be left publicly writable/readable for sensitive production data.
- Prefer private rules and server-side Worker access.
- Important balance/reward/withdrawal/admin operations must be validated server-side.
- Never put `BOT_TOKEN` or `FIREBASE_DB_SECRET` in public frontend source.
- Cloudflare Worker secrets should be used.
- Do not expose credentials in the final response or public source.

## 8. Cloudflare Worker configuration
The Worker expects configuration such as:
- `BOT_TOKEN` — secret
- `FIREBASE_DB_URL` — `https://sm-rabbit-247-default-rtdb.firebaseio.com`
- `FIREBASE_DB_SECRET` — secret/server credential
- `ADMIN_TELEGRAM_IDS`
- `MINI_APP_URL` — published HTTPS Mini App URL

Inspect the existing `worker.js` and use its actual endpoints rather than inventing new ones.

Expected webhook endpoint is `/webhook` unless the current Worker shows otherwise.

## 9. Android/HopWeb
The ZIP contains an Android project and an embedded copy of the Mini App under:
`app/src/main/assets/SM-HAMSTAR-BOT-247/`

If the main `index.html` is changed, keep the embedded Mini App copy synchronized where appropriate. Do not break the Android WebView/HopWeb setup.

## 10. Critical legacy bug to check
Search the entire project for any logic that derives a phone number from Telegram ID, e.g. code conceptually like:

`const digits = tgId.replace(/\\D/g, '').padEnd(...);`

or any `phone = '01' + ...` fallback based on Telegram ID.

Such logic is forbidden. Remove/fix it.

## 11. Current project documentation already included
The project contains:
- `README.md`
- `FINAL-SETUP.md`
- `worker.js`
- `index.html`
- Android source and embedded Mini App.

Read these files, but treat **actual code as the source of truth** if documentation conflicts with implementation.

## 12. Required workflow
### First
Audit the attached ZIP:
1. List project structure.
2. Inspect Telegram integration.
3. Inspect phone/contact flow.
4. Inspect Firebase integration.
5. Inspect Worker/API endpoints.
6. Inspect profile photo and username.
7. Inspect tap/gold/diamond/balance persistence.
8. Inspect admin/wallet/tasks/referrals.
9. Inspect Android embedded copy.
10. Search for fake phone generation and security problems.

### Then
Give a short audit report:
- already implemented
- incomplete
- broken
- security issues
- files that need editing

### Then
Make controlled edits. Do not rewrite the whole project unnecessarily.

### Finally
Run syntax/static checks as possible, verify that the real-phone identity rule is enforced, verify that no fake-phone fallback remains, and produce a new ZIP such as:
`SM-RABBIT-247-FINAL-EDITED.zip`

Do not include real server secrets in the ZIP.

## 13. Final acceptance criteria
The finished project should satisfy:
- REAL Telegram phone → Firebase user key
- no fake/generated phone
- Telegram initData server verification
- contact/phone flow with explicit user consent
- persistent user data
- editable app username
- separate Telegram username
- profile photo upload + crop/resize
- existing Tap/Gold/Diamond/Balance systems preserved
- secure server-side sensitive operations
- private Firebase production access
- existing Tasks/Friends/Wallet/Admin preserved
- Android embedded Mini App synchronized

## 14. Important instruction
**Do not ask me to explain the project again.** This document and the attached ZIP are the handover. Inspect the files and continue from the current implementation.

Start by auditing the ZIP, then report the exact current state before making major changes.
