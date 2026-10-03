/**
 * SM-HAMSTAR-BOT-247 — Complete Cloudflare Worker Backend (worker.js)
 *
 * REQUIRED CLOUDFLARE WORKER ENVIRONMENT VARIABLES / SECRETS:
 * - BOT_TOKEN           : Telegram Bot Token from @BotFather (Secret)
 * - FIREBASE_DB_URL     : e.g. https://your-project-default-rtdb.firebaseio.com
 * - FIREBASE_DB_SECRET  : Firebase Realtime Database Secret (Secret)
 * - ADMIN_TELEGRAM_IDS  : Comma-separated admin Telegram IDs, e.g. "123456789,987654321"
 * - MINI_APP_URL        : Your deployed index.html HTTPS URL
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const STREAK_REWARDS = [100, 250, 450, 700, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 5000];
const ADMIN_LOGIN_EMAIL = 'smarafat113rt@gmail.com';
const ADMIN_LOGIN_PASS = 'smarafat113rt@gmail.com';

const BANGLA_DIGIT_MAP = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

// Converts Bangla/English mixed digits to 11-digit English digits starting with 01 (01XXXXXXXXX)
function normalizeBdPhone(rawInput) {
  const raw = String(rawInput || '').trim();
  let str = raw.replace(/[০-৯]/g, (d) => BANGLA_DIGIT_MAP[d] || d);
  str = str.replace(/[^0-9]/g, '');
  if (str.startsWith('8801') && str.length === 13) {
    str = str.slice(2);
  }
  return str.slice(0, 11);
}

function isValidBdPhone(phone) {
  return /^01[0-9]{9}$/.test(normalizeBdPhone(phone));
}

function formatMoney2(val) {
  return Number(Number(val || 0).toFixed(2));
}

const MAX_ENERGY_CAPACITY = 21500;
const BOOST_TIERS = [
  { cost: 300,  multiplier: 1,  speedPerMin: Math.round((MAX_ENERGY_CAPACITY / 120) * 1) },
  { cost: 500,  multiplier: 2,  speedPerMin: Math.round((MAX_ENERGY_CAPACITY / 120) * 2) },
  { cost: 800,  multiplier: 3,  speedPerMin: Math.round((MAX_ENERGY_CAPACITY / 120) * 3) },
  { cost: 1100, multiplier: 4,  speedPerMin: Math.round((MAX_ENERGY_CAPACITY / 120) * 4) },
  { cost: 1400, multiplier: 5,  speedPerMin: Math.round((MAX_ENERGY_CAPACITY / 120) * 5) },
  { cost: 1800, multiplier: 6,  speedPerMin: Math.round((MAX_ENERGY_CAPACITY / 120) * 6) },
  { cost: 2000, multiplier: 7,  speedPerMin: Math.round((MAX_ENERGY_CAPACITY / 120) * 7) },
  { cost: 2200, multiplier: 8,  speedPerMin: Math.round((MAX_ENERGY_CAPACITY / 120) * 8) },
  { cost: 3000, multiplier: 9,  speedPerMin: Math.round((MAX_ENERGY_CAPACITY / 120) * 9) },
  { cost: 4000, multiplier: 10, speedPerMin: Math.round((MAX_ENERGY_CAPACITY / 120) * 10) }
];

function getBoostTier(buyIndex) {
  const idx = Math.max(0, Math.min(BOOST_TIERS.length - 1, Math.floor(Number(buyIndex || 0))));
  return BOOST_TIERS[idx];
}
const DEFAULT_TASKS = [
  {
    id: 'join_channel',
    title: 'Join Official Telegram Channel',
    reward: 500,
    url: 'https://t.me/Telegram',
    chatId: '',
    type: 'telegram'
  },
  {
    id: 'join_group',
    title: 'Join Community Group',
    reward: 500,
    url: 'https://t.me/Telegram',
    chatId: '',
    type: 'telegram'
  },
  {
    id: 'tap_milestone_100',
    title: 'Reach 100 Verified Coins',
    reward: 300,
    url: '',
    minBalance: 100,
    type: 'milestone'
  }
];

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 1. Health check endpoint
      if (request.method === 'GET' && path === '/') {
        return jsonResponse({
          ok: true,
          service: 'SM-HAMSTAR-BOT-247 Worker API',
          status: 'online'
        });
      }

      // 2. Telegram Bot Webhook endpoint (/webhook)
      if (request.method === 'POST' && path === '/webhook') {
        const update = await request.json();
        await handleTelegramWebhook(update, env);
        return jsonResponse({ ok: true });
      }

      // 3. All /api/* endpoints require POST + Valid Telegram Mini App initData
      if (request.method !== 'POST' || !path.startsWith('/api/')) {
        return jsonResponse({ error: 'Not Found' }, 404);
      }

      const body = await request.json().catch(() => ({}));

      // =================================================================
      // SEPARATE ADMIN PANEL AUTHENTICATION (Email & Password ONLY)
      // Admin Email: smarafat113rt@gmail.com
      // Admin Pass : smarafat113rt@gmail.com
      // Completely independent from User Panel mobile number rules.
      // =================================================================
      if (path.startsWith('/api/admin/')) {
        const reqEmail = String(body.adminEmail || '').trim().toLowerCase();
        const reqPass = String(body.adminPassword || '').trim();
        if (reqEmail !== ADMIN_LOGIN_EMAIL || reqPass !== ADMIN_LOGIN_PASS) {
          return jsonResponse({
            error: 'Forbidden: শুধুমাত্র নির্ধারিত অ্যাডমিন জিমেইল ও পাসওয়ার্ড দিয়ে লগইন করা যাবে!'
          }, 403);
        }

        const nowAdmin = Date.now();
        const globalConfig = (await fbGet(env, 'config')) || {};
        const config = {
          minWithdraw: 2,
          minWithdrawUsd: 2,
          minWithdrawBdt: 220,
          maintenance: false,
          announcement: 'Welcome to SM HAMSTAR BOT 247! Collect Gold Coins & Blue Diamonds for the 15-Day Mega Lottery!',
          lotteryCycleStart: 1758844800000,
          usdToBdtRate: 110,
          ...globalConfig
        };

        if (path === '/api/admin/overview') {
          const [usersObj, withdrawalsObj] = await Promise.all([
            fbGet(env, 'users'),
            fbGet(env, 'withdrawals')
          ]);
          const allUsers = usersObj ? Object.values(usersObj).filter(Boolean) : [];
          const totalUsers = allUsers.length;
          const pendingWithdrawals = withdrawalsObj
            ? Object.values(withdrawalsObj).filter((w) => w && w.status === 'pending')
            : [];
          return jsonResponse({ ok: true, totalUsers, allUsers, pendingWithdrawals, config });
        }

        if (path === '/api/admin/settings') {
          const nextConfig = {
            ...config,
            announcement: String(body.announcement ?? config.announcement),
            maintenance: Boolean(body.maintenance)
          };
          await fbPut(env, 'config', nextConfig);
          return jsonResponse({ ok: true, config: nextConfig });
        }

        if (path === '/api/admin/user-adjust') {
          const rawTarget = String(body.targetUid || '').trim();
          const targetUid = isValidBdPhone(rawTarget) ? normalizeBdPhone(rawTarget) : rawTarget;
          const balanceDelta = Number(body.balanceDelta || 0);
          const diamondDelta = Number(body.diamondDelta || 0);
          const usdDelta = Number(body.usdDelta || 0);
          const toggleBan = Boolean(body.toggleBan);

          const targetUser = await fbGet(env, `users/${targetUid}`);
          if (!targetUser) return jsonResponse({ error: 'Target user (Mobile ID) not found in Firebase' }, 404);

          if (balanceDelta !== 0) {
            targetUser.balance = Math.max(0, Number(targetUser.balance || 0) + balanceDelta);
          }
          if (diamondDelta !== 0) {
            targetUser.diamonds = Number(Math.max(0, Number(targetUser.diamonds || 0) + diamondDelta).toFixed(4));
          }
          if (usdDelta !== 0) {
            targetUser.usdBalance = formatMoney2(Math.max(0, Number(targetUser.usdBalance || 0) + usdDelta));
          }
          if (toggleBan) {
            targetUser.isBanned = !targetUser.isBanned;
          }
          targetUser.adminUpdatedAt = nowAdmin;
          targetUser.lastActiveAt = nowAdmin;
          await fbPut(env, `users/${targetUid}`, targetUser);
          return jsonResponse({ ok: true, targetUser });
        }

        if (path === '/api/admin/withdraw-decision') {
          const withdrawalId = String(body.withdrawalId || '').trim();
          const decision = body.decision === 'approved' ? 'approved' : 'rejected';

          const wd = await fbGet(env, `withdrawals/${withdrawalId}`);
          if (!wd || wd.status !== 'pending') {
            return jsonResponse({ error: 'Pending withdrawal not found' }, 404);
          }

          wd.status = decision;
          wd.processedAt = nowAdmin;

          if (decision === 'rejected') {
            const targetUser = await fbGet(env, `users/${wd.userId}`);
            if (targetUser) {
              if (wd.usdAmount) {
                targetUser.usdBalance = formatMoney2(Number(targetUser.usdBalance || 0) + Number(wd.usdAmount || 0));
              } else {
                targetUser.balance = Number(targetUser.balance || 0) + Number(wd.amount || 0);
              }
              targetUser.adminUpdatedAt = nowAdmin;
              await fbPut(env, `users/${wd.userId}`, targetUser);
            }
          }

          await Promise.all([
            fbPut(env, `withdrawals/${withdrawalId}`, wd),
            fbPatch(env, `transactions/${wd.userId}/${withdrawalId}`, { status: decision })
          ]);

          return jsonResponse({ ok: true, withdrawal: wd });
        }

        return jsonResponse({ error: 'Unknown Admin API endpoint' }, 404);
      }

      // =================================================================
      // USER PANEL AUTHENTICATION:
      // 1 Telegram Account = 1 Mobile Number (01XXXXXXXXX, 11 digits) = 1 User ID
      // =================================================================
      const authHeader = request.headers.get('Authorization') || '';
      const rawInitData = authHeader.startsWith('tma ')
        ? authHeader.slice(4).trim()
        : (body.initData || '');

      const tgUser = await verifyTelegramInitData(rawInitData, env.BOT_TOKEN);
      if (!tgUser || !tgUser.id) {
        return jsonResponse({ error: 'Telegram initData verification failed. Telegram Mini App থেকে আবার খুলুন।' }, 401);
      }

      const tgId = String(tgUser.id).trim();

      if (path === '/api/phone-status') {
        const mappedPhone = await fbGet(env, `telegramToPhone/${tgId}`);
        return jsonResponse({
          ok: true,
          verified: isValidBdPhone(mappedPhone),
          phone: isValidBdPhone(mappedPhone) ? normalizeBdPhone(mappedPhone) : '',
          telegramId: tgId
        });
      }

      const submittedPhone = normalizeBdPhone(body.mobileNumber || body.phone || '');
      let boundPhone = '';
      const remoteBound = await fbGet(env, `telegramToPhone/${tgId}`);
      if (remoteBound && typeof remoteBound === 'string' && isValidBdPhone(remoteBound)) {
        boundPhone = normalizeBdPhone(remoteBound);
      }
      if (isValidBdPhone(submittedPhone)) {
        // A submitted phone may only be accepted after Telegram contact verification has
        // created the same Telegram-ID -> phone binding. Never create a binding from typed text.
        if (boundPhone && boundPhone === submittedPhone) {
          // verified binding matches
        } else if (!boundPhone) {
          return jsonResponse({
            error: 'Telegram contact verification এখনো সম্পন্ন হয়নি। আগে Telegram থেকে আপনার আসল নম্বর Share করুন।',
            requiresPhoneActivation: true,
            telegramId: tgId
          }, 409);
        } else {
          return jsonResponse({ error: 'এই Telegram account-এর verified mobile number-এর সাথে দেওয়া নম্বর মিলছে না।' }, 403);
        }
      }

      if (!boundPhone || !isValidBdPhone(boundPhone)) {
        return jsonResponse({
          error: 'আপনার Telegram account-এর REAL mobile number verify করুন। কোনো fake/demo number গ্রহণ করা হবে না।',
          requiresPhoneActivation: true,
          telegramId: tgId
        }, 409);
      }

      // Primary User ID in Firebase is ALWAYS the 11-digit mobile number (01XXXXXXXXX)
      const uid = boundPhone;
      const isAdmin = false;

      // Load Global Config & User Record (keyed by 11-digit mobile number) from Firebase
      const [globalConfig, existingUser] = await Promise.all([
        fbGet(env, 'config'),
        fbGet(env, `users/${uid}`)
      ]);

      const config = {
        minWithdraw: 2,
        minWithdrawUsd: 2,
        minWithdrawBdt: 220,
        maintenance: false,
        announcement: 'Welcome to SM HAMSTAR BOT 247! Collect Gold Coins & Blue Diamonds for the 15-Day Mega Lottery!',
        lotteryCycleStart: 1758844800000,
        usdToBdtRate: 110,
        ...(globalConfig || {})
      };

      if (config.maintenance) {
        return jsonResponse({ error: 'Server is under maintenance. Please try again shortly.' }, 503);
      }

      const now = Date.now();
      let user = existingUser;

      // Initialize new user if first time (User ID = 01XXXXXXXXX Mobile Number)
      if (!user) {
        user = {
          id: uid,
          phone: uid,
          telegramId: tgId || uid,
          firstName: tgUser.first_name || 'Hamstar',
          username: String(body.username || tgUser.first_name || 'Hamstar Player').slice(0, 40),
          telegramUsername: tgUser.username || '',
          photoUrl: tgUser.photo_url || '',
          balance: 0,
          diamonds: 0,
          usdBalance: 0,
          totalEarned: 0,
          totalTaps: 0,
          energy: 21500,
          maxEnergy: 21500,
          tapPower: 10,
          streak: 1,
          lastDailyClaim: 0,
          lastEnergyAt: now,
          lastTapSyncAt: 0,
          lastAdRewardAt: 0,
          boostExpiresAt: 0,
          boostSpeedPerMin: 0,
          boostMultiplier: 1,
          boostBuysToday: 0,
          boostDayKey: new Date(now).toISOString().slice(0, 10),
          referralCount: 0,
          referralEarnings: 0,
          referredBy: null,
          isBanned: false,
          userUpdatedAt: now,
          adminUpdatedAt: 0,
          createdAt: now
        };

        // Process One-Time Referral if startParam is ref_<referrerMobileOrId>
        const startParam = String(body.startParam || '');
        if (startParam.startsWith('ref_')) {
          const rawRef = startParam.replace('ref_', '').trim();
          const refId = isValidBdPhone(rawRef) ? normalizeBdPhone(rawRef) : rawRef;
          if (refId && refId !== uid) {
            const refUser = await fbGet(env, `users/${refId}`);
            if (refUser) {
              const refBonus = 250;
              const welcomeBonus = 100;
              user.referredBy = refId;
              user.balance += welcomeBonus;
              user.totalEarned += welcomeBonus;

              refUser.balance = Number(refUser.balance || 0) + refBonus;
              refUser.totalEarned = Number(refUser.totalEarned || 0) + refBonus;
              refUser.referralCount = Number(refUser.referralCount || 0) + 1;
              refUser.referralEarnings = Number(refUser.referralEarnings || 0) + refBonus;

              await Promise.all([
                fbPut(env, `users/${refId}`, refUser),
                fbPut(env, `referrals/${refId}/${uid}`, {
                  id: uid,
                  phone: uid,
                  name: user.firstName,
                  bonus: refBonus,
                  createdAt: now
                }),
                logTransaction(env, refId, {
                  type: 'referral_bonus',
                  amount: refBonus,
                  status: 'completed',
                  createdAt: now
                })
              ]);
            }
          }
        }
        await fbPut(env, `users/${uid}`, user);
      } else {
        // Ensure 1-to-1 Telegram ID check on existing mobile number record
        if (user.telegramId && tgId && String(user.telegramId) !== tgId) {
          return jsonResponse({
            error: 'এই মোবাইল নম্বরটি অন্য একটি টেলিগ্রাম আইডির সাথে যুক্ত আছে!'
          }, 403);
        }
        user.id = uid;
        user.phone = uid;
        if (tgId && !user.telegramId) {
          user.telegramId = tgId;
        }
        // Reset daily boost tier counter if a new UTC day started
        const todayKey = new Date(now).toISOString().slice(0, 10);
        if (user.boostDayKey !== todayKey) {
          user.boostDayKey = todayKey;
          user.boostBuysToday = 0;
        }

        // Regenerate Click Energy:
        // - Normal speed (no boost): 21,500 clicks / 3 hours (10,800 seconds)
        // - Boosted speed (⚡ 2x..10x): multiplier * (21,500 / 2 hours)
        const lastE = Number(user.lastEnergyAt || now);
        const maxE = Math.max(21500, Number(user.maxEnergy || 21500));
        const normalRegenPerMs = maxE / (3 * 60 * 60 * 1000);
        const base1xRegenPerMs = maxE / (2 * 60 * 60 * 1000);
        const boostExp = Number(user.boostExpiresAt || 0);
        const boostMult = Math.max(1, Number(user.boostMultiplier || 1));

        let gainedEnergy = 0;
        if (now > lastE) {
          if (boostExp > lastE && boostMult > 1) {
            const boostedEnd = Math.min(now, boostExp);
            const boostedMs = Math.max(0, boostedEnd - lastE);
            const normalMs = Math.max(0, now - boostedEnd);
            gainedEnergy = boostedMs * (base1xRegenPerMs * boostMult) + normalMs * normalRegenPerMs;
          } else {
            gainedEnergy = (now - lastE) * normalRegenPerMs;
          }
        }

        if (now >= boostExp) {
          user.boostSpeedPerMin = 0;
          user.boostMultiplier = 1;
        }

        user.maxEnergy = maxE;
        user.tapPower = Math.max(10, Number(user.tapPower || 10));
        user.energy = Number(Math.min(maxE, Number(user.energy ?? maxE) + gainedEnergy).toFixed(4));
        user.lastEnergyAt = now;
        user.firstName = tgUser.first_name || user.firstName;
        user.telegramUsername = tgUser.username || user.telegramUsername || '';
        if (!user.username) user.username = String(body.username || tgUser.first_name || 'Hamstar Player').slice(0, 40);
      }

      if (user.isBanned && !isAdmin) {
        return jsonResponse({ error: 'Account suspended by security system.' }, 403);
      }

      // ROUTE HANDLERS
      if (path === '/api/auth') {
        await fbPut(env, `users/${uid}`, user);
        return jsonResponse(await buildSnapshot(env, user, config, isAdmin));
      }

      if (path === '/api/profile') {
        const profile = (body.profile && typeof body.profile === 'object') ? body.profile : body;
        const currentCount = Number(user.profileEditCount || user.profileEditCountMonth || 0);
        const monthKey = new Date(now).toISOString().slice(0, 7);
        const storedMonth = String(user.profileEditMonthKey || monthKey);
        const editsUsed = storedMonth === monthKey ? currentCount : 0;
        if (editsUsed >= 2) {
          return jsonResponse({ error: 'এই মাসের ২ বার Profile Edit limit শেষ হয়েছে।' }, 429);
        }

        const clean = (v, max = 120) => String(v ?? '').trim().slice(0, max);
        const nextUsername = clean(profile.username, 40);
        if (nextUsername) user.username = nextUsername;
        user.bannerUrl = clean(profile.bannerUrl, 180000);
        user.avatarUrl = clean(profile.avatarUrl, 120000);
        user.photoUrl = user.avatarUrl || clean(profile.photoUrl, 120000) || user.photoUrl || '';
        user.savedBkash = isValidBdPhone(profile.savedBkash) ? normalizeBdPhone(profile.savedBkash) : '';
        user.savedNagad = isValidBdPhone(profile.savedNagad) ? normalizeBdPhone(profile.savedNagad) : '';
        user.savedRocket = isValidBdPhone(profile.savedRocket) ? normalizeBdPhone(profile.savedRocket) : '';
        user.savedPayoneer = clean(profile.savedPayoneer, 160);
        user.savedBankName = clean(profile.savedBankName, 120);
        user.savedBankBranch = clean(profile.savedBankBranch, 120);
        user.savedBankDistrict = clean(profile.savedBankDistrict, 120);
        user.savedBankAccount = clean(profile.savedBankAccount, 80);
        user.paymentMethods = {
          bkash: user.savedBkash,
          nagad: user.savedNagad,
          rocket: user.savedRocket,
          payoneer: user.savedPayoneer,
          bankName: user.savedBankName,
          bankBranch: user.savedBankBranch,
          bankDistrict: user.savedBankDistrict,
          bankAccNo: user.savedBankAccount,
          bankHolder: user.username || user.firstName || ''
        };
        user.profileEditMonthKey = monthKey;
        user.profileEditCount = editsUsed + 1;
        user.profileEditCountMonth = editsUsed + 1;
        user.userUpdatedAt = now;
        user.lastActiveAt = now;
        await fbPut(env, `users/${uid}`, user);
        return jsonResponse(await buildSnapshot(env, user, config, isAdmin));
      }

      if (path === '/api/tap') {
        const rawTaps = Math.floor(Number(body.taps || 0));
        if (rawTaps <= 0 || rawTaps > 150) {
          return jsonResponse({ error: 'Invalid tap batch size' }, 400);
        }

        // Anti-cheat: Verify tap rate against elapsed server time
        const sinceLastSyncMs = now - Number(user.lastTapSyncAt || 0);
        if (sinceLastSyncMs < 800 && rawTaps > 25) {
          return jsonResponse({ error: 'Anti-cheat: Tap speed limit exceeded' }, 429);
        }

        const tapPower = Number(user.tapPower || 10); // +10 Gold Coins per click
        // 1 click consumes 1 Click Energy out of 1000 (1000 clicks total before 2-hour recharge)
        const availableClicks = Math.floor(Number(user.energy || 0));
        const acceptedTaps = Math.min(rawTaps, availableClicks);

        if (acceptedTaps <= 0) {
          return jsonResponse({ error: '21,500 energy completed! Recharging gradually over 3 hours (or activate ⚡ Boost).' }, 400);
        }

        const earned = acceptedTaps * tapPower;
        user.energy = Number(Math.max(0, Number(user.energy || 0) - acceptedTaps).toFixed(4));
        user.balance = Number(user.balance || 0) + earned;
        user.totalEarned = Number(user.totalEarned || 0) + earned;
        user.totalTaps = Number(user.totalTaps || 0) + acceptedTaps;
        user.lastTapSyncAt = now;
        user.lastEnergyAt = now;
        user.userUpdatedAt = now;

        await fbPut(env, `users/${uid}`, user);
        return jsonResponse(await buildSnapshot(env, user, config, isAdmin));
      }

      if (path === '/api/ad-verify') {
        const adId = String(body.adId || '').trim();
        const adUrl = String(body.adUrl || '').trim();
        if (!adId || !adUrl) {
          return jsonResponse({ allowed: false, reason: 'missing_ad' });
        }

        const suspendedMap = (await fbGet(env, 'suspendedAds')) || {};
        if (suspendedMap[adId]) {
          return jsonResponse({ allowed: false, suspendedAds: suspendedMap });
        }

        const scanResult = await inspectAdUrlForAdultContent(adUrl);
        if (!scanResult.safe) {
          const record = {
            id: adId,
            url: adUrl,
            finalUrl: scanResult.finalUrl || adUrl,
            matchedRule: scanResult.reason || 'policy_violation',
            suspendedAt: now
          };
          suspendedMap[adId] = record;
          await fbPut(env, `suspendedAds/${adId}`, record);
          await notifyAdminsViaTelegramBot(
            env,
            `🚫 *Auto-Suspended Ad Link (Backend Guard)*\nAd ID: \`${adId}\`\nSource: \`${adUrl}\`\nRedirect: \`${scanResult.finalUrl || adUrl}\`\nReason: \`${scanResult.reason}\``
          );
          return jsonResponse({ allowed: false, suspendedAds: suspendedMap });
        }

        return jsonResponse({ allowed: true, suspendedAds: suspendedMap });
      }

      if (path === '/api/ad-reward') {
        // Server-side cooldown check (at least 9 seconds for 10s ad / 15s direct link)
        const sinceLastAdMs = now - Number(user.lastAdRewardAt || 0);
        if (sinceLastAdMs < 8500) {
          return jsonResponse({ error: 'Please watch the ad for at least 10 seconds' }, 429);
        }

        const mode = body.mode === 'direct_15s' ? 'direct_15s' : 'close_10s';
        const diamondGain = 1;
        const goldBonus = mode === 'direct_15s' ? 100 : 0;

        user.diamonds = Number(user.diamonds || 0) + diamondGain;
        user.balance = Number(user.balance || 0) + goldBonus;
        user.totalEarned = Number(user.totalEarned || 0) + goldBonus;
        user.lastAdRewardAt = now;
        user.userUpdatedAt = now;

        await Promise.all([
          fbPut(env, `users/${uid}`, user),
          logTransaction(env, uid, {
            type: mode === 'direct_15s' ? 'ad_direct_15s_bonus' : 'ad_diamond_reward',
            amount: goldBonus > 0 ? goldBonus : diamondGain,
            diamonds: diamondGain,
            status: 'completed',
            createdAt: now
          })
        ]);

        return jsonResponse(await buildSnapshot(env, user, config, isAdmin));
      }

      if (path === '/api/boost') {
        const todayKey = new Date(now).toISOString().slice(0, 10);
        if (user.boostDayKey !== todayKey) {
          user.boostDayKey = todayKey;
          user.boostBuysToday = 0;
        }
        const buysToday = Math.max(0, Math.floor(Number(user.boostBuysToday || 0)));
        const tier = getBoostTier(buysToday);

        if (Number(user.balance || 0) < tier.cost) {
          return jsonResponse({
            error: `⚡ ${tier.multiplier}× এনার্জি বুস্ট কিনতে ${tier.cost} 🪙 গোল্ড কয়েন প্রয়োজন!`
          }, 400);
        }

        user.balance = Number(user.balance || 0) - tier.cost;
        user.boostBuysToday = Math.min(BOOST_TIERS.length, buysToday + 1);
        user.boostMultiplier = tier.multiplier;
        user.boostSpeedPerMin = tier.speedPerMin;
        user.boostExpiresAt = now + 60 * 60 * 1000;
        user.lastEnergyAt = now;
        user.userUpdatedAt = now;

        await Promise.all([
          fbPut(env, `users/${uid}`, user),
          logTransaction(env, uid, {
            type: 'lightning_boost',
            amount: tier.cost,
            multiplier: tier.multiplier,
            speedPerMin: tier.speedPerMin,
            status: 'completed',
            createdAt: now
          })
        ]);

        const snapshot = await buildSnapshot(env, user, config, isAdmin);
        return jsonResponse({
          ...snapshot,
          boostCost: tier.cost,
          boostMultiplier: tier.multiplier,
          boostSpeedPerMin: tier.speedPerMin,
          boostBuysToday: user.boostBuysToday
        });
      }

      if (path === '/api/convert') {
        // Step 1: Convert Gold Coins -> Diamonds (2,000 Gold = 1 💎 Diamond, i.e. 100,000 Gold = 50 💎 = 0.5 cent)
        // Step 2: Convert Diamonds -> Main User Balance (1 💎 Diamond = 0.01 cent = $0.0001 USD)
        const convertType = String(body.convertType || 'gold');
        if (convertType === 'gold') {
          const goldToConvert = Math.floor(Number(body.amount || user.balance || 0));
          if (goldToConvert < 10 || goldToConvert > Number(user.balance || 0)) {
            return jsonResponse({ error: 'Minimum 10 Gold Coins required to convert to Diamonds' }, 400);
          }
          const diamondsAdded = Number((goldToConvert / 2000).toFixed(4));
          user.balance = Number(user.balance || 0) - goldToConvert;
          user.diamonds = Number((Number(user.diamonds || 0) + diamondsAdded).toFixed(4));
          user.userUpdatedAt = now;
          await Promise.all([
            fbPut(env, `users/${uid}`, user),
            logTransaction(env, uid, {
              type: 'gold_to_diamond',
              amount: goldToConvert,
              diamondsAdded,
              status: 'completed',
              createdAt: now
            })
          ]);
        } else if (convertType === 'diamonds') {
          const diamondsToConvert = Number(body.amount || user.diamonds || 0);
          if (diamondsToConvert <= 0 || diamondsToConvert > Number(user.diamonds || 0)) {
            return jsonResponse({ error: 'Not enough Diamonds to convert to Balance' }, 400);
          }
          const usdAdded = Number((diamondsToConvert * 0.0001).toFixed(6));
          user.diamonds = Number(Math.max(0, Number(user.diamonds || 0) - diamondsToConvert).toFixed(4));
          user.usdBalance = Number((Number(user.usdBalance || 0) + usdAdded).toFixed(6));
          user.userUpdatedAt = now;
          await Promise.all([
            fbPut(env, `users/${uid}`, user),
            logTransaction(env, uid, {
              type: 'diamond_to_balance',
              amount: diamondsToConvert,
              usdAdded,
              status: 'completed',
              createdAt: now
            })
          ]);
        }
        return jsonResponse(await buildSnapshot(env, user, config, isAdmin));
      }

      if (path === '/api/daily-claim') {
        const lastClaim = Number(user.lastDailyClaim || 0);
        const diff = now - lastClaim;
        if (diff < 86400000) {
          const hoursLeft = Math.ceil((86400000 - diff) / 3600000);
          return jsonResponse({ error: `Daily reward available in ${hoursLeft}h` }, 400);
        }

        // Never reset streak on missed days — always continue from the user's saved streak day
        const streak = ((Number(user.streak || 1) - 1) % STREAK_REWARDS.length) + 1;

        const reward = STREAK_REWARDS[(streak - 1) % STREAK_REWARDS.length];
        const diamondReward = streak; // Day 1 = +1 💎, Day 2 = +2 💎 ... Day 12 = +12 💎
        user.balance = Number(user.balance || 0) + reward;
        user.diamonds = Number(user.diamonds || 0) + diamondReward;
        user.totalEarned = Number(user.totalEarned || 0) + reward;
        user.lastDailyClaim = now;
        user.streak = (streak % STREAK_REWARDS.length) + 1;
        user.userUpdatedAt = now;

        await Promise.all([
          fbPut(env, `users/${uid}`, user),
          logTransaction(env, uid, {
            type: 'daily_reward',
            amount: reward,
            diamonds: diamondReward,
            status: 'completed',
            createdAt: now
          })
        ]);

        const snapshot = await buildSnapshot(env, user, config, isAdmin);
        return jsonResponse({ ...snapshot, reward, diamondReward });
      }

      if (path === '/api/task-claim') {
        const taskId = String(body.taskId || '').trim();
        if (!taskId) return jsonResponse({ error: 'Missing taskId' }, 400);

        const [tasksData, completedMap] = await Promise.all([
          fbGet(env, 'tasks'),
          fbGet(env, `userTasks/${uid}`)
        ]);

        const tasks = Array.isArray(tasksData) ? tasksData : DEFAULT_TASKS;
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return jsonResponse({ error: 'Task not found' }, 404);

        if (completedMap && completedMap[taskId]) {
          return jsonResponse({ error: 'Task already claimed' }, 400);
        }

        // Server-side milestone check
        if (task.minBalance && Number(user.balance || 0) < Number(task.minBalance)) {
          return jsonResponse({ error: `Reach ${task.minBalance} coins first!` }, 400);
        }

        // Server-side Telegram channel/group membership verification if chatId is set
        if (task.chatId) {
          const isMember = await verifyTelegramChatMember(env.BOT_TOKEN, task.chatId, uid);
          if (!isMember) {
            return jsonResponse({ error: 'Please join the Telegram channel/group first!' }, 400);
          }
        }

        const reward = Number(task.reward || 0);
        user.balance = Number(user.balance || 0) + reward;
        user.totalEarned = Number(user.totalEarned || 0) + reward;
        user.userUpdatedAt = now;

        await Promise.all([
          fbPut(env, `users/${uid}`, user),
          fbPatch(env, `userTasks/${uid}`, { [taskId]: now }),
          logTransaction(env, uid, {
            type: 'task_reward',
            amount: reward,
            status: 'completed',
            createdAt: now
          })
        ]);

        return jsonResponse(await buildSnapshot(env, user, config, isAdmin));
      }

      if (path === '/api/withdraw') {
        const method = String(body.method || '').trim();
        const rawAccount = String(body.account || '').trim();
        const rawAmount = Number(body.amount || 0);
        const bdtRate = Number(config.usdToBdtRate || 110);
        const minUsd = Number(config.minWithdrawUsd || 2);
        const minBdt = Number(config.minWithdrawBdt || 220);
        const isMobileMoney = method === 'BKASH' || method === 'NAGAD' || method === 'ROCKET';
        const isBdtMethod = isMobileMoney || method === 'BANK';

        let account = rawAccount;
        if (isMobileMoney) {
          // Normalize Bangla/English mixed digits to 01XXXXXXXXX (11 digits)
          account = normalizeBdPhone(rawAccount);
          if (!isValidBdPhone(account)) {
            return jsonResponse({
              error: 'বিকাশ/নগদ/রকেট নম্বর অবশ্যই 01 দিয়ে শুরু হতে হবে এবং ১১ সংখ্যার হতে হবে!'
            }, 400);
          }
        } else if (!method || account.length < 4) {
          return jsonResponse({ error: 'সঠিক ব্যাংক বা ওয়ালেট অ্যাকাউন্ট তথ্য দিন' }, 400);
        }

        const usdRequested = isBdtMethod ? formatMoney2(rawAmount / bdtRate) : formatMoney2(rawAmount);
        const bdtRequested = isBdtMethod ? formatMoney2(rawAmount) : formatMoney2(rawAmount * bdtRate);

        if (isBdtMethod && rawAmount < minBdt) {
          return jsonResponse({ error: `সর্বনিম্ন উইথড্র ${minBdt.toFixed(2)} ৳ (বা $${minUsd.toFixed(2)} USD)` }, 400);
        }
        if (!isBdtMethod && rawAmount < minUsd) {
          return jsonResponse({ error: `Minimum withdrawal is $${minUsd.toFixed(2)} USD (or ${minBdt.toFixed(2)} ৳ BDT)` }, 400);
        }
        if (Number(user.usdBalance || 0) + 0.0001 < usdRequested) {
          return jsonResponse({ error: 'আপনার মেইন ব্যালেন্স পর্যাপ্ত নয়! আগে গোল্ড ➔ ডায়মন্ড ➔ ব্যালেন্স কনভার্ট করুন।' }, 400);
        }

        const withdrawalId = `wd_${now}_${uid}`;
        user.usdBalance = formatMoney2(Math.max(0, Number(user.usdBalance || 0) - usdRequested));
        user.userUpdatedAt = now;

        const withdrawalRecord = {
          id: withdrawalId,
          userId: uid,
          userPhone: uid,
          userName: user.firstName,
          method,
          account,
          amount: isBdtMethod ? bdtRequested : usdRequested,
          currency: isBdtMethod ? 'BDT' : 'USD',
          usdAmount: usdRequested,
          bdtAmount: bdtRequested,
          status: 'pending',
          createdAt: now
        };

        await Promise.all([
          fbPut(env, `users/${uid}`, user),
          fbPut(env, `withdrawals/${withdrawalId}`, withdrawalRecord),
          fbPut(env, `transactions/${uid}/${withdrawalId}`, {
            id: withdrawalId,
            type: 'withdrawal',
            method,
            account,
            amount: isBdtMethod ? bdtRequested : usdRequested,
            currency: isBdtMethod ? 'BDT' : 'USD',
            usdAmount: usdRequested,
            bdtAmount: bdtRequested,
            status: 'pending',
            createdAt: now
          })
        ]);

        return jsonResponse(await buildSnapshot(env, user, config, isAdmin));
      }

      return jsonResponse({ error: 'Unknown API endpoint' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
    }
  }
};

// ============================================================================
// HELPER FUNCTIONS: SNAPSHOT, TELEGRAM HMAC-SHA256, FIREBASE REST, WEBHOOK
// ============================================================================

async function buildSnapshot(env, user, config, isAdmin) {
  const uid = user.id;
  const [tasksData, completedTasks, referralsObj, txObj, suspendedAds] = await Promise.all([
    fbGet(env, 'tasks'),
    fbGet(env, `userTasks/${uid}`),
    fbGet(env, `referrals/${uid}`),
    fbGet(env, `transactions/${uid}`),
    fbGet(env, 'suspendedAds')
  ]);

  const referrals = referralsObj ? Object.values(referralsObj) : [];
  const transactions = txObj
    ? Object.values(txObj).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))
    : [];

  return {
    user: { ...user, isAdmin },
    config,
    tasks: Array.isArray(tasksData) ? tasksData : DEFAULT_TASKS,
    completedTasks: completedTasks || {},
    referrals,
    transactions,
    suspendedAds: suspendedAds || {}
  };
}

const BLOCKED_ADULT_PATTERNS = [
  'profitableratecpmnetwork',
  'chilltopless',
  'concealment.com',
  'whatsfuck',
  'do you like my body',
  'proxy browser',
  'topless',
  'porn',
  'xxx',
  'xvideos',
  'xnxx',
  'chaturbate',
  'stripchat',
  'camgirl',
  'livejasmin',
  'brazzers',
  'onlyfans',
  'nsfw',
  'erotic',
  'nude',
  'naked',
  'sexvideo',
  'sex-video',
  'adult-dating',
  'hookup',
  '18+',
  'phishing',
  'scam',
  'malware',
  'trojan',
  'hack-telegram',
  'free-iphone-spin',
  'infected-device',
  'virus-detected'
];

async function inspectAdUrlForAdultContent(adUrl) {
  try {
    const lowerInit = String(adUrl || '').toLowerCase();
    for (const pat of BLOCKED_ADULT_PATTERNS) {
      if (lowerInit.includes(pat)) {
        return { safe: false, finalUrl: adUrl, reason: `url_match:${pat}` };
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(adUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
      }
    });
    clearTimeout(timer);

    const finalUrl = String(res.url || adUrl);
    const lowerFinal = finalUrl.toLowerCase();
    for (const pat of BLOCKED_ADULT_PATTERNS) {
      if (lowerFinal.includes(pat)) {
        return { safe: false, finalUrl, reason: `redirect_match:${pat}` };
      }
    }

    const htmlSample = (await res.text()).slice(0, 16000).toLowerCase();
    for (const pat of BLOCKED_ADULT_PATTERNS) {
      if (htmlSample.includes(pat)) {
        return { safe: false, finalUrl, reason: `content_match:${pat}` };
      }
    }

    return { safe: true, finalUrl };
  } catch (_) {
    // If network timeout on third-party ad server, allow unless domain matched blocklist
    return { safe: true, finalUrl: adUrl };
  }
}

async function notifyAdminsViaTelegramBot(env, markdownText) {
  if (!env.BOT_TOKEN || !env.ADMIN_TELEGRAM_IDS) return;
  const adminList = String(env.ADMIN_TELEGRAM_IDS)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  await Promise.all(
    adminList.map((adminId) =>
      fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId,
          text: markdownText,
          parse_mode: 'Markdown'
        })
      }).catch(() => {})
    )
  );
}

async function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;

  params.delete('hash');
  const sortedKeys = Array.from(params.keys()).sort();
  const dataCheckString = sortedKeys.map((k) => `${k}=${params.get(k)}`).join('\n');

  const encoder = new TextEncoder();
  const secretKeyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const secretKeyBytes = await crypto.subtle.sign('HMAC', secretKeyMaterial, encoder.encode(botToken));

  const signingKey = await crypto.subtle.importKey(
    'raw',
    secretKeyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', signingKey, encoder.encode(dataCheckString));
  const calculatedHash = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (calculatedHash !== hash.toLowerCase()) {
    return null;
  }

  // Verify auth_date is not older than 24 hours
  const authDate = Number(params.get('auth_date') || 0);
  const nowSec = Math.floor(Date.now() / 1000);
  if (authDate > 0 && nowSec - authDate > 86400) {
    return null;
  }

  const userJson = params.get('user');
  return userJson ? JSON.parse(userJson) : null;
}

async function verifyTelegramChatMember(botToken, chatId, userId) {
  const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${encodeURIComponent(userId)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.ok || !data.result) return false;
  const status = data.result.status;
  return ['creator', 'administrator', 'member', 'restricted'].includes(status);
}

async function handleTelegramWebhook(update, env) {
  const message = update.message;
  if (!message || !message.chat) return;

  // Telegram contact sharing from WebApp.requestContact() arrives here.
  // Only bind the phone when Telegram itself supplies the contact and it belongs to the sender.
  if (message.contact) {
    const fromId = String(message.from && message.from.id || '');
    const contactUserId = String(message.contact.user_id || '');
    const phone = normalizeBdPhone(message.contact.phone_number || '');
    if (fromId && contactUserId && contactUserId === fromId && phone && isValidBdPhone(phone)) {
      await fbPut(env, `telegramToPhone/${fromId}`, phone);
      await fbPut(env, `verifiedPhones/${phone}`, { telegramId: fromId, verifiedAt: Date.now() });
    }
    return;
  }

  if (!message.text) return;
  const chatId = message.chat.id;
  const text = message.text.trim();

  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    const startParam = parts[1] ? `?tgWebAppStartParam=${encodeURIComponent(parts[1])}` : '';
    const appUrl = `${String(env.MINI_APP_URL || '').replace(/\/+$/, '')}${startParam}`;

    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '🐹 *Welcome to SM HAMSTAR BOT 247!*\n\nTap the golden Hamstar, claim daily streak rewards, complete tasks, and invite friends to earn!',
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🚀 Play SM HAMSTAR BOT 247',
                web_app: { url: appUrl }
              }
            ]
          ]
        }
      })
    });
  }
}

const DEFAULT_FIREBASE_DB_URL = 'https://sm-rabbit-247-default-rtdb.firebaseio.com';

async function fbRequest(env, method, path, body = null) {
  const baseUrl = String((env && env.FIREBASE_DB_URL) || DEFAULT_FIREBASE_DB_URL).replace(/\/+$/, '');
  const secret = env && env.FIREBASE_DB_SECRET ? String(env.FIREBASE_DB_SECRET).trim() : '';
  const url = secret
    ? `${baseUrl}/${path}.json?auth=${encodeURIComponent(secret)}`
    : `${baseUrl}/${path}.json`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== null) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Firebase error (${res.status}) on ${path}`);
  }
  return res.json();
}

function fbGet(env, path) { return fbRequest(env, 'GET', path); }
function fbPut(env, path, data) { return fbRequest(env, 'PUT', path, data); }
function fbPatch(env, path, data) { return fbRequest(env, 'PATCH', path, data); }

async function logTransaction(env, uid, txData) {
  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await fbPut(env, `transactions/${uid}/${txId}`, { id: txId, ...txData });
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}
